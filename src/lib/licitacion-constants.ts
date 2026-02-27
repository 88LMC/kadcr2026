// Phase constants for B2B (Regular) prospects
export const B2B_PHASES = [
  'Prospección',
  'Lead',
  'Cotización',
  'Negociación',
  'Ganada',
  'Perdida',
  'En Producción',
  'Facturada',
  'Post Venta',
] as const;

// Phase constants for Licitacion prospects
export const LICITACION_PHASES = [
  'Por Publicar',
  'En Preparación',
  'Presentada',
  'En Evaluación',
  'Adjudicada Ganada',
  'Adjudicada Perdida',
] as const;

// All phases combined
export const ALL_PHASES = [...B2B_PHASES, ...LICITACION_PHASES] as const;

// Labels for licitacion phases (display)
export const LICITACION_PHASE_LABELS: Record<string, string> = {
  'Por Publicar': 'Por Publicar',
  'En Preparación': 'En Preparación',
  'Presentada': 'Presentada',
  'En Evaluación': 'En Evaluación',
  'Adjudicada Ganada': 'Adjudicada (Ganada)',
  'Adjudicada Perdida': 'Adjudicada (Perdida)',
};

// Licitacion categories for adjudication reason
export const LICITACION_CATEGORIAS = [
  { value: 'precio', label: 'Precio' },
  { value: 'tiempo_entrega', label: 'Tiempo de Entrega' },
  { value: 'calificacion_tecnica', label: 'Calificación Técnica' },
  { value: 'otros', label: 'Otros' },
] as const;

// Closed licitacion stages (no more activities allowed)
export const CLOSED_LICITACION_PHASES = ['Adjudicada Ganada', 'Adjudicada Perdida'] as const;

// Type helpers
export type ProspectType = 'regular' | 'licitacion';
export type LicitacionPhase = typeof LICITACION_PHASES[number];
export type B2BPhase = typeof B2B_PHASES[number];

// Pipeline column colors for licitacion phases
export const LICITACION_PHASE_COLORS: Record<string, string> = {
  'Por Publicar': 'bg-muted',
  'En Preparación': 'bg-amber-500/10',
  'Presentada': 'bg-amber-500/20',
  'En Evaluación': 'bg-amber-500/30',
  'Adjudicada Ganada': 'bg-success/20',
  'Adjudicada Perdida': 'bg-destructive/10',
};

// Helper: get phases for a prospect type
export function getPhasesForType(type: string | null | undefined): readonly string[] {
  if (type === 'licitacion') return LICITACION_PHASES;
  return B2B_PHASES;
}

// Helper: check if a phase belongs to licitacion
export function isLicitacionPhase(phase: string | null | undefined): boolean {
  return LICITACION_PHASES.includes(phase as LicitacionPhase);
}

// Helper: format currency in colones
export function formatColones(value: number | null | undefined): string {
  if (!value) return '';
  if (value >= 1_000_000) {
    return `₡${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `₡${(value / 1_000).toFixed(0)}K`;
  }
  return `₡${value.toLocaleString()}`;
}

// Helper: days until a date
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
