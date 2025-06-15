# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, redirect, url_for, send_file, flash
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta, date
import math
import holidays
import re

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config["STATIC_FOLDER"] = "static"

# Caminho do arquivo Excel
DATA_FILE = "gerenciador_propostas.xlsx"

# Nomes das Planilhas
SHEET_AGUARDANDO = "AGUARDANDO SALDO"
SHEET_RETORNADOS = "SALDOS RETORNADOS"
SHEET_NAO_RETORNADOS = "SALDOS NÃO RETORNADOS"
SHEET_NOVOS_REFIN = "CONTRATOS NOVOS E REFIN"
SHEET_NAMES = [SHEET_NOVOS_REFIN, SHEET_AGUARDANDO, SHEET_RETORNADOS, SHEET_NAO_RETORNADOS]

# Colunas padrão para Portabilidade
STANDARD_COLUMNS_PORT = [
    "DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP",
    "NUMERO_PROPOSTA", "CPF", "NOME_CLIENTE", "TIPO_OPERACAO", "BANCO_PROPONENTE",
    "PROMOTORA", "ORGAO", "VALOR_PARCELA", "BANCO_ORIGEM_DIVIDA",
    "SALDO_DEVEDOR_PREVISTO", "VALOR_LIQUIDO_PREVISTO",
    "SALDO_RETORNADO_CIP", "VALOR_LIQUIDO_ATUALIZADO", "STATUS_PROPOSTA",
    "LINK_FORMALIZACAO", "OBSERVACOES"
]

# Colunas para Novos Contratos e Refinanciamento
STANDARD_COLUMNS_NOVOS_REFIN = [
    "Data", "DATA_ENVIO_CIP", "Nº Proposta", "CPF", "NOME_CLIENTE",
    "TIPO_OPERACAO", "Promotora", "Banco", "Valor Parcela", "Vl. contrato",
    "LINK_FORMALIZACAO", "OBSERVACOES", "Status"
]

# Lista de Bancos Proponentes
DEFAULT_BANCOS_PROPONENTES = sorted([
    "BANCO BMG", "BANCO DAYCOVAL", "BANCO DIGIO", "BANCO ITAU", "BANCO PAN",
    "BANCO SAFRA", "BANCO HAPPY", "CAPITAL CONSIG", "CREFISA", "BANCO BRB",
    "C6 BANK", "BANCO BANRISUL", "AGIBANK", "ALFA", "BANCO BARI",
    "BANCO FACTA", "BANCO ITAU CONSIG", "BANCO PAULISTA", "BANCO ZEMA",
    "CAIXA FEDERAL", "FINANTO", "INBURSA", "BANCO MASTER", "BANCO PINE",
    "QI CONSIG", "SANTANDER"
])

# Lista de Promotoras
DEFAULT_PROMOTORAS = sorted([
    "BEVICRED", "CONECT", "LEV", "MAIS ÁGIL", "CAPITAL 2"
])

# Lista de Bancos Origem Dívida
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
    """Formata número como moeda brasileira."""
    try:
        if isinstance(value, str):
            value = value.replace("R$", "").replace(".", "").replace(",", ".").strip()
        if pd.isna(value) or value == "":
            return ""
        value = float(value)
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return ""

def parse_currency(value):
    """Converte string de moeda para float."""
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
    """Formata CPF para 000.000.000-00."""
    if not cpf_str or not isinstance(cpf_str, str):
        return ""
    cpf_numeric = re.sub(r"\D", "", cpf_str)
    if len(cpf_numeric) != 11:
        return cpf_str
    return f"{cpf_numeric[:3]}.{cpf_numeric[3:6]}.{cpf_numeric[6:9]}-{cpf_numeric[9:]}"

def clean_cpf(cpf_str):
    """Remove formatação do CPF."""
    if not cpf_str or not isinstance(cpf_str, str):
        return ""
    return re.sub(r"\D", "", cpf_str)

