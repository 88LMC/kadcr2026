
-- Add new phase_type values for licitaciones
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'Por Publicar';
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'En Preparación';
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'Presentada';
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'En Evaluación';
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'Adjudicada Ganada';
ALTER TYPE public.phase_type ADD VALUE IF NOT EXISTS 'Adjudicada Perdida';
