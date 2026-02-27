import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProspectsWithStats } from '@/hooks/useProspects';
import { ProspectCard } from '@/components/pipeline/ProspectCard';
import { ProspectPhaseModal } from '@/components/pipeline/ProspectPhaseModal';
import { Database } from '@/integrations/supabase/types';
import { B2B_PHASES, LICITACION_PHASES, LICITACION_PHASE_COLORS } from '@/lib/licitacion-constants';

type PhaseType = Database['public']['Enums']['phase_type'];

const B2B_PHASE_COLORS: Record<string, string> = {
  'Prospección': 'bg-muted',
  'Lead': 'bg-primary/10',
  'Cotización': 'bg-warning/10',
  'Negociación': 'bg-warning/20',
  'Ganada': 'bg-success/20',
  'Perdida': 'bg-destructive/10',
  'En Producción': 'bg-success/10',
  'Facturada': 'bg-success/30',
  'Post Venta': 'bg-primary/20',
};

const ALL_PHASE_COLORS: Record<string, string> = {
  ...B2B_PHASE_COLORS,
  ...LICITACION_PHASE_COLORS,
};

type FilterType = 'todos' | 'regular' | 'licitacion';

interface ProspectWithStats {
  id: string;
  company_name: string;
  contact_name: string;
  current_phase: PhaseType | null;
  estimated_value: number | null;
  pending_activities: number;
  days_in_phase: number;
  prospect_type?: string | null;
  licitacion_numero?: string | null;
  licitacion_institucion?: string | null;
  licitacion_fecha_cierre?: string | null;
  licitacion_monto_estimado?: number | null;
}

export default function Pipeline() {
  const { data: prospects, isLoading } = useProspectsWithStats();
  const [selectedProspect, setSelectedProspect] = useState<ProspectWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todos');

  const getProspectsByPhase = (phase: string) => {
    return prospects?.filter(p => {
      if (p.current_phase !== phase) return false;
      if (filter === 'regular') return p.prospect_type !== 'licitacion';
      if (filter === 'licitacion') return p.prospect_type === 'licitacion';
      return true;
    }) || [];
  };

  const handleProspectClick = (prospect: ProspectWithStats) => {
    setSelectedProspect(prospect);
    setIsModalOpen(true);
  };

  const getVisiblePhases = (): { phases: readonly string[]; label?: string }[] => {
    if (filter === 'regular') return [{ phases: B2B_PHASES }];
    if (filter === 'licitacion') return [{ phases: LICITACION_PHASES }];
    // "todos" - show both sets
    return [
      { phases: B2B_PHASES, label: '📋 B2B' },
      { phases: LICITACION_PHASES, label: '🏛️ Licitaciones' },
    ];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96 w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const phaseSections = getVisiblePhases();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pipeline de Ventas</h1>
        <div className="flex items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="regular">B2B</TabsTrigger>
              <TabsTrigger value="licitacion">🏛️ Licitaciones</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Haz clic en un prospecto para cambiar de fase
          </p>
        </div>
      </div>

      {phaseSections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="space-y-2">
          {section.label && (
            <h2 className="text-lg font-semibold text-muted-foreground">{section.label}</h2>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
            {section.phases.map((phase) => {
              const phaseProspects = getProspectsByPhase(phase);
              const totalValue = phaseProspects.reduce(
                (sum, p) => sum + (p.estimated_value || 0),
                0
              );

              return (
                <div key={phase} className="flex-shrink-0 w-72">
                  <Card className={ALL_PHASE_COLORS[phase] || 'bg-muted'}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{phase}</CardTitle>
                        <Badge variant="secondary">{phaseProspects.length}</Badge>
                      </div>
                      {totalValue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          💰 ${totalValue.toLocaleString()}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 min-h-[200px]">
                      {phaseProspects.map((prospect) => (
                        <ProspectCard
                          key={prospect.id}
                          prospect={prospect}
                          onClick={() => handleProspectClick(prospect as ProspectWithStats)}
                        />
                      ))}
                      {phaseProspects.length === 0 && (
                        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                          <p className="text-xs text-muted-foreground">
                            Sin prospectos
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <ProspectPhaseModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