def get_sheet_columns(sheet_name):
    """Retorna as colunas padrão para a planilha."""
    if sheet_name == SHEET_NOVOS_REFIN:
        return STANDARD_COLUMNS_NOVOS_REFIN
    return STANDARD_COLUMNS_PORT

def load_data():
    """Carrega os dados de todas as abas."""
    dfs = {}
    try:
        if os.path.exists(DATA_FILE):
            excel_file = pd.ExcelFile(DATA_FILE)
            all_sheets_in_file = excel_file.sheet_names

            for sheet_name in SHEET_NAMES:
                standard_columns = get_sheet_columns(sheet_name)
                dtype_spec = {
                    "CPF": str,
                    "Nº Proposta": str,
                    "NUMERO_PROPOSTA": str,
                    "LINK_FORMALIZACAO": str,
                    "OBSERVACOES": str
                }
                valid_dtype = {k: v for k, v in dtype_spec.items() if k in standard_columns}

                if sheet_name in all_sheets_in_file:
                    try:
                        df = excel_file.parse(sheet_name, dtype=valid_dtype)
                        for col in standard_columns:
                            if col not in df.columns:
                                df[col] = None

                        date_cols_port = ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]
                        date_cols_novos = ["Data", "DATA_ENVIO_CIP"]
                        date_cols_to_convert = date_cols_novos if sheet_name == SHEET_NOVOS_REFIN else date_cols_port

                        for date_col in date_cols_to_convert:
                            if date_col in df.columns:
                                df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

                        if "NUMERO_PROPOSTA" in df.columns:
                            df["NUMERO_PROPOSTA"] = df["NUMERO_PROPOSTA"].astype(str).str.upper().str.strip().replace(".0", "", regex=False)
                        if "Nº Proposta" in df.columns:
                            df["Nº Proposta"] = df["Nº Proposta"].astype(str).str.upper().str.strip().replace(".0", "", regex=False)
                        if "CPF" in df.columns:
                            df["CPF"] = df["CPF"].astype(str).apply(clean_cpf)

                        dfs[sheet_name] = df[standard_columns]

                    except Exception as e:
                        print(f"Erro ao carregar aba {sheet_name}: {e}")
                        dfs[sheet_name] = pd.DataFrame(columns=standard_columns)
                else:
                    print(f"Aba {sheet_name} não encontrada.")
                    dfs[sheet_name] = pd.DataFrame(columns=standard_columns)
            excel_file.close()
        else:
            print(f"Arquivo {DATA_FILE} não encontrado.")
            for sheet_name in SHEET_NAMES:
                dfs[sheet_name] = pd.DataFrame(columns=get_sheet_columns(sheet_name))
            save_data(dfs)

    except Exception as e:
        print(f"Erro fatal ao carregar dados: {e}")
        for sheet_name in SHEET_NAMES:
            dfs[sheet_name] = pd.DataFrame(columns=get_sheet_columns(sheet_name))

    return dfs

