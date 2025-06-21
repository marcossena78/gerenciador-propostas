
export enum OperationType {
  PORTABILIDADE = "Portabilidade",
  NOVO = "Novo",
  REFINANCIAMENTO = "Refinanciamento",
  CARTAO_COM_SAQUE = "Cartão com Saque",
  SAQUE_COMPLEMENTAR = "Saque Complementar",
}

export enum ProposalStatus {
  AGUARDANDO_SALDO = "AGUARDANDO SALDO",
  SALDO_RETORNADO = "SALDO RETORNADO",
  SALDO_NAO_RETORNADO = "SALDO NÃO RETORNADO",
  PENDENTE_PAGAMENTO_CIP = "PENDENTE PAGAMENTO CIP",
  PENDENTE_ENVIO_LINK = "PENDENTE ENVIO LINK",
  PAGO = "PAGO",
  CANCELADA = "CANCELADA",
  CONCLUIDA = "CONCLUÍDA", // Used for filtering, maybe not a direct status
  // From HTML, specific to Contratos Novos/Refin
  APROVADA_BANCO = "APROVADA BANCO",
  AGUARDANDO_AVERBACAO = "AGUARDANDO AVERBAÇÃO",
  PAGA = "PAGA", // Alias for PAGO?
  PENDENTE_FORMALIZACAO = "PENDENTE FORMALIZAÇÃO",
  EM_ANALISE = "EM ANÁLISE",
  CANCELADA_CLIENTE = "CANCELADA PELO CLIENTE",
}


// Base Proposal
export interface BaseProposal {
  id: string; // Should be unique across all sheets if possible, or unique within its sheet context
  numeroProposta: string;
  cpf: string;
  nomeCliente: string;
  tipoOperacao: OperationType | string; // Added to base
  promotora: string;
  bancoProponente: string; // BANCO_PROPONENTE or Banco
  valorParcela: string;
  statusProposta: string; // STATUS_PROPOSTA or Status
  observacoes?: string;
  rowClass?: string;
}

// For 'CONTRATOS NOVOS E REFIN' sheet
export interface ContratoNovoRefinProposal extends BaseProposal {
  dataDigitacao: string; // Data
  // tipoOperacao is now inherited from BaseProposal
  valorContrato: string; // Vl. contrato
}

// For other sheets like 'PORTABILIDADE'
export interface PortabilidadeProposal extends BaseProposal {
  dataDigitacao?: string;
  dataEnvioCip?: string; // New field
  dataRetornoCip?: string; // New field
  saldoDevedorPrevisto: string; 
  liquidoPrevisto?: string; 
  saldoRetornado?: string; 
  liquidoRecalculado?: string; 
  // tipoOperacao is now inherited from BaseProposal
}

export type Proposal = ContratoNovoRefinProposal | PortabilidadeProposal;

export interface SheetData {
  [sheetName: string]: Proposal[];
}

export interface Filters {
  nomeCliente: string;
  cpf: string;
  banco: string;
  promotora: string;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
