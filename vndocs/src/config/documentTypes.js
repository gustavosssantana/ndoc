/**
 * Tabela de tipos de documento. É configuração, não dado de usuário —
 * por isso vive aqui e não vem do banco.
 */
export const DOCUMENT_TYPES = [
  { id: 'contrato',   label: 'Contrato',           color: '#2563EB' },
  { id: 'procuracao', label: 'Procuração',         color: '#7C3AED' },
  { id: 'recibo',     label: 'Recibo',             color: '#16A34A' },
  { id: 'proposta',   label: 'Proposta comercial', color: '#CA8A04' },
  { id: 'declaracao', label: 'Declaração',         color: '#0891B2' },
  { id: 'outro',      label: 'Outro',              color: '#64748B' },
];

export default DOCUMENT_TYPES;