def save_data(dfs):
    """Salva os DataFrames no arquivo Excel."""
    try:
        temp_file = DATA_FILE + '.temp'
        with pd.ExcelWriter(temp_file, engine='openpyxl', date_format='YYYY-MM-DD', datetime_format='YYYY-MM-DD') as writer:
            for sheet_name, df in dfs.items():
                if df is None:
                    continue

                df_copy = df.copy()
                standard_columns = get_sheet_columns(sheet_name)
                df_copy = df_copy.reindex(columns=standard_columns)

                if "NUMERO_PROPOSTA" in df_copy.columns:
                    df_copy["NUMERO_PROPOSTA"] = df_copy["NUMERO_PROPOSTA"].astype(str).str.upper().str.strip().replace(".0", "", regex=False)
                if "Nº Proposta" in df_copy.columns:
                    df_copy["Nº Proposta"] = df_copy["Nº Proposta"].astype(str).str.upper().str.strip().replace(".0", "", regex=False)
                if "CPF" in df_copy.columns:
                    df_copy["CPF"] = df_copy["CPF"].astype(str).apply(clean_cpf)

                date_cols_port = ["DATA_ENVIO_CIP", "DATA_RETORNO_PREVISTA", "DATA_RETORNO_CIP"]
                date_cols_novos = ["Data", "DATA_ENVIO_CIP"]
                date_cols_to_format = date_cols_novos if sheet_name == SHEET_NOVOS_REFIN else date_cols_port

                for date_col in date_cols_to_format:
                    if date_col in df_copy.columns:
                        df_copy[date_col] = pd.to_datetime(df_copy[date_col], errors='coerce').dt.strftime('%Y-%m-%d').replace('NaT', None)
                
                df_copy.to_excel(writer, sheet_name=sheet_name, index=False)

        if os.path.exists(DATA_FILE):
            os.remove(DATA_FILE)
        os.rename(temp_file, DATA_FILE)
        
        print(f"Dados salvos com sucesso em {DATA_FILE}")
        return True
    except PermissionError as e:
        flash("Erro: O arquivo Excel está aberto ou sem permissão de escrita.", "error")
        return False
    except Exception as e:
        print(f"Erro ao salvar dados: {e}")
        flash(f"Erro ao salvar dados no arquivo Excel: {e}", "error")
        return False

def calculate_return_date(send_date_dt):
    """Calcula a data de retorno (5 dias úteis após a data de envio)."""
    if pd.isna(send_date_dt):
        return None

    if isinstance(send_date_dt, str):
        try:
            dt_object = datetime.strptime(send_date_dt, "%Y-%m-%d")
        except ValueError:
            try:
                dt_object = pd.to_datetime(send_date_dt).to_pydatetime()
            except Exception as e:
                print(f"Warning: Could not parse date string: {send_date_dt}. Error: {e}")
                return None
    elif isinstance(send_date_dt, datetime):
        dt_object = send_date_dt
    elif isinstance(send_date_dt, date):
        dt_object = datetime.combine(send_date_dt, datetime.min.time())
    else:
        try:
            dt_object = pd.to_datetime(send_date_dt).to_pydatetime()
        except Exception as e:
            print(f"Warning: Could not convert send_date_dt to datetime: {send_date_dt} (type: {type(send_date_dt)}). Error: {e}")
            return None

    current_date = dt_object.date()
    days_added = 0
    business_days_count = 0
    while business_days_count < 5:
        days_added += 1
        next_date = current_date + timedelta(days=days_added)
        if next_date.weekday() < 5 and next_date not in br_holidays:
            business_days_count += 1
    return next_date

def find_proposal(dfs, numero_proposta):
    """Encontra uma proposta em qualquer aba pelo número."""
    numero_proposta_str = str(numero_proposta).upper().strip().replace(".0", "", regex=False)
    if not numero_proposta_str:
        return None, None, None

    for sheet_name, df in dfs.items():
        col_num_proposta = "Nº Proposta" if sheet_name == SHEET_NOVOS_REFIN else "NUMERO_PROPOSTA"
        if col_num_proposta in df.columns and df is not None and not df.empty:
            df[col_num_proposta] = df[col_num_proposta].astype(str).str.upper().str.strip().replace(".0", "", regex=False)
            match = df[df[col_num_proposta] == numero_proposta_str]
            if not match.empty:
                return sheet_name, match.index[0], match.iloc[0].to_dict()
    return None, None, None

