import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectsWithStats } from '@/hooks/useProspects';
import { ProspectCard } from '@/components/pipeline/ProspectCard';
import { ProspectPhaseModal } from '@/components/pipeline/ProspectPhaseModal';
import { Constants, Database } from '@/integrations/supabase/types';

type PhaseType = Database['public']['Enums']['phase_type'];

const PHASES = Constants.public.Enums.phase_type;

const PHASE_COLORS: Record<PhaseType, string> = {
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

interface ProspectWithStats {
  id: string;
  company_name: string;
  contact_name: string;
  current_phase: PhaseType | null;
  estimated_value: number | null;
  pending_activities: number;
  days_in_phase: number;
}

export default function Pipeline() {
  const { data: prospects, isLoading } = useProspectsWithStats();
  const [selectedProspect, setSelectedProspect] = useState<ProspectWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getProspectsByPhase = (phase: PhaseType) => {
    return prospects?.filter(p => p.current_phase === phase) || [];
  };

  const handleProspectClick = (prospect: ProspectWithStats) => {
    setSelectedProspect(prospect);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PHASES.slice(0, 5).map((phase) => (
            <Skeleton key={phase} className="h-96 w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline de Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Haz clic en un prospecto para cambiar de fase
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
        {PHASES.map((phase) => {
          const phaseProspects = getProspectsByPhase(phase);
          const totalValue = phaseProspects.reduce(
            (sum, p) => sum + (p.estimated_value || 0), 
            0
          );

          return (
            <div key={phase} className="flex-shrink-0 w-72">
              <Card className={PHASE_COLORS[phase]}>
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

      <ProspectPhaseModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
