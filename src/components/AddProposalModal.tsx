import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Proposal, OperationType, BaseProposal, ProposalStatus } from '../types';
import { formatCPF, generateId, formatInputAsCurrencyBR, formatBRL } from '../utils/formatting';
import { 
  OPERATION_TYPE_OPTIONS, 
  BANCOS_OPTIONS, 
  PROMOTORAS_OPTIONS, 
  STATUS_OPTIONS_MODAL,
  SHEET_NAME_CONTRATOS_NOVOS_REFIN, 
  SHEET_NAME_PORTABILIDADE 
} from '../constants';

interface AddProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposal: Proposal, sheetName: string) => void;
  editingProposal: Proposal | null;
  activeSheetName: string;
}

const initialFormState = {
  id: '',
  numeroProposta: '',
  cpf: '',
  nomeCliente: '',
  tipoOperacao: '',
  dataDigitacao: new Date().toISOString().split('T')[0],
  promotora: PROMOTORAS_OPTIONS.find(p => p !== "Todas") || '',
  bancoProponente: BANCOS_OPTIONS.find(b => b !== "Todos") || '',
  valorParcela: 'R$ 0,00',
  valorContrato: 'R$ 0,00',
  saldoDevedorPrevisto: 'R$ 0,00',
  liquidoPrevisto: 'R$ 0,00',
  saldoRetornado: 'R$ 0,00',
  liquidoRecalculado: 'R$ 0,00',
  statusProposta: STATUS_OPTIONS_MODAL.find(s => s.value !== "")?.value || '',
  observacoes: '',
  dataEnvioCip: '',
  dataRetornoCip: '',
};