@app.route('/')
def index():
    """Página inicial com as propostas e filtros."""
    dfs = load_data()
    today_date = date.today()

    filter_nome = request.args.get('filter_nome_cliente', '').upper().strip()
    filter_cpf_input = request.args.get('filter_cpf', '').strip()
    filter_cpf_numeric = clean_cpf(filter_cpf_input)
    filter_banco = request.args.get('filter_banco_proponente', '').upper().strip()
    filter_promotora = request.args.get('filter_promotora', '').upper().strip()

    processed_dfs = {}
    non_empty_dfs = [df for df in dfs.values() if df is not None and not df.empty]

    bancos_existentes = set()
    promotoras_existentes = set()
    if non_empty_dfs:
        all_data_df = pd.concat(non_empty_dfs, ignore_index=True)
        if "BANCO_PROPONENTE" in all_data_df.columns:
            bancos_existentes.update(all_data_df["BANCO_PROPONENTE"].astype(str).str.upper().dropna().unique())
        if "Banco" in all_data_df.columns:
            bancos_existentes.update(all_data_df["Banco"].astype(str).str.upper().dropna().unique())
        if "PROMOTORA" in all_data_df.columns:
            promotoras_existentes.update(all_data_df["PROMOTORA"].astype(str).str.upper().dropna().unique())
        if "Promotora" in all_data_df.columns:
            promotoras_existentes.update(all_data_df["Promotora"].astype(str).str.upper().dropna().unique())

    bancos_options = sorted(list(set(DEFAULT_BANCOS_PROPONENTES) | bancos_existentes))
    promotoras_options = sorted(list(set(DEFAULT_PROMOTORAS) | promotoras_existentes))
    bancos_origem_options = sorted(list(set(DEFAULT_BANCOS_ORIGEM)))

    for sheet_name, df_orig in dfs.items():
        if df_orig is None or df_orig.empty:
            processed_dfs[sheet_name] = []
            continue

        df = df_orig.copy()
        standard_columns = get_sheet_columns(sheet_name)
        col_nome = "NOME_CLIENTE"
        col_cpf = "CPF"
        col_banco = "Banco" if sheet_name == SHEET_NOVOS_REFIN else "BANCO_PROPONENTE"
        col_promotora = "Promotora" if sheet_name == SHEET_NOVOS_REFIN else "PROMOTORA"

        if filter_nome and col_nome in df.columns:
            df = df[df[col_nome].astype(str).str.upper().str.contains(filter_nome, na=False)]
        if filter_cpf_numeric and col_cpf in df.columns:
            df = df[df[col_cpf].astype(str).apply(clean_cpf) == filter_cpf_numeric]
        if filter_banco and col_banco in df.columns:
            df = df[df[col_banco].astype(str).str.upper() == filter_banco]
        if filter_promotora and col_promotora in df.columns:
            df = df[df[col_promotora].astype(str).str.upper() == filter_promotora]

        data_list = []
        if sheet_name == SHEET_AGUARDANDO and "DATA_ENVIO_CIP" in df.columns:
            df.sort_values(by="DATA_ENVIO_CIP", ascending=True, inplace=True, na_position="last")
        elif sheet_name == SHEET_NOVOS_REFIN and "Data" in df.columns:
            df.sort_values(by="Data", ascending=False, inplace=True, na_position="last")
        elif sheet_name == SHEET_RETORNADOS and "DATA_RETORNO_CIP" in df.columns:
            df.sort_values(by="DATA_RETORNO_CIP", ascending=False, inplace=True, na_position="last")
        elif sheet_name == SHEET_NAO_RETORNADOS and "DATA_RETORNO_PREVISTA" in df.columns:
            df.sort_values(by="DATA_RETORNO_PREVISTA", ascending=True, inplace=True, na_position="last")

        for idx, row in df.iterrows():
            item = row.to_dict()
            item["original_sheet"] = sheet_name
            item["original_index"] = idx
            item["numero_proposta_id"] = item.get("Nº Proposta") or item.get("NUMERO_PROPOSTA")

            for col in standard_columns:
                if "DATA" in col or col == "Data":
                    item[col] = pd.to_datetime(item[col]).strftime('%d/%m/%Y') if pd.notna(item[col]) else ''
                elif "VALOR" in col or "SALDO" in col or "Vl." in col:
                    item[col] = format_currency(item[col])
                elif col == "CPF":
                    item[col] = format_cpf(item[col])

            item["row_class"] = ""
            if sheet_name == SHEET_AGUARDANDO and pd.notna(row.get("DATA_RETORNO_PREVISTA")):
                data_retorno_prevista = pd.to_datetime(row["DATA_RETORNO_PREVISTA"]).date()
                if data_retorno_prevista < today_date:
                    item["row_class"] = "table-danger"
                elif data_retorno_prevista == today_date:
                    item["row_class"] = "table-warning"

            data_list.append(item)
        processed_dfs[sheet_name] = data_list

    return render_template('index.html',
                         dfs=processed_dfs,
                         sheet_names=SHEET_NAMES,
                         bancos_options=bancos_options,
                         promotoras_options=promotoras_options,
                         bancos_origem_options=bancos_origem_options,
                         filter_nome_cliente=filter_nome,
                         filter_cpf=filter_cpf_input,
                         filter_banco_proponente=filter_banco,
                         filter_promotora=filter_promotora)

