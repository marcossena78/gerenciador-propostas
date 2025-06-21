import { ProposalStatus, OperationType } from './types';

export const BANCOS_OPTIONS = [
  "Todos", // For filtering
  "AGIBANK",
  "ALFA",
  "BANCO BARI",
  "BANCO BANRISUL",
  "BANCO BMG",
  "BANCO BRB",
  "BANCO DAYCOVAL",
  "BANCO DIGIO",
  "BANCO FACTA",
  "BANCO HAPPY",
  "BANCO ITAU",
  "BANCO ITAU CONSIG",
  "BANCO MASTER",
  "BANCO PAN",
  "BANCO PAULISTA",
  "BANCO PINE",
  "BANCO SAFRA",
  "BANCO ZEMA",
  "C6 BANK",
  "CAIXA FEDERAL",
  "CAPITAL CONSIG",
  "CREFISA",
  "FINANTO",
  "INBURSA",
  "QI CONSIG",
  "SANTANDER"
];

export const PROMOTORAS_OPTIONS = [
  "Todos", // For filtering
  "BEVICRED",
  "CAPITAL 2",
  "CONECT",
  "GUITON",
  "GVN",
  "LEV",
  "MAIS ÁGIL",
];

export const OPERATION_TYPE_OPTIONS = [
  { value: "", label: "Selecione..." },
  { value: OperationType.NOVO, label: "Novo" },
  { value: OperationType.REFINANCIAMENTO, label: "Refinanciamento" },
  { value: OperationType.CARTAO_COM_SAQUE, label: "Cartão com Saque" },
  { value: OperationType.SAQUE_COMPLEMENTAR, label: "Saque Complementar" },
  { value: OperationType.PORTABILIDADE, label: "Portabilidade" },
];

export const STATUS_OPTIONS_MODAL = [
  { value: "", label: "Manter status atual" },
  { value: ProposalStatus.AGUARDANDO_SALDO, label: "Aguardando Saldo" },
  { value: ProposalStatus.SALDO_RETORNADO, label: "Saldo Retornado" },
  { value: ProposalStatus.SALDO_NAO_RETORNADO, label: "Saldo Não Retornado" },
  { value: ProposalStatus.PENDENTE_PAGAMENTO_CIP, label: "Pendente Pagamento CIP" },
  { value: ProposalStatus.PENDENTE_ENVIO_LINK, label: "Pendente Envio Link" },
  { value: ProposalStatus.PAGO, label: "Pago" }, // Canonical "Pago"
  { value: ProposalStatus.CANCELADA, label: "Cancelada" },
  { value: ProposalStatus.CONCLUIDA, label: "Concluída" },
  { value: ProposalStatus.APROVADA_BANCO, label: "Aprovada Banco" },
  { value: ProposalStatus.AGUARDANDO_AVERBACAO, label: "Aguardando Averbação" },
  { value: ProposalStatus.PENDENTE_FORMALIZACAO, label: "Pendente Formalização" },
  { value: ProposalStatus.EM_ANALISE, label: "Em Análise" },
  { value: ProposalStatus.CANCELADA_CLIENTE, label: "Cancelada pelo Cliente" },
  // { value: ProposalStatus.PAGA, label: "Paga" }, // Considered alias for PAGO
].sort((a, b) => {
  if (a.value === "") return -1; // Keep "Manter status atual" at the top
  if (b.value === "") return 1;
  return a.label.localeCompare(b.label);
});


export const SHEET_NAME_CONTRATOS_NOVOS_REFIN = 'CONTRATOS NOVOS E REFIN';
export const SHEET_NAME_PORTABILIDADE = 'PORTABILIDADE';
export const SHEET_NAME_CONTRATOS_PAGOS = 'CONTRATOS PAGOS';
export const SHEET_NAME_PORTABILIDADES_PAGAS = 'PORTABILIDADES PAGAS';
export const SHEET_NAME_SALDOS_NAO_RETORNADOS = 'SALDOS NÃO RETORNADOS'; // New sheet name

export const INITIAL_SHEET_NAMES = [
  SHEET_NAME_CONTRATOS_NOVOS_REFIN,
  SHEET_NAME_PORTABILIDADE,
  SHEET_NAME_CONTRATOS_PAGOS,
  SHEET_NAME_PORTABILIDADES_PAGAS,
  SHEET_NAME_SALDOS_NAO_RETORNADOS, // Added new sheet
];

// These keys correspond to the property names in your Proposal types
export const COLUMNS_CONTRATOS_NOVOS_REFIN = [
  { key: 'dataDigitacao', label: 'Data' },
  { key: 'numeroProposta', label: 'Proposta' },
  { key: 'cpf', label: 'CPF' },
  { key: 'nomeCliente', label: 'Cliente' },
  { key: 'tipoOperacao', label: 'Operação' },
  { key: 'promotora', label: 'Promotora' },
  { key: 'bancoProponente', label: 'Banco' },
  { key: 'valorParcela', label: 'Parcela' },
  { key: 'valorContrato', label: 'Contrato' },
  { key: 'statusProposta', label: 'Status' },
];

export const COLUMNS_CONTRATOS_PAGOS = [...COLUMNS_CONTRATOS_NOVOS_REFIN];

export const COLUMNS_PORTABILIDADE = [
  // { key: 'dataDigitacao', label: 'Data Digitação' }, // Already removed as per user request
  { key: 'dataEnvioCip', label: 'Data Envio CIP' },
  { key: 'dataRetornoCip', label: 'Data Retorno CIP' },
  { key: 'numeroProposta', label: 'Proposta' },
  { key: 'cpf', label: 'CPF' },
  { key: 'nomeCliente', label: 'Cliente' },
  // { key: 'tipoOperacao', label: 'Operação' },
  { key: 'bancoProponente', label: 'Banco' },
  { key: 'promotora', label: 'Promotora' },
  { key: 'valorParcela', label: 'Parcela' }, 
  { key: 'saldoDevedorPrevisto', label: 'Saldo' },
  { key: 'liquidoPrevisto', label: 'Líquido Previsto' },
  { key: 'saldoRetornado', label: 'Saldo Retornado' }, 
  { key: 'liquidoRecalculado', label: 'Líquido Recalculado' }, 
  { key: 'statusProposta', label: 'Status' },
];

export const COLUMNS_PORTABILIDADES_PAGAS = [...COLUMNS_PORTABILIDADE]; 
export const COLUMNS_SALDOS_NAO_RETORNADOS = [...COLUMNS_PORTABILIDADE]; // Same columns as PORTABILIDADE