const AddProposalModal: React.FC<AddProposalModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingProposal, 
  activeSheetName 
}) => {
  const mainSheetOperations = [
    OperationType.NOVO,
    OperationType.REFINANCIAMENTO,
    OperationType.CARTAO_COM_SAQUE,
    OperationType.SAQUE_COMPLEMENTAR,
  ];

  const [formData, setFormData] = useState<any>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingProposal) {
        setIsEditing(true);
        const currentProposalData = { ...editingProposal };
        const dataForForm: any = {
          ...initialFormState,
          ...currentProposalData,
          id: currentProposalData.id,
          valorParcela: formatBRL(currentProposalData.valorParcela),
          observacoes: currentProposalData.observacoes || '',
          statusProposta: currentProposalData.statusProposta || initialFormState.statusProposta,
        };

        if ('dataDigitacao' in currentProposalData) {
          dataForForm.dataDigitacao = currentProposalData.dataDigitacao;
        }

        if (currentProposalData.tipoOperacao === OperationType.PORTABILIDADE) {
          const p = currentProposalData as PortabilidadeProposal;
          dataForForm.saldoDevedorPrevisto = formatBRL(p.saldoDevedorPrevisto);
          dataForForm.liquidoPrevisto = formatBRL(p.liquidoPrevisto);
          dataForForm.saldoRetornado = formatBRL(p.saldoRetornado);
          dataForForm.liquidoRecalculado = formatBRL(p.liquidoRecalculado);
          dataForForm.dataEnvioCip = p.dataEnvioCip;
          dataForForm.dataRetornoCip = p.dataRetornoCip;
        } else if (mainSheetOperations.includes(currentProposalData.tipoOperacao as OperationType)) {
          const p = currentProposalData as ContratoNovoRefinProposal;
          dataForForm.valorContrato = formatBRL(p.valorContrato);
        }

        setFormData(dataForForm);
      } else {
        setIsEditing(false);
        setFormData({
          ...initialFormState,
          id: generateId(),
          dataDigitacao: new Date().toISOString().split('T')[0],
          bancoProponente: BANCOS_OPTIONS.find(b => b !== "Todos") || '',
          promotora: PROMOTORAS_OPTIONS.find(p => p !== "Todas") || '',
          statusProposta: STATUS_OPTIONS_MODAL.find(s => s.value !== "")?.value || '',
        });
      }
    }
  }, [editingProposal, isOpen, activeSheetName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData };
    const monetaryFields = ['valorParcela', 'valorContrato', 'saldoDevedorPrevisto', 'liquidoPrevisto', 'saldoRetornado', 'liquidoRecalculado'];

    if (name === 'cpf') {
      newFormData[name] = formatCPF(value);
    } else if (name === 'nomeCliente') {
      newFormData[name] = value.toUpperCase();
    } else if (monetaryFields.includes(name)) {
      newFormData[name] = formatInputAsCurrencyBR(value);
    } else {
      newFormData[name] = value;
    }

    if (name === 'tipoOperacao') {
      if (value === OperationType.PORTABILIDADE) {
        newFormData.valorContrato = 'R$ 0,00';
        if (!isEditing) {
          newFormData.saldoRetornado = 'R$ 0,00';
          newFormData.liquidoRecalculado = 'R$ 0,00';
        }
      } else if (mainSheetOperations.includes(value as OperationType)) {
        newFormData.saldoDevedorPrevisto = 'R$ 0,00';
        newFormData.liquidoPrevisto = 'R$ 0,00';
        newFormData.saldoRetornado = 'R$ 0,00';
        newFormData.liquidoRecalculado = 'R$ 0,00';
        newFormData.dataEnvioCip = '';
        newFormData.dataRetornoCip = '';
      }
    }

    setFormData(newFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numeroProposta || !formData.cpf || !formData.nomeCliente || !formData.tipoOperacao) {
      alert('Por favor, preencha todos os campos obrigatórios (*). Certifique-se que "Tipo de Operação" está selecionado.');
      return;
    }

    let finalFormData = { ...formData };
    let targetSheetName = activeSheetName;

    if (finalFormData.tipoOperacao === OperationType.PORTABILIDADE) {
      targetSheetName = SHEET_NAME_PORTABILIDADE;
    } else if (mainSheetOperations.includes(finalFormData.tipoOperacao as OperationType)) {
      targetSheetName = SHEET_NAME_CONTRATOS_NOVOS_REFIN;
    }

    const baseProposalData = {
      id: finalFormData.id || generateId(),
      numeroProposta: finalFormData.numeroProposta,
      cpf: finalFormData.cpf,
      nomeCliente: finalFormData.nomeCliente,
      tipoOperacao: finalFormData.tipoOperacao,
      promotora: finalFormData.promotora,
      bancoProponente: finalFormData.bancoProponente,
      valorParcela: finalFormData.valorParcela,
      statusProposta: finalFormData.statusProposta,
      observacoes: finalFormData.observacoes,
    };

    let proposalData: Proposal;

    if (targetSheetName === SHEET_NAME_CONTRATOS_NOVOS_REFIN) {
      proposalData = {
        ...baseProposalData,
        dataDigitacao: finalFormData.dataDigitacao,
        valorContrato: finalFormData.valorContrato,
      } as ContratoNovoRefinProposal;
    } else if (targetSheetName === SHEET_NAME_PORTABILIDADE) {
      proposalData = {
        ...baseProposalData,
        dataDigitacao: finalFormData.dataDigitacao,
        dataEnvioCip: finalFormData.dataEnvioCip,
        dataRetornoCip: finalFormData.dataRetornoCip,
        saldoDevedorPrevisto: finalFormData.saldoDevedorPrevisto,
        liquidoPrevisto: finalFormData.liquidoPrevisto,
        saldoRetornado: finalFormData.saldoRetornado,
        liquidoRecalculado: finalFormData.liquidoRecalculado,
      } as PortabilidadeProposal;
    } else {
      proposalData = {
        ...baseProposalData,
        dataDigitacao: finalFormData.dataDigitacao,
        valorContrato: finalFormData.valorContrato,
      } as ContratoNovoRefinProposal;
    }

    onSave(proposalData, targetSheetName);
    onClose();
  };

  const showField = (fieldName: string): boolean => {
    const opType = formData.tipoOperacao;
    if (fieldName === 'saldoDevedorPrevisto' || fieldName === 'liquidoPrevisto') {
      return opType === OperationType.PORTABILIDADE;
    }
    if (fieldName === 'valorContrato') {
      return (
        opType === OperationType.NOVO ||
        opType === OperationType.REFINANCIAMENTO ||
        opType === OperationType.CARTAO_COM_SAQUE ||
        opType === OperationType.SAQUE_COMPLEMENTAR
      );
    }
    if (fieldName === 'saldoRetornado' || fieldName === 'liquidoRecalculado') {
      return isEditing && opType === OperationType.PORTABILIDADE;
    }
    if (fieldName === 'dataEnvioCip' || fieldName === 'dataRetornoCip') {
      return opType === OperationType.PORTABILIDADE;
    }
    if (fieldName === 'dataDigitacao') {
      return !!opType;
    }
    return false;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Proposta' : 'Adicionar Nova Proposta'}
      titleIcon={isEditing ? 'fas fa-edit' : 'fas fa-plus-circle'}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary-modal">
            <i className="fas fa-times mr-2"></i>Cancelar
          </button>
          <button type="submit" form="addProposalForm" className="btn-primary-modal">
            <i className="fas fa-save mr-2"></i>Salvar
          </button>
        </>
      }
    >
      <form id="addProposalForm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-6 gap-x-4 gap-y-5 p-3">
          <div className="col-span-6 sm:col-span-3">
            <label>Tipo de Operação *</label>
            <select name="tipoOperacao" value={formData.tipoOperacao} onChange={handleChange} required>
              {OPERATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {showField('dataDigitacao') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Data Digitação</label>
              <input type="date" name="dataDigitacao" value={formData.dataDigitacao} onChange={handleChange} />
            </div>
          )}

          <div className="col-span-6 sm:col-span-3">
            <label>Número da Proposta *</label>
            <input type="text" name="numeroProposta" value={formData.numeroProposta} onChange={handleChange} required />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label>CPF *</label>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} maxLength={14} />
          </div>

          <div className="col-span-6">
            <label>Nome do Cliente *</label>
            <input type="text" name="nomeCliente" value={formData.nomeCliente} onChange={handleChange} required />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label>Banco</label>
            <select name="bancoProponente" value={formData.bancoProponente} onChange={handleChange}>
              {BANCOS_OPTIONS.filter(b => b !== "Todos").map(banco => (
                <option key={banco} value={banco}>{banco}</option>
              ))}
            </select>
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label>Promotora</label>
            <select name="promotora" value={formData.promotora} onChange={handleChange}>
              {PROMOTORAS_OPTIONS.filter(p => p !== "Todas").map(prom => (
                <option key={prom} value={prom}>{prom}</option>
              ))}
            </select>
          </div>

          {showField('dataEnvioCip') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Data Envio CIP</label>
              <input type="date" name="dataEnvioCip" value={formData.dataEnvioCip} onChange={handleChange} />
            </div>
          )}

          {showField('dataRetornoCip') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Data Retorno CIP</label>
              <input type="date" name="dataRetornoCip" value={formData.dataRetornoCip} onChange={handleChange} />
            </div>
          )}

          {showField('saldoDevedorPrevisto') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Saldo Devedor Previsto</label>
              <input type="text" name="saldoDevedorPrevisto" value={formData.saldoDevedorPrevisto} onChange={handleChange} placeholder="R$ 0,00" />
            </div>
          )}

          {showField('liquidoPrevisto') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Líquido Previsto</label>
              <input type="text" name="liquidoPrevisto" value={formData.liquidoPrevisto} onChange={handleChange} placeholder="R$ 0,00" />
            </div>
          )}

          {showField('saldoRetornado') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Saldo Retornado</label>
              <input type="text" name="saldoRetornado" value={formData.saldoRetornado} onChange={handleChange} placeholder="R$ 0,00" />
            </div>
          )}

          {showField('liquidoRecalculado') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Líquido Recalculado</label>
              <input type="text" name="liquidoRecalculado" value={formData.liquidoRecalculado} onChange={handleChange} placeholder="R$ 0,00" />
            </div>
          )}

          {showField('valorContrato') && (
            <div className="col-span-6 sm:col-span-3">
              <label>Valor do Contrato</label>
              <input type="text" name="valorContrato" value={formData.valorContrato} onChange={handleChange} placeholder="R$ 0,00" />
            </div>
          )}

          <div className="col-span-6 sm:col-span-3">
            <label>Valor da Parcela</label>
            <input type="text" name="valorParcela" value={formData.valorParcela} onChange={handleChange} placeholder="R$ 0,00" />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label>Status</label>
            <select name="statusProposta" value={formData.statusProposta} onChange={handleChange}>
              {STATUS_OPTIONS_MODAL.filter(s => s.value !== "").map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-6">
            <label>Observações</label>
            <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3}></textarea>
          </div>
        </div>
      </form>

      <style>{`
        input, select, textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
        .btn-primary-modal {
          background-color: #0D6EFD; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem;
        }
        .btn-secondary-modal {
          background-color: #6C757D; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem;
        }
      `}</style>
    </Modal>
  );
};

export default AddProposalModal;