@app.route('/add', methods=['POST'])
def add_proposal():
    """Adiciona uma nova proposta."""
    dfs = load_data()
    form_data = request.form.to_dict()
    
    tipo_operacao = form_data.get('TIPO_OPERACAO')
    if not tipo_operacao:
        flash("Erro: Tipo de operação não especificado.", "error")
        return redirect(url_for('index'))

    # Limpa e padroniza CPF
    if 'CPF' in form_data:
        form_data['CPF'] = clean_cpf(form_data['CPF'])

    # Padroniza campos de texto para maiúsculas
    for key, value in form_data.items():
        if isinstance(value, str) and key not in ['CPF', 'LINK_FORMALIZACAO', 'OBSERVACOES']:
            try:
                float(value.replace("R$", "").replace(".", "").replace(",", ".").strip())
            except ValueError:
                try:
                    datetime.strptime(value, '%Y-%m-%d')
                except ValueError:
                    form_data[key] = value.upper().strip()

    if tipo_operacao == 'Portabilidade':
        target_sheet = SHEET_AGUARDANDO
        new_proposal = {}
        standard_columns = get_sheet_columns(target_sheet)

        for col in standard_columns:
            value = form_data.get(col)
            
            if "DATA" in col:
                new_proposal[col] = pd.to_datetime(value, errors='coerce')
            elif "VALOR" in col or "SALDO" in col:
                new_proposal[col] = parse_currency(value)
            else:
                new_proposal[col] = value

        # Processa o campo DATA_ENVIO
        data_envio = form_data.get('DATA_ENVIO_CIP')
        if data_envio:
            new_proposal["DATA_ENVIO_CIP"] = pd.to_datetime(data_envio, errors='coerce')

        # Calcula data de retorno prevista
        if pd.notna(new_proposal.get("DATA_ENVIO_CIP")):
            new_proposal["DATA_RETORNO_PREVISTA"] = calculate_return_date(new_proposal["DATA_ENVIO_CIP"])
        else:
            new_proposal["DATA_RETORNO_PREVISTA"] = None

        # Define valores padrão
        new_proposal["TIPO_OPERACAO"] = tipo_operacao
        new_proposal["STATUS_PROPOSTA"] = "AGUARDANDO SALDO"
        new_proposal["DATA_RETORNO_CIP"] = None
        new_proposal["SALDO_RETORNADO_CIP"] = None
        new_proposal["VALOR_LIQUIDO_ATUALIZADO"] = None

    elif tipo_operacao in ['Novo', 'Refinanciamento']:
        target_sheet = SHEET_NOVOS_REFIN
        new_proposal = {}
        standard_columns = get_sheet_columns(target_sheet)

        # Mapeamento de campos
        field_mapping = {
            "Data": date.today(),
            "DATA_ENVIO_CIP": form_data.get("DATA_ENVIO_CIP"),
            "Nº Proposta": form_data.get("NUMERO_PROPOSTA"),
            "CPF": form_data.get("CPF"),
            "NOME_CLIENTE": form_data.get("NOME_CLIENTE"),
            "TIPO_OPERACAO": tipo_operacao,
            "Promotora": form_data.get("PROMOTORA"),
            "Banco": form_data.get("BANCO"),
            "Valor Parcela": form_data.get("VALOR_PARCELA"),
            "Vl. contrato": form_data.get("VALOR_CONTRATO"),
            "LINK_FORMALIZACAO": form_data.get("LINK_FORMALIZACAO"),
            "OBSERVACOES": form_data.get("OBSERVACOES"),
            "Status": "Pendente"
        }

        for col_sheet, value in field_mapping.items():
            if col_sheet in ["Data", "DATA_ENVIO_CIP"]:
                new_proposal[col_sheet] = pd.to_datetime(value, errors='coerce')
            elif col_sheet in ["Valor Parcela", "Vl. contrato"]:
                new_proposal[col_sheet] = parse_currency(value)
            else:
                new_proposal[col_sheet] = value

    else:
        flash(f"Tipo de operação inválido: {tipo_operacao}", "error")
        return redirect(url_for('index'))

    # Verifica se a proposta já existe
    _, _, existing = find_proposal(dfs, new_proposal.get("NUMERO_PROPOSTA") or new_proposal.get("Nº Proposta"))
    if existing:
        flash("Erro: Já existe uma proposta com este número.", "error")
        return redirect(url_for('index'))

    # Adiciona a nova proposta
    df_target = dfs[target_sheet]
    if df_target is None:
        df_target = pd.DataFrame(columns=get_sheet_columns(target_sheet))

    # Garante que todas as colunas necessárias existam
    for col in get_sheet_columns(target_sheet):
        if col not in new_proposal:
            new_proposal[col] = None

    new_row_df = pd.DataFrame([new_proposal], columns=get_sheet_columns(target_sheet))
    dfs[target_sheet] = pd.concat([df_target, new_row_df], ignore_index=True)

    if save_data(dfs):
        flash("Proposta adicionada com sucesso!", "success")
    else:
        flash("Erro ao salvar a proposta.", "error")

    return redirect(url_for('index'))

