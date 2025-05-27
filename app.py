# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, redirect, url_for, send_file, flash
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta, date
import math
import holidays # Importa a biblioteca de feriados
import re # Importa regex para limpar CPF

app = Flask(__name__)
app.secret_key = os.urandom(24) # Necessário para usar flash messages
app.config["STATIC_FOLDER"] = "static"

# Caminho do arquivo Excel
DATA_FILE = "gerenciador_propostas.xlsx"
SHEET_NAMES = ["AGUARDANDO SALDO", "SALDOS RETORNADOS", "SALDOS NÃO RETORNADOS"]

# Colunas padrão - Garantir que todas as colunas existam
STANDARD_COLUMNS = [
    "DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP",
    "NUMERO_PROPOSTA", "CPF", "NOME_CLIENTE", "BANCO_PROPONENTE",
    "PROMOTORA", "ORGAO", "VALOR_PARCELA", "BANCO_ORIGEM_DIVIDA",
    "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
    "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO", "STATUS_PROPOSTA",
    "LINK_FORMALIZACAO"
]

# Lista padrão de Bancos Proponentes (mais completa)
DEFAULT_BANCOS_PROPONENTES = sorted([
    "BANCO BMG", "BANCO DAYCOVAL", "BANCO DIGIO", "BANCO ITAU", "BANCO PAN",
    "BANCO SAFRA", "BANCO HAPPY", "CAPITAL CONSIG", "CREFISA", "BANCO BRB",
    "C6 BANK", "BANCO BANRISUL", "AGIBANK", "ALFA", "BANCO BARI",
    "BANCO FACTA", "BANCO ITAU CONSIG", "BANCO PAULISTA", "BANCO ZEMA",
    "CAIXA FEDERAL", "FINANTO", "INBURSA", "BANCO MASTER", "BANCO PINE",
    "QI CONSIG", "SANTANDER"
])

# Lista padrão de Promotoras
DEFAULT_PROMOTORAS = sorted([
    "BEVICRED", "CONECT", "LEV", "MAIS ÁGIL", "CAPITAL 2"
])

# Lista padrão de Bancos Origem Dívida
DEFAULT_BANCOS_ORIGEM = sorted([
    "AGIBANK", "ALFA", "BANRISUL", "BANCO BARI", "BANCO BMG", "BANCO BRB",
    "BANCO BRB FINANCEIRA", "BANCO DIGIO", "BANCO FACTA", "BANCO ITAÚ",
    "BANCO ITAÚ CONSIG", "BANCO PAN", "BANCO PAULISTA", "BANCO SAFRA",
    "BANCO ZEMA", "CAIXA FEDERAL", "C6 BANK", "CREFISA", "DAYCOVAL",
    "FINANTO", "INBURSA", "BANCO MASTER", "BANCO PINE", "QI CONSIG",
    "SANTANDER"
])

# Inicializa os feriados brasileiros
br_holidays = holidays.BR()

def format_currency(value):
    """Formata número como moeda brasileira (R$ 1.000,00)."""
    try:
        if isinstance(value, str):
            value = value.replace("R$", "").replace(".", "").replace(",", ".").strip()
        if pd.isna(value):
            return ""
        value = float(value)
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return ""

