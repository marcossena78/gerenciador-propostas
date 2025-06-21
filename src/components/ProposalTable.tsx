
import React from 'react';
import { Proposal, ContratoNovoRefinProposal, PortabilidadeProposal } from '../types';
import { 
  SHEET_NAME_CONTRATOS_NOVOS_REFIN, 
  SHEET_NAME_PORTABILIDADE,
  SHEET_NAME_CONTRATOS_PAGOS,
  SHEET_NAME_PORTABILIDADES_PAGAS,
  SHEET_NAME_SALDOS_NAO_RETORNADOS, // Import new sheet name
  COLUMNS_CONTRATOS_NOVOS_REFIN, 
  COLUMNS_PORTABILIDADE,
  COLUMNS_CONTRATOS_PAGOS,
  COLUMNS_PORTABILIDADES_PAGAS,
  COLUMNS_SALDOS_NAO_RETORNADOS // Import new columns
} from '../constants';

interface ProposalTableProps {
  sheetName: string;
  proposals: Proposal[];
  onEdit: (proposal: Proposal) => void;
  onChangeStatus: (proposalId: string, sheetName: string) => void;
  // onDelete prop is removed as the button is removed from this component
}

const ProposalTable: React.FC<ProposalTableProps> = ({ sheetName, proposals, onEdit, onChangeStatus }) => {
  
  const getColumnsForSheet = (currentSheetName: string) => {
    if (currentSheetName === SHEET_NAME_CONTRATOS_NOVOS_REFIN) {
      return COLUMNS_CONTRATOS_NOVOS_REFIN;
    }
    if (currentSheetName === SHEET_NAME_PORTABILIDADE) {
      return COLUMNS_PORTABILIDADE;
    }
    if (currentSheetName === SHEET_NAME_CONTRATOS_PAGOS) {
      return COLUMNS_CONTRATOS_PAGOS;
    }
    if (currentSheetName === SHEET_NAME_PORTABILIDADES_PAGAS) { 
      return COLUMNS_PORTABILIDADES_PAGAS;
    }
    if (currentSheetName === SHEET_NAME_SALDOS_NAO_RETORNADOS) { // Added case for new sheet
      return COLUMNS_SALDOS_NAO_RETORNADOS;
    }
    return []; // Default empty array or throw error
  };

  const columns = getColumnsForSheet(sheetName);

  const renderCellContent = (proposal: Proposal, columnKey: string): React.ReactNode => {
    if (sheetName === SHEET_NAME_CONTRATOS_NOVOS_REFIN || sheetName === SHEET_NAME_CONTRATOS_PAGOS) {
      const p = proposal as ContratoNovoRefinProposal;
      // Ensure the key exists on the object type
      if (columnKey in p) {
        return p[columnKey as keyof ContratoNovoRefinProposal] || '';
      }
    } else if (sheetName === SHEET_NAME_PORTABILIDADE || sheetName === SHEET_NAME_PORTABILIDADES_PAGAS || sheetName === SHEET_NAME_SALDOS_NAO_RETORNADOS) { // Added new sheet
      const p = proposal as PortabilidadeProposal;
      // Ensure the key exists on the object type
       if (columnKey in p) {
        return p[columnKey as keyof PortabilidadeProposal] || '';
      }
    }
    return ''; // Fallback for safety
  };


  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-b-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-dark text-white">
          <tr>
            {columns.map(col => (
              <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {proposals.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-500 text-lg">
                <i className="fas fa-folder-open fa-3x mb-3 text-gray-400"></i>
                <p>Nenhuma proposta encontrada para os filtros aplicados.</p>
              </td>
            </tr>
          ) : (
            proposals.map((proposal) => (
              <tr key={proposal.id} className={`hover:bg-gray-50 transition-colors ${proposal.rowClass || ''}`}>
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {renderCellContent(proposal, col.key)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(proposal)}
                      className="text-primary hover:text-blue-700 transition-colors"
                      title="Editar Proposta"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => onChangeStatus(proposal.id, sheetName)}
                      className="text-info hover:text-cyan-700 transition-colors"
                      title="Alterar Status"
                    >
                      <i className="fas fa-exchange-alt"></i>
                    </button>
                    {/* Delete button removed from here */}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProposalTable;