@app.route('/update_status/<sheet_name>/<int:index>', methods=['POST'])
def update_status(sheet_name, index):
    """Atualiza o status de uma proposta."""
    dfs = load_data()
    action = request.form.get('action')
    saldo_retornado_str = request.form.get('MODAL_SALDO_RETORNADO_CIP')
    valor_liquido_str = request.form.get('MODAL_VALOR_LIQUIDO_ATUALIZADO')
    observacoes = request.form.get('OBSERVACOES_MODAL', '').strip()
    new_status = request.form.get('NEW_STATUS_PROPOSTA_MODAL')

    if sheet_name not in dfs or dfs[sheet_name] is None or index >= len(dfs[sheet_name]):
        flash("Proposta não encontrada.", "error")
        return redirect(url_for('index'))

    proposal_series = dfs[sheet_name].iloc[index].copy()

    # Atualiza observações
    if observacoes:
        proposal_series["OBSERVACOES"] = observacoes

    target_sheet = None

    if action == 'retornado':
        target_sheet = SHEET_RETORNADOS
        proposal_series["STATUS_PROPOSTA"] = new_status if new_status else "SALDO RETORNADO"
        proposal_series["DATA_RETORNO_CIP"] = date.today()
        proposal_series["SALDO_RETORNADO_CIP"] = parse_currency(saldo_retornado_str)
        proposal_series["VALOR_LIQUIDO_ATUALIZADO"] = parse_currency(valor_liquido_str)
    elif action == 'nao_retornado':
        target_sheet = SHEET_NAO_RETORNADOS
        proposal_series["STATUS_PROPOSTA"] = new_status if new_status else "SALDO NÃO RETORNADO"
        proposal_series["DATA_RETORNO_CIP"] = date.today()
        proposal_series["SALDO_RETORNADO_CIP"] = None
        proposal_series["VALOR_LIQUIDO_ATUALIZADO"] = None
    elif action == 'reanalise':
        target_sheet = SHEET_AGUARDANDO
        proposal_series["STATUS_PROPOSTA"] = "AGUARDANDO SALDO"
        proposal_series["DATA_ENVIO_CIP"] = date.today()
        proposal_series["DATA_RETORNO_PREVISTA"] = calculate_return_date(date.today())
        proposal_series["DATA_RETORNO_CIP"] = None
        proposal_series["SALDO_RETORNADO_CIP"] = None
        proposal_series["VALOR_LIQUIDO_ATUALIZADO"] = None
    elif action == 'delete_proposal':
        dfs[sheet_name] = dfs[sheet_name].drop(index).reset_index(drop=True)
        if save_data(dfs):
            flash("Proposta excluída com sucesso!", "success")
        else:
            flash("Erro ao excluir a proposta.", "error")
        return redirect(url_for('index'))
    elif action == 'update_status_only':
        if new_status:
            proposal_series["STATUS_PROPOSTA"] = new_status
            if save_data(dfs):
                flash("Status atualizado com sucesso!", "success")
            else:
                flash("Erro ao atualizar o status.", "error")
            return redirect(url_for('index'))
        else:
            flash("Nenhum status selecionado.", "error")
            return redirect(url_for('index'))
    else:
        flash("Ação inválida.", "error")
        return redirect(url_for('index'))

    if target_sheet:
        # Remove da planilha original
        dfs[sheet_name] = dfs[sheet_name].drop(index).reset_index(drop=True)

        # Adiciona na planilha destino
        df_target = dfs[target_sheet]
        if df_target is None:
            df_target = pd.DataFrame(columns=get_sheet_columns(target_sheet))

        proposal_df = pd.DataFrame([proposal_series])
        proposal_df = proposal_df.reindex(columns=get_sheet_columns(target_sheet))

        dfs[target_sheet] = pd.concat([df_target, proposal_df], ignore_index=True)

    if save_data(dfs):
        flash(f"Proposta movida para {target_sheet}!", "success")
    else:
        flash("Erro ao atualizar o status.", "error")

    return redirect(url_for('index'))

