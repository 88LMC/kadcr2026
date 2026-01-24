import { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectsWithStats, useUpdateProspectPhase } from '@/hooks/useProspects';
import { useToast } from '@/hooks/use-toast';
import { ProspectCard } from '@/components/pipeline/ProspectCard';
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

export default function Pipeline() {
  const { data: prospects, isLoading } = useProspectsWithStats();
  const updatePhase = useUpdateProspectPhase();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getProspectsByPhase = (phase: PhaseType) => {
    return prospects?.filter(p => p.current_phase === phase) || [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const prospectId = active.id as string;
    const newPhase = over.id as PhaseType;

    // Check if the prospect is already in this phase
    const prospect = prospects?.find(p => p.id === prospectId);
    if (!prospect || prospect.current_phase === newPhase) return;

    try {
      await updatePhase.mutateAsync({
        prospectId,
        phase: newPhase,
      });
      toast({
        title: 'Fase actualizada',
        description: `${prospect.company_name} movido a ${newPhase}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la fase.',
        variant: 'destructive',
      });
    }
  };

  const activeProspect = activeId ? prospects?.find(p => p.id === activeId) : null;

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
          Arrastra los prospectos para cambiar de fase
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
          {PHASES.map((phase) => {
            const phaseProspects = getProspectsByPhase(phase);
            const totalValue = phaseProspects.reduce(
              (sum, p) => sum + (p.estimated_value || 0), 
              0
            );

            return (
              <div
                key={phase}
                id={phase}
                className="flex-shrink-0 w-72"
              >
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
                        isDragging={activeId === prospect.id}
                      />
                    ))}
                    {phaseProspects.length === 0 && (
                      <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                        <p className="text-xs text-muted-foreground">
                          Arrastra aquí
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeProspect ? (
            <ProspectCard prospect={activeProspect} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}