def parse_currency(value):
    """Converte string de moeda brasileira para float."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            cleaned_value = value.replace("R$", "").replace(".", "").replace(",", ".").strip()
            return float(cleaned_value) if cleaned_value else None
        except ValueError:
            return None
    return None

def format_cpf(cpf_str):
    """Formata uma string de CPF (apenas números) para 000.000.000-00."""
    if not cpf_str or not isinstance(cpf_str, str):
        return ""
    cpf_numeric = re.sub(r"\D", "", cpf_str)
    if len(cpf_numeric) != 11:
        return cpf_str
    return f"{cpf_numeric[:3]}.{cpf_numeric[3:6]}.{cpf_numeric[6:9]}-{cpf_numeric[9:]}"

def clean_cpf(cpf_str):
    """Remove formatação de uma string de CPF, retornando apenas números."""
    if not cpf_str or not isinstance(cpf_str, str):
        return ""
    return re.sub(r"\D", "", cpf_str)

def load_data():
    """Carrega os dados das três abas do arquivo Excel."""
    dfs = {}
    try:
        if os.path.exists(DATA_FILE):
            all_sheets = pd.ExcelFile(DATA_FILE).sheet_names
            for sheet_name in SHEET_NAMES:
                if sheet_name in all_sheets:
                    try:
                        df = pd.read_excel(DATA_FILE, sheet_name=sheet_name, dtype={
                            "CPF": str,
                            "NUMERO_PROPOSTA": str,
                            "LINK_FORMALIZACAO": str
                        })
                        for col in STANDARD_COLUMNS:
                            if col not in df.columns:
                                df[col] = None
                        for date_col in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
                            if date_col in df.columns:
                                df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
                        if "NUMERO_PROPOSTA" in df.columns:
                             df["NUMERO_PROPOSTA"] = df["NUMERO_PROPOSTA"].astype(str).str.upper().str.strip()
                        if "CPF" in df.columns:
                             df["CPF"] = df["CPF"].astype(str).apply(clean_cpf)
                        dfs[sheet_name] = df
                    except Exception as e:
                        print(f"Erro ao carregar aba {sheet_name}: {e}")
                        dfs[sheet_name] = pd.DataFrame(columns=STANDARD_COLUMNS)
                else:
                    print(f"Aba {sheet_name} não encontrada. Criando DataFrame vazio.")
                    dfs[sheet_name] = pd.DataFrame(columns=STANDARD_COLUMNS)
        else:
            print(f"Arquivo {DATA_FILE} não encontrado. Criando DataFrames vazios.")
            for sheet_name in SHEET_NAMES:
                dfs[sheet_name] = pd.DataFrame(columns=STANDARD_COLUMNS)
            save_data(dfs)
    except Exception as e:
        print(f"Erro fatal ao carregar dados: {e}")
        for sheet_name in SHEET_NAMES:
            dfs[sheet_name] = pd.DataFrame(columns=STANDARD_COLUMNS)
    return dfs

def save_data(dfs):
    """Salva os DataFrames de volta no arquivo Excel."""
    try:
        # CORRIGIDO: Usando aspas simples para os parâmetros string
        with pd.ExcelWriter(DATA_FILE, engine='openpyxl', date_format='YYYY-MM-DD', datetime_format='YYYY-MM-DD') as writer:
            for sheet_name, df in dfs.items():
                if "NUMERO_PROPOSTA" in df.columns:
                    df["NUMERO_PROPOSTA"] = df["NUMERO_PROPOSTA"].astype(str).str.upper().str.strip()
                if "CPF" in df.columns:
                    df["CPF"] = df["CPF"].astype(str).apply(clean_cpf)

                df_copy = df.copy()
                for date_col in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
                     if date_col in df_copy.columns:
                         # CORRIGIDO: Usando aspas simples para o formato strftime
                         df_copy[date_col] = pd.to_datetime(df_copy[date_col]).dt.strftime('%Y-%m-%d').replace('NaT', None)

                df_copy.to_excel(writer, sheet_name=sheet_name, index=False)
        print(f"Dados salvos com sucesso em {DATA_FILE}")
        return True
    except Exception as e:
        print(f"Erro ao salvar dados: {e}")
        return False

def calculate_return_date(send_date_dt):
    """Calcula a data de retorno (5 dias úteis após a data de envio, considerando feriados BR)."""
    if pd.isna(send_date_dt):
        return None
    if isinstance(send_date_dt, str):
        try:
            # CORRIGIDO: Usando aspas simples para o formato strptime
            send_date_dt = datetime.strptime(send_date_dt, '%Y-%m-%d')
        except ValueError:
            return None

    current_date = send_date_dt.date() if isinstance(send_date_dt, datetime) else send_date_dt
    days_added = 0
    business_days_count = 0
    while business_days_count < 5:
        days_added += 1
        next_date = current_date + timedelta(days=days_added)
        if next_date.weekday() < 5 and next_date not in br_holidays:
            business_days_count += 1
    return next_date

def find_proposal(dfs, numero_proposta):
    """Encontra uma proposta em qualquer uma das abas pelo número da proposta."""
    numero_proposta_str = str(numero_proposta).upper().strip()
    for sheet_name, df in dfs.items():
        if "NUMERO_PROPOSTA" in df.columns and not df.empty:
            df["NUMERO_PROPOSTA"] = df["NUMERO_PROPOSTA"].astype(str).str.upper().str.strip()
            match = df[df["NUMERO_PROPOSTA"] == numero_proposta_str]
            if not match.empty:
                return sheet_name, match.index[0], match.iloc[0].to_dict()
    return None, None, None

# --- ROTAS DA APLICAÇÃO ---

@app.route('/')
def index():
    """Página inicial que exibe as propostas e filtros."""
    dfs = load_data()
    today_date = date.today()

    filter_nome = request.args.get('nome_cliente', '').upper().strip()
    filter_cpf_input = request.args.get('cpf', '').strip()
    filter_cpf_numeric = clean_cpf(filter_cpf_input)
    filter_banco = request.args.get('banco_proponente', '').upper().strip()
    filter_promotora = request.args.get('promotora', '').upper().strip()

    processed_dfs = {}
    non_empty_dfs = [df for df in dfs.values() if not df.empty]

    if non_empty_dfs:
        all_data_df = pd.concat(non_empty_dfs, ignore_index=True)
        bancos_existentes = all_data_df["BANCO_PROPONENTE"].astype(str).str.upper().dropna().unique()
        promotoras_existentes = all_data_df["PROMOTORA"].astype(str).str.upper().dropna().unique()
    else:
        bancos_existentes = []
        promotoras_existentes = []

    bancos_options = sorted(list(set(DEFAULT_BANCOS_PROPONENTES) | set(bancos_existentes)))
    promotoras_options = sorted(list(set(DEFAULT_PROMOTORAS) | set(promotoras_existentes)))
    bancos_origem_options = sorted(list(set(DEFAULT_BANCOS_ORIGEM)))

    for sheet_name, df_orig in dfs.items():
        df = df_orig.copy()
        if not df.empty:
            if filter_nome and "NOME_CLIENTE" in df.columns:
                df = df[df["NOME_CLIENTE"].astype(str).str.upper().str.contains(filter_nome, na=False)]
            if filter_cpf_numeric and "CPF" in df.columns:
                df = df[df["CPF"].astype(str).apply(clean_cpf) == filter_cpf_numeric]
            if filter_banco and "BANCO_PROPONENTE" in df.columns:
                df = df[df["BANCO_PROPONENTE"].astype(str).str.upper() == filter_banco]
            if filter_promotora and "PROMOTORA" in df.columns:
                df = df[df["PROMOTORA"].astype(str).str.upper() == filter_promotora]

            data_list = []
            if sheet_name == "AGUARDANDO SALDO" and "DATA_ENVIO_CIP" in df.columns:
                 df.sort_values(by="DATA_ENVIO_CIP", ascending=True, inplace=True, na_position="last")

            for idx, row in df.iterrows():
                item = row.to_dict()
                item["original_sheet"] = sheet_name
                item["original_index"] = idx

                for col in STANDARD_COLUMNS:
                    if col in item:
                        if col in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
                            # CORRIGIDO: Usando aspas simples para o formato strftime
                            item[col] = pd.to_datetime(item[col]).strftime('%d/%m/%Y') if pd.notna(item[col]) else ''
                        elif col in ["VALOR_PARCELA", "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
                                    "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO"]:
                            item[col] = format_currency(item[col])
                        elif col == "CPF":
                            item[col] = format_cpf(str(item[col])) if pd.notna(item[col]) else ''
                        else:
                             item[col] = str(item[col]).upper() if pd.notna(item[col]) else ''
                    else:
                        item[col] = ''

                item["destaque"] = False
                if sheet_name == "AGUARDANDO SALDO" and "DATA_RETORNO_PREVISTA" in row and pd.notna(row["DATA_RETORNO_PREVISTA"]):
                    try:
                        retorno_previsto_date = pd.to_datetime(row["DATA_RETORNO_PREVISTA"]).date()
                        if retorno_previsto_date <= today_date:
                             item["destaque"] = True
                    except:
                        pass
                data_list.append(item)
            processed_dfs[sheet_name] = data_list
        else:
             processed_dfs[sheet_name] = []

    status_options = [
        "SALDO OK", "CONTRATO LIQUIDADO", "CONTRATO NÃO ENCONTRADO",
        "DECURSO DE PRAZO", "RETENÇÃO DO CLIENTE", "SALDO DEVEDOR ALTO",
        "TAXA DE JUROS ACIMA", "SALDO NÃO QUITADO", "REDIGITAR",
        "E-MAIL INVALIDO", "IF ORIGINAL INCORRETA", "REGRA INTERNA PROMOTORA",
        "REINICIAR PARA AGUARDANDO SALDO"
    ]

    return render_template("index.html",
                           aguardando=processed_dfs.get("AGUARDANDO SALDO", []),
                           retornados=processed_dfs.get("SALDOS RETORNADOS", []),
                           nao_retornados=processed_dfs.get("SALDOS NÃO RETORNADOS", []),
                           status_options=status_options,
                           bancos_options=bancos_options,
                           promotoras_options=promotoras_options,
                           bancos_origem_options=bancos_origem_options,
                           filter_nome=request.args.get('nome_cliente', ''),
                           filter_cpf=filter_cpf_input,
                           filter_banco=request.args.get('banco_proponente', ''),
                           filter_promotora=request.args.get('promotora', ''))

@app.route('/add', methods=['POST'])
def add_proposal():
    """Adiciona uma nova proposta na aba 'AGUARDANDO SALDO'."""
    try:
        dfs = load_data()
        new_proposal = {}
        for col in STANDARD_COLUMNS:
            form_value = request.form.get(col, '').strip()
            if col == "CPF":
                new_proposal[col] = clean_cpf(form_value)
            elif col in ["VALOR_PARCELA", "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
                       "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO"]:
                 new_proposal[col] = parse_currency(form_value)
            elif col not in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
                new_proposal[col] = form_value.upper()
            else:
                 new_proposal[col] = form_value

        data_envio_str = request.form.get('DATA_ENVIO_CIP', '').strip()
        if data_envio_str:
            try:
                # CORRIGIDO: Usando aspas simples para o formato strptime
                data_envio_dt = datetime.strptime(data_envio_str, '%Y-%m-%d')
                new_proposal["DATA_ENVIO_CIP"] = data_envio_dt
                new_proposal["DATA_RETORNO_PREVISTA"] = calculate_return_date(data_envio_dt)
            except ValueError:
                flash(f"Formato inválido para DATA ENVIO CIP ({data_envio_str}). Use o formato AAAA-MM-DD.", 'error')
                return redirect(url_for('index'))
        else:
            flash('DATA ENVIO CIP é obrigatória.', 'error')
            return redirect(url_for('index'))

        if not new_proposal.get("CPF"):
             flash('CPF é obrigatório.', 'error')
             return redirect(url_for('index'))
        if not new_proposal.get("NUMERO_PROPOSTA"):
             flash('Nº Proposta é obrigatório.', 'error')
             return redirect(url_for('index'))

        num_prop = str(new_proposal["NUMERO_PROPOSTA"]).upper().strip()
        sheet, index, _ = find_proposal(dfs, num_prop)
        if sheet:
            flash(f"Proposta {num_prop} já existe na aba {sheet}.", 'error')
            return redirect(url_for('index'))

        df_new = pd.DataFrame([new_proposal])
        df_new = df_new.reindex(columns=STANDARD_COLUMNS)
        dfs["AGUARDANDO SALDO"] = pd.concat([dfs["AGUARDANDO SALDO"], df_new], ignore_index=True)

        if save_data(dfs):
            flash('Nova proposta adicionada com sucesso!', 'success')
        else:
            flash('Erro ao salvar a nova proposta.', 'error')

    except Exception as e:
        print(f"Erro ao adicionar proposta: {e}")
        flash(f"Erro inesperado ao adicionar proposta: {e}", 'error')

    return redirect(url_for('index'))

@app.route('/update/<string:numero_proposta>', methods=['POST'])
def update_status(numero_proposta):
    """Atualiza o status e dados de uma proposta, movendo entre abas se necessário."""
    try:
        dfs = load_data()
        original_sheet, original_index, proposal_data = find_proposal(dfs, numero_proposta)

        if not original_sheet:
            flash(f'Proposta {numero_proposta} não encontrada.', 'error')
            return redirect(url_for('index'))

        new_status = request.form.get('STATUS_PROPOSTA', '').strip().upper()
        saldo_retornado = parse_currency(request.form.get('SALDO_RETORNADO_CIP'))
        liquido_atualizado = parse_currency(request.form.get('VALOR_LIQUIDO_ATUALIZADO'))

        updated_proposal = proposal_data.copy()

        updated_proposal["STATUS_PROPOSTA"] = new_status
        if saldo_retornado is not None:
             updated_proposal["SALDO_RETORNADO_CIP"] = saldo_retornado
        if liquido_atualizado is not None:
             updated_proposal["VALOR_LIQUIDO_ATUALIZADO"] = liquido_atualizado

        if new_status and new_status != "REINICIAR PARA AGUARDANDO SALDO":
            updated_proposal["DATA_RETORNO_CIP"] = datetime.now()
        elif new_status != "REINICIAR PARA AGUARDANDO SALDO":
             updated_proposal["DATA_RETORNO_CIP"] = None

        target_sheet = None
        if new_status == "SALDO OK":
            target_sheet = "SALDOS RETORNADOS"
        elif new_status == "REINICIAR PARA AGUARDANDO SALDO":
            target_sheet = "AGUARDANDO SALDO"
            updated_proposal["DATA_ENVIO_CIP"] = datetime.now()
            updated_proposal["DATA_RETORNO_PREVISTA"] = calculate_return_date(updated_proposal["DATA_ENVIO_CIP"])
            updated_proposal["DATA_RETORNO_CIP"] = None
            updated_proposal["SALDO_RETORNADO_CIP"] = None
            updated_proposal["VALOR_LIQUIDO_ATUALIZADO"] = None
            updated_proposal["STATUS_PROPOSTA"] = ""
        elif new_status:
            target_sheet = "SALDOS NÃO RETORNADOS"
        else:
             target_sheet = original_sheet

        if target_sheet != original_sheet:
            dfs[original_sheet] = dfs[original_sheet].drop(original_index).reset_index(drop=True)
            new_row_df = pd.DataFrame([updated_proposal]).reindex(columns=STANDARD_COLUMNS)
            dfs[target_sheet] = pd.concat([dfs[target_sheet], new_row_df], ignore_index=True)
            flash(f'Proposta {numero_proposta} movida para {target_sheet}.', 'info')
        else:
            updated_series = pd.Series(updated_proposal)[STANDARD_COLUMNS]
            dfs[original_sheet].loc[original_index] = updated_series
            flash(f'Proposta {numero_proposta} atualizada em {original_sheet}.', 'info')

        if save_data(dfs):
            flash('Atualização salva com sucesso!', 'success')
        else:
            flash('Erro ao salvar a atualização da proposta.', 'error')

    except Exception as e:
        print(f"Erro ao atualizar proposta {numero_proposta}: {e}")
        flash(f"Erro inesperado ao atualizar proposta: {e}", 'error')

    return redirect(url_for('index'))

@app.route('/edit/<string:numero_proposta>', methods=['GET'])
def edit_form(numero_proposta):
    """Exibe formulário para editar uma proposta (busca em todas as abas)."""
    try:
        dfs = load_data()
        sheet_name, index, proposal = find_proposal(dfs, numero_proposta)

        if not sheet_name:
            flash(f'Proposta {numero_proposta} não encontrada para edição.', 'error')
            return redirect(url_for('index'))

        proposal_edit = proposal.copy()

        for date_field in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
            if date_field in proposal_edit and pd.notna(proposal_edit[date_field]):
                 try:
                     # CORRIGIDO: Usando aspas simples para o formato strftime
                     proposal_edit[date_field] = pd.to_datetime(proposal_edit[date_field]).strftime('%Y-%m-%d')
                 except:
                      proposal_edit[date_field] = ""
            else:
                 proposal_edit[date_field] = ""

        for money_field in ["VALOR_PARCELA", "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
                            "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO"]:
             if money_field in proposal_edit and pd.notna(proposal_edit[money_field]):
                 try:
                     proposal_edit[money_field] = f"{float(proposal_edit[money_field]):.2f}".replace('.', ',')
                 except:
                     proposal_edit[money_field] = ""
             else:
                 proposal_edit[money_field] = ""

        if "CPF" in proposal_edit:
            proposal_edit["CPF"] = format_cpf(proposal_edit["CPF"])

        proposal_edit["NUMERO_PROPOSTA_ID"] = numero_proposta
        proposal_edit["ORIGINAL_SHEET"] = sheet_name

        non_empty_dfs_edit = [df for df in dfs.values() if not df.empty]
        if non_empty_dfs_edit:
            all_data_df_edit = pd.concat(non_empty_dfs_edit, ignore_index=True)
            bancos_existentes_edit = all_data_df_edit["BANCO_PROPONENTE"].astype(str).str.upper().dropna().unique()
            promotoras_existentes_edit = all_data_df_edit["PROMOTORA"].astype(str).str.upper().dropna().unique()
        else:
            bancos_existentes_edit = []
            promotoras_existentes_edit = []

        bancos_options_edit = sorted(list(set(DEFAULT_BANCOS_PROPONENTES) | set(bancos_existentes_edit)))
        promotoras_options_edit = sorted(list(set(DEFAULT_PROMOTORAS) | set(promotoras_existentes_edit)))
        bancos_origem_options_edit = sorted(list(set(DEFAULT_BANCOS_ORIGEM)))

        return render_template("edit.html",
                               proposal=proposal_edit,
                               bancos_options=bancos_options_edit,
                               promotoras_options=promotoras_options_edit,
                               bancos_origem_options=bancos_origem_options_edit)

    except Exception as e:
        print(f"Erro ao carregar formulário de edição para {numero_proposta}: {e}")
        flash(f"Erro ao carregar edição: {e}", 'error')
        return redirect(url_for('index'))

@app.route('/edit/<string:numero_proposta>', methods=['POST'])
def edit_proposal(numero_proposta):
    """Salva as alterações de uma proposta editada (mantém na mesma aba)."""
    try:
        dfs = load_data()
        original_sheet, original_index, old_proposal_data = find_proposal(dfs, numero_proposta)

        if not original_sheet:
            flash(f'Proposta {numero_proposta} não encontrada para salvar alterações.', 'error')
            return redirect(url_for('index'))

        updated_proposal = {}
        numero_proposta_form = request.form.get('NUMERO_PROPOSTA', '').strip().upper()

        if numero_proposta_form != numero_proposta.upper():
            sheet_check, _, _ = find_proposal(dfs, numero_proposta_form)
            if sheet_check:
                flash(f'Erro: Já existe uma proposta com o número {numero_proposta_form}.', 'error')
                return redirect(url_for('edit_form', numero_proposta=numero_proposta))

        for col in STANDARD_COLUMNS:
            form_value = request.form.get(col, '').strip()
            if col == "CPF":
                updated_proposal[col] = clean_cpf(form_value)
            elif col in ["VALOR_PARCELA", "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
                       "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO"]:
                updated_proposal[col] = parse_currency(form_value)
            elif col in ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]:
                try:
                    updated_proposal[col] = pd.to_datetime(form_value) if form_value else None
                except ValueError:
                     updated_proposal[col] = None
            elif col == "NUMERO_PROPOSTA":
                 updated_proposal[col] = numero_proposta_form
            else:
                updated_proposal[col] = form_value.upper()

        updated_proposal["STATUS_PROPOSTA"] = old_proposal_data.get("STATUS_PROPOSTA")

        old_date_envio = pd.to_datetime(old_proposal_data.get("DATA_ENVIO_CIP"), errors="coerce")
        new_date_envio = updated_proposal.get("DATA_ENVIO_CIP")

        if pd.notna(new_date_envio) and new_date_envio != old_date_envio:
            updated_proposal["DATA_RETORNO_PREVISTA"] = calculate_return_date(new_date_envio)
        elif pd.isna(new_date_envio):
             updated_proposal["DATA_RETORNO_PREVISTA"] = None
        else:
            updated_proposal["DATA_RETORNO_PREVISTA"] = pd.to_datetime(old_proposal_data.get("DATA_RETORNO_PREVISTA"), errors="coerce")

        updated_series = pd.Series(updated_proposal)[STANDARD_COLUMNS]
        dfs[original_sheet].loc[original_index] = updated_series

        if save_data(dfs):
            flash(f'Proposta {numero_proposta_form} atualizada com sucesso em {original_sheet}!', 'success')
        else:
            flash('Erro ao salvar as alterações da proposta.', 'error')

    except Exception as e:
        print(f"Erro ao salvar edição da proposta {numero_proposta}: {e}")
        flash(f"Erro inesperado ao salvar edição: {e}", 'error')

    return redirect(url_for('index'))

@app.route('/delete/<string:numero_proposta>', methods=['POST'])
def delete_proposal(numero_proposta):
    """Exclui uma proposta de qualquer aba."""
    try:
        dfs = load_data()
        sheet_name, index, _ = find_proposal(dfs, numero_proposta)

        if not sheet_name:
            flash(f'Proposta {numero_proposta} não encontrada para exclusão.', 'error')
            return redirect(url_for('index'))

        dfs[sheet_name] = dfs[sheet_name].drop(index).reset_index(drop=True)

        if save_data(dfs):
            flash(f'Proposta {numero_proposta} excluída com sucesso da aba {sheet_name}!', 'success')
        else:
            flash('Erro ao salvar a exclusão da proposta.', 'error')

    except Exception as e:
        print(f"Erro ao excluir proposta {numero_proposta}: {e}")
        flash(f"Erro inesperado ao excluir proposta: {e}", 'error')

    return redirect(url_for('index'))

@app.route('/logo.png')
def serve_logo():
    logo_path_static = os.path.join(app.config["STATIC_FOLDER"], "logo.png")
    logo_path_root = "logo.png"
    if os.path.exists(logo_path_static):
        return send_file(logo_path_static, mimetype='image/png')
    elif os.path.exists(logo_path_root):
        return send_file(logo_path_root, mimetype='image/png')
    else:
        return '', 404

if __name__ == "__main__":
    load_data()
    print("\nGerenciador de Propostas INSS iniciado!")
    print(f"Arquivo de dados: {os.path.abspath(DATA_FILE)}")
    print("Acesse a aplicação em: http://127.0.0.1:5000")
    print("Pressione CTRL+C para encerrar\n")
    app.run(host='0.0.0.0', port=5000, debug=True)

