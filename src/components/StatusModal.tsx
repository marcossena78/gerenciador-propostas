
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { ProposalStatus } from '../types';
import { STATUS_OPTIONS_MODAL } from '../constants';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newStatus: string, observations: string, action?: 'delete_proposal' | 'nao_retornado' | 'retornado') => void;
  currentStatus?: string;
  currentObservations?: string;
}

const StatusModal: React.FC<StatusModalProps> = ({ isOpen, onClose, onSave, currentStatus, currentObservations }) => {
  const [newStatus, setNewStatus] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNewStatus(currentStatus || ''); // Keep current if no new selection or allow clearing
      setObservations(currentObservations || '');
    }
  }, [isOpen, currentStatus, currentObservations]);

  const handleSubmit = (action?: 'delete_proposal' | 'nao_retornado' | 'retornado') => {
    let finalStatus = newStatus;
    if (action === 'nao_retornado') finalStatus = ProposalStatus.SALDO_NAO_RETORNADO;
    if (action === 'retornado') finalStatus = ProposalStatus.SALDO_RETORNADO;
    
    onSave(finalStatus, observations, action);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alterar Status da Proposta"
      titleIcon="fas fa-exchange-alt"
      size="md"
      footer={
        <div className="w-full flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
           <button 
                type="button" 
                onClick={() => handleSubmit('delete_proposal')} 
                className="w-full sm:w-auto btn-danger-modal">
                <i className="fas fa-trash mr-2"></i>Excluir
            </button>
            <div className="flex w-full sm:w-auto space-x-2">
                 <button 
                    type="button" 
                    onClick={() => handleSubmit('nao_retornado')} 
                    className="flex-1 sm:flex-initial btn-warning-modal">
                    <i className="fas fa-times-circle mr-2"></i>Não Retornado
                </button>
                <button 
                    type="button" 
                    onClick={() => handleSubmit('retornado')} 
                    className="flex-1 sm:flex-initial btn-success-modal">
                    <i className="fas fa-check-circle mr-2"></i>Retornado
                </button>
            </div>
            <button 
                type="button" 
                onClick={() => handleSubmit()} 
                className="w-full sm:w-auto btn-primary-modal">
                <i className="fas fa-save mr-2"></i>Salvar Alterações
            </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
          <select
            id="newStatus"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="mt-1 block w-full input-style"
          >
            {STATUS_OPTIONS_MODAL.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            className="mt-1 block w-full input-style"
            placeholder="Adicione observações sobre a mudança de status..."
          />
        </div>
      </div>
       <style>{`
        .input-style {
          appearance: none;
          background-color: #fff;
          border-color: #d1d5db; /* gray-300 */
          border-width: 1px;
          border-radius: 0.375rem; /* rounded-md */
          padding: 0.5rem 0.75rem; /* py-2 px-3 */
          font-size: 0.875rem; /* sm:text-sm */
          line-height: 1.25rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
        }
        .input-style:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          border-color: #4f46e5; /* indigo-500 */
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3); /* focus:ring-indigo-500 with opacity */
        }
         .btn-primary-modal {
            background-color: #0D6EFD; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
        }
        .btn-primary-modal:hover {
            background-color: #0B5ED7;
        }
        .btn-danger-modal {
            background-color: #DC3545; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
        }
        .btn-danger-modal:hover {
            background-color: #BB2D3B;
        }
        .btn-warning-modal {
            background-color: #FFC107; color: #000; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
        }
        .btn-warning-modal:hover {
            background-color: #FFCA2C;
        }
         .btn-success-modal {
            background-color: #198754; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
        }
        .btn-success-modal:hover {
            background-color: #157347;
        }
      `}</style>
    </Modal>
  );
};

export default StatusModal;
    