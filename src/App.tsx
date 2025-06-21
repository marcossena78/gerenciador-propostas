import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProposalTabs from './components/ProposalTabs';
import ProposalTable from './components/ProposalTable';
import AddProposalModal from './components/AddProposalModal';
import StatusModal from './components/StatusModal';
import ExportDropdown from './components/ExportDropdown';

// Contexto de autenticação
import { useAuth } from './context/AuthContext';

// Tipos e constantes
import {
  Proposal,
  ContratoNovoRefinProposal,
  PortabilidadeProposal,
  SheetData,
  Filters,
  NotificationMessage,
  OperationType,
  ProposalStatus,
} from './types';

import {
  SHEET_NAME_CONTRATOS_NOVOS_REFIN,
  SHEET_NAME_PORTABILIDADE,
  SHEET_NAME_CONTRATOS_PAGOS,
  SHEET_NAME_PORTABILIDADES_PAGAS,
  SHEET_NAME_SALDOS_NAO_RETORNADOS,
  INITIAL_SHEET_NAMES,
} from './constants';

import { generateId, formatBRL } from './utils/formatting';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [proposalsBySheet, setProposalsBySheet] = useState<SheetData>({
    [SHEET_NAME_CONTRATOS_NOVOS_REFIN]: [],
    [SHEET_NAME_PORTABILIDADE]: [],
    [SHEET_NAME_CONTRATOS_PAGOS]: [],
    [SHEET_NAME_PORTABILIDADES_PAGAS]: [],
    [SHEET_NAME_SALDOS_NAO_RETORNADOS]: [],
  });

  const [activeSheetName, setActiveSheetName] = useState<string>(INITIAL_SHEET_NAMES[0]);
  const [filters, setFilters] = useState<Filters>({ nomeCliente: '', cpf: '', banco: '', promotora: '' });
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    proposalId: string;
    sheetName: string;
    currentStatus?: ProposalStatus;
    currentObservations?: string;
  } | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const { session } = useAuth();

  // Carregar propostas do Supabase
  useEffect(() => {
    const fetchProposals = async () => {
      const { data, error } = await supabase.from('propostas').select('*');
      if (error) {
        addNotification('error', 'Erro ao carregar propostas.');
        console.error(error);
        return;
      }

      const formattedData = INITIAL_SHEET_NAMES.reduce((acc, sheetName) => {
        acc[sheetName] = data.filter(p => p.sheetName === sheetName);
        return acc;
      }, {} as SheetData);

      setProposalsBySheet(formattedData);
    };

    fetchProposals();
  }, []);

  const addNotification = useCallback((type: NotificationMessage['type'], message: string) => {
    const newNotification = { id: generateId(), type, message };
    setNotifications(prev => [newNotification, ...prev.slice(0, 2)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const displayedProposals = useMemo(() => {
    const currentSheetProposals = proposalsBySheet[activeSheetName] || [];
    if (!filters.nomeCliente && !filters.cpf && !filters.banco && !filters.promotora) return currentSheetProposals;

    return currentSheetProposals.filter(p =>
      p.nomeCliente.toLowerCase().includes(filters.nomeCliente.toLowerCase()) &&
      p.cpf.includes(filters.cpf) &&
      p.bancoProponente === filters.banco &&
      p.promotora === filters.promotora
    );
  }, [proposalsBySheet, activeSheetName, filters]);

  const handleFilterChange = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ nomeCliente: '', cpf: '', banco: '', promotora: '' });
  }, []);

  const handleAddOrUpdateProposal = useCallback(async (proposal: Proposal, sheetName: string) => {
    const payload = {
      ...proposal,
      sheetName,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('propostas')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      addNotification('error', 'Erro ao salvar proposta.');
      console.error(error);
      return;
    }

    addNotification('success', `Proposta ${proposal.numeroProposta} salva com sucesso.`);
    window.location.reload(); // Atualiza os dados após salvar
  }, [addNotification]);

  const handleEditProposal = useCallback((proposal: Proposal) => {
    setEditingProposal({ ...proposal });
    setIsAddModalOpen(true);
  }, []);

  const handleDeleteProposal = useCallback(async (proposalId: string, sheetName: string) => {
    const proposalToDelete = (proposalsBySheet[sheetName] || []).find(p => p.id === proposalId);
    if (!proposalToDelete) {
      addNotification('error', 'Proposta não encontrada.');
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a proposta "${proposalToDelete.numeroProposta}"?`
    );

    if (confirmDelete) {
      const { error } = await supabase.from('propostas').delete().eq('id', proposalId);
      if (error) {
        addNotification('error', 'Erro ao excluir proposta.');
        console.error(error);
        return;
      }

      setProposalsBySheet(prev => ({
        ...prev,
        [sheetName]: prev[sheetName]?.filter(p => p.id !== proposalId) || []
      }));

      addNotification('warning', `Proposta ${proposalToDelete.numeroProposta} excluída.`);
    }
  }, [proposalsBySheet, addNotification]);

  const handleOpenStatusModal = useCallback((proposalId: string, sheetName: string) => {
    const proposal = (proposalsBySheet[sheetName] || []).find(p => p.id === proposalId);
    if (proposal) {
      setStatusChangeTarget({
        proposalId,
        sheetName,
        currentStatus: proposal.statusProposta,
        currentObservations: proposal.observacoes,
      });
      setIsStatusModalOpen(true);
    }
  }, [proposalsBySheet]);

  const handleStatusChangeSave = useCallback(async (
    newStatus: ProposalStatus,
    observations: string,
    action?: 'delete_proposal' | 'nao_retornado' | 'retornado'
  ) => {
    if (!statusChangeTarget) return;

    const { proposalId, sheetName } = statusChangeTarget;
    const proposalToUpdate = (proposalsBySheet[sheetName] || []).find(p => p.id === proposalId);
    if (!proposalToUpdate) return;

    let targetSheetName = sheetName;

    if (action === 'delete_proposal') {
      await supabase.from('propostas').delete().eq('id', proposalId);
      setProposalsBySheet(prev => ({
        ...prev,
        [sheetName]: prev[sheetName].filter(p => p.id !== proposalId),
      }));
      addNotification('warning', `Proposta ${proposalToUpdate.numeroProposta} excluída.`);
      setIsStatusModalOpen(false);
      return;
    }

    if (sheetName === SHEET_NAME_PORTABILIDADE && action === 'retornado') {
      targetSheetName = SHEET_NAME_PORTABILIDADES_PAGAS;
    } else if (sheetName === SHEET_NAME_PORTABILIDADE && action === 'nao_retornado') {
      targetSheetName = SHEET_NAME_SALDOS_NAO_RETORNADOS;
    } else if (sheetName === SHEET_NAME_CONTRATOS_NOVOS_REFIN && newStatus === ProposalStatus.PAGO) {
      targetSheetName = SHEET_NAME_CONTRATOS_PAGOS;
    }

    const updatedProposal = {
      ...proposalToUpdate,
      statusProposta: newStatus,
      observacoes: observations,
      sheetName: targetSheetName,
    };

    const { error } = await supabase.from('propostas').upsert(updatedProposal, { onConflict: 'id' });

    if (error) {
      addNotification('error', 'Erro ao mover proposta.');
      console.error(error);
      return;
    }

    setProposalsBySheet(prev => {
      const source = [...(prev[sheetName] || [])];
      const destination = [...(prev[targetSheetName] || [])];

      const idx = source.findIndex(p => p.id === proposalId);
      if (idx > -1) {
        source.splice(idx, 1);
        destination.unshift(updatedProposal);
      }

      return {
        ...prev,
        [sheetName]: source,
        [targetSheetName]: destination,
      };
    });

    addNotification('success', `Proposta movida para ${targetSheetName}.`);
    setIsStatusModalOpen(false);
  }, [statusChangeTarget, proposalsBySheet, addNotification]);

  const getProposalsForSheet = useCallback((sheetName: string): Proposal[] => {
    return proposalsBySheet[sheetName] || [];
  }, [proposalsBySheet]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* Notificações */}
      <div className="fixed top-20 right-4 z-[100] max-w-sm space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-md shadow-lg text-sm font-medium
            ${n.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : ''}
            ${n.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : ''}
            ${n.type === 'info' ? 'bg-blue-100 border border-blue-400 text-blue-700' : ''}
            ${n.type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' : ''}
          `}>
            <i className={`fas ${
              n.type === 'success' ? 'fa-check-circle' :
              n.type === 'error' ? 'fa-exclamation-circle' :
              n.type === 'info' ? 'fa-info-circle' :
              'fa-exclamation-triangle'} mr-2`}></i>
            {n.message}
          </div>
        ))}
      </div>

      <main className="container mx-auto px-4 py-6 flex-grow">
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={() => console.log('Filtros aplicados')}
          onClearFilters={handleClearFilters}
        />

        <div className="mb-4">
          <button
            onClick={() => { setEditingProposal(null); setIsAddModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm flex items-center"
          >
            <i className="fas fa-plus mr-2"></i> Adicionar Nova Proposta
          </button>
        </div>

        <ProposalTabs
          sheetNames={INITIAL_SHEET_NAMES}
          activeSheetName={activeSheetName}
          onTabChange={setActiveSheetName}
          getProposalsForSheet={getProposalsForSheet}
        />

        <ProposalTable
          sheetName={activeSheetName}
          proposals={displayedProposals}
          onEdit={handleEditProposal}
          onChangeStatus={handleOpenStatusModal}
        />
      </main>

      <AddProposalModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingProposal(null); }}
        onSave={handleAddOrUpdateProposal}
        editingProposal={editingProposal}
        activeSheetName={activeSheetName}
      />

      {statusChangeTarget && (
        <StatusModal
          isOpen={isStatusModalOpen}
          onClose={() => { setIsStatusModalOpen(false); setStatusChangeTarget(null); }}
          onSave={handleStatusChangeSave}
          currentStatus={statusChangeTarget.currentStatus}
          currentObservations={statusChangeTarget.currentObservations}
        />
      )}

      <ExportDropdown />
      <footer className="py-4 bg-blue-600 text-white text-center text-sm">
        Gerenciador de Propostas Souzacred © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;