@app.route('/edit/<numero_proposta>', methods=['GET', 'POST'])
def edit_proposal(numero_proposta):
    """Exibe ou atualiza o formulário de edição."""
    dfs = load_data()
    sheet_name, index, proposal_dict = find_proposal(dfs, numero_proposta)

    if proposal_dict is None:
        flash("Proposta não encontrada.", "error")
        return redirect(url_for('index'))

    is_portabilidade = sheet_name != SHEET_NOVOS_REFIN

    if request.method == 'POST':
        form_data = request.form.to_dict()
        updated_proposal = proposal_dict.copy()
        standard_columns = get_sheet_columns(sheet_name)

        # Limpa CPF antes de salvar
        if 'CPF' in form_data:
            form_data['CPF'] = clean_cpf(form_data['CPF'])

        for col in standard_columns:
            if col in form_data:
                value = form_data[col]
                # Padroniza texto para maiúsculas
                if isinstance(value, str) and col not in ['CPF', 'LINK_FORMALIZACAO', 'OBSERVACOES']:
                    try:
                        float(value.replace("R$", "").replace(".", "").replace(",", ".").strip())
                    except ValueError:
                        try:
                            datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            value = value.upper().strip()

                # Converte tipos
                if "DATA" in col or col == "Data":
                    updated_proposal[col] = pd.to_datetime(value, errors='coerce')
                elif "VALOR" in col or "SALDO" in col or "Vl." in col:
                    updated_proposal[col] = parse_currency(value)
                else:
                    updated_proposal[col] = value

        # Recalcula data de retorno prevista se necessário
        if is_portabilidade and 'DATA_ENVIO_CIP' in updated_proposal:
            original_date = pd.to_datetime(proposal_dict.get('DATA_ENVIO_CIP'), errors='coerce')
            new_date = pd.to_datetime(updated_proposal['DATA_ENVIO_CIP'], errors='coerce')
            if new_date != original_date and pd.notna(new_date):
                updated_proposal['DATA_RETORNO_PREVISTA'] = calculate_return_date(new_date)
            elif pd.isna(new_date):
                updated_proposal['DATA_RETORNO_PREVISTA'] = None

        # Atualiza o DataFrame
        for col, value in updated_proposal.items():
            if col in dfs[sheet_name].columns:
                dfs[sheet_name].loc[index, col] = value

        if save_data(dfs):
            flash("Proposta atualizada com sucesso!", "success")
            return redirect(url_for('index'))
        else:
            flash("Erro ao salvar as alterações.", "error")

    # Prepara dados para exibição
    proposal_display = proposal_dict.copy()
    for col, value in proposal_display.items():
        if isinstance(value, (datetime, date)) or pd.api.types.is_datetime64_any_dtype(value):
            proposal_display[col] = pd.to_datetime(value).strftime('%Y-%m-%d') if pd.notna(value) else ''
        elif "VALOR" in col or "SALDO" in col or "Vl." in col:
            proposal_display[col] = format_currency(value)
        elif col == "CPF":
            proposal_display[col] = format_cpf(value)

    # Busca opções para os dropdowns
    all_dfs = load_data()
    non_empty_dfs = [df for df in all_dfs.values() if df is not None and not df.empty]
    bancos_existentes = set()
    promotoras_existentes = set()
    bancos_origem_existentes = set()
    if non_empty_dfs:
        all_data_df = pd.concat(non_empty_dfs, ignore_index=True)
        if "BANCO_PROPONENTE" in all_data_df.columns:
            bancos_existentes.update(all_data_df["BANCO_PROPONENTE"].astype(str).str.upper().dropna().unique())
        if "Banco" in all_data_df.columns:
            bancos_existentes.update(all_data_df["Banco"].astype(str).str.upper().dropna().unique())
        if "PROMOTORA" in all_data_df.columns:
            promotoras_existentes.update(all_data_df["PROMOTORA"].astype(str).str.upper().dropna().unique())
        if "Promotora" in all_data_df.columns:
            promotoras_existentes.update(all_data_df["Promotora"].astype(str).str.upper().dropna().unique())
        if "BANCO_ORIGEM_DIVIDA" in all_data_df.columns:
            bancos_origem_existentes.update(all_data_df["BANCO_ORIGEM_DIVIDA"].astype(str).str.upper().dropna().unique())

    bancos_options = sorted(list(set(DEFAULT_BANCOS_PROPONENTES) | bancos_existentes))
    promotoras_options = sorted(list(set(DEFAULT_PROMOTORAS) | promotoras_existentes))
    bancos_origem_options = sorted(list(set(DEFAULT_BANCOS_ORIGEM) | bancos_origem_existentes))

    return render_template('edit.html',
                         proposal=proposal_display,
                         numero_proposta_original=numero_proposta,
                         sheet_name_original=sheet_name,
                         is_portabilidade=is_portabilidade,
                         bancos_options=bancos_options,
                         promotoras_options=promotoras_options,
                         bancos_origem_options=bancos_origem_options)

@app.route('/logo.png')
def serve_logo():
    logo_path = os.path.join(app.root_path, 'logo.png')
    if os.path.exists(logo_path):
        return send_file(logo_path, mimetype='image/png')
    else:
        static_logo_path = os.path.join(app.static_folder, 'logo.png')
        if os.path.exists(static_logo_path):
            return send_file(static_logo_path, mimetype='image/png')
        else:
            return "Logo não encontrada", 404

if __name__ == '__main__':
    load_data()
    app.run(debug=True)