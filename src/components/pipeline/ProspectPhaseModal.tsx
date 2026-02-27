import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, Ban, Loader2 } from 'lucide-react';
import { getPhasesForType, LICITACION_CATEGORIAS, CLOSED_LICITACION_PHASES, isLicitacionPhase, formatColones, daysUntil } from '@/lib/licitacion-constants';

type PhaseType = Database['public']['Enums']['phase_type'];
type ActivityStatus = Database['public']['Enums']['activity_status'];

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

interface ProspectPhaseModalProps {
  prospect: ProspectWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Activity {
  id: string;
  activity_type: string;
  scheduled_date: string;
  status: ActivityStatus | null;
  completion_comment: string | null;
  notes: string | null;
}

export function ProspectPhaseModal({ prospect, open, onOpenChange }: ProspectPhaseModalProps) {
  const [newPhase, setNewPhase] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  // Adjudication state
  const [showAdjudicacion, setShowAdjudicacion] = useState(false);
  const [adjCategoria, setAdjCategoria] = useState('');
  const [adjDetalles, setAdjDetalles] = useState('');
  const [cancelPending, setCancelPending] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLicitacion = prospect?.prospect_type === 'licitacion';
  const availablePhases = getPhasesForType(prospect?.prospect_type);

  // Fetch activity history
  const { data: activities, isLoading: loadingActivities } = useQuery({
    queryKey: ['prospect-activities', prospect?.id],
    queryFn: async () => {
      if (!prospect?.id) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('id, activity_type, scheduled_date, status, completion_comment, notes')
        .eq('prospect_id', prospect.id)
        .order('scheduled_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!prospect?.id && showHistory,
  });

  // Count pending activities
  const { data: pendingCount } = useQuery({
    queryKey: ['prospect-pending-count', prospect?.id],
    queryFn: async () => {
      if (!prospect?.id) return 0;
      const { count, error } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('prospect_id', prospect.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!prospect?.id && showAdjudicacion,
  });

  const updatePhase = useMutation({
    mutationFn: async ({ prospectId, phase, categoria, detalles, shouldCancelPending }: {
      prospectId: string;
      phase: string;
      categoria?: string;
      detalles?: string;
      shouldCancelPending?: boolean;
    }) => {
      const updateData: Record<string, any> = {
        current_phase: phase,
        updated_at: new Date().toISOString(),
      };

      if (categoria) {
        updateData.licitacion_categoria = categoria;
      }
      if (detalles) {
        updateData.licitacion_razon_resultado = detalles;
      }

      const { error } = await supabase
        .from('prospects')
        .update(updateData)
        .eq('id', prospectId);

      if (error) throw error;

      // Cancel pending activities if requested
      if (shouldCancelPending) {
        const { error: cancelError } = await supabase
          .from('activities')
          .update({
            status: 'completed' as any,
            completion_comment: 'Cancelada automáticamente - Licitación adjudicada',
            completed_at: new Date().toISOString(),
          })
          .eq('prospect_id', prospectId)
          .eq('status', 'pending');

        if (cancelError) throw cancelError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: 'Fase actualizada',
        description: `${prospect?.company_name} movido a ${newPhase}`,
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la fase.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setNewPhase(null);
    setReason('');
    setShowHistory(false);
    setShowAdjudicacion(false);
    setAdjCategoria('');
    setAdjDetalles('');
    setCancelPending(false);
    onOpenChange(false);
  };

  const handleMove = () => {
    if (!prospect || !newPhase) return;

    // Check if moving to adjudication phase
    if (isLicitacion && CLOSED_LICITACION_PHASES.includes(newPhase as any)) {
      setShowAdjudicacion(true);
      return;
    }

    updatePhase.mutate({ prospectId: prospect.id, phase: newPhase });
  };

  const handleAdjudicacion = () => {
    if (!prospect || !newPhase) return;
    if (!adjCategoria) {
      toast({ title: 'Selecciona una razón', variant: 'destructive' });
      return;
    }

    updatePhase.mutate({
      prospectId: prospect.id,
      phase: newPhase,
      categoria: adjCategoria,
      detalles: adjCategoria === 'otros' ? adjDetalles : adjCategoria,
      shouldCancelPending: cancelPending,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusIcon = (status: ActivityStatus | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'blocked':
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusLabel = (status: ActivityStatus | null) => {
    switch (status) {
      case 'completed': return 'COMPLETADA';
      case 'blocked': return 'BLOQUEADA';
      default: return 'PENDIENTE';
    }
  };

  if (!prospect) return null;

  // Adjudication sub-modal
  if (showAdjudicacion) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🏛️ Licitación Adjudicada</DialogTitle>
            <p className="text-sm text-muted-foreground">{prospect.company_name}</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Razón del resultado:</Label>
              <RadioGroup value={adjCategoria} onValueChange={setAdjCategoria}>
                {LICITACION_CATEGORIAS.map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={`cat-${cat.value}`} />
                    <Label htmlFor={`cat-${cat.value}`} className="font-normal cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {adjCategoria === 'otros' && (
              <div className="space-y-2">
                <Label>Especifica la razón:</Label>
                <Textarea
                  value={adjDetalles}
                  onChange={(e) => setAdjDetalles(e.target.value)}
                  placeholder="Describe la razón del resultado..."
                  rows={2}
                />
              </div>
            )}

            {(pendingCount ?? 0) > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                <p className="text-sm font-medium">
                  Tienes {pendingCount} actividades pendientes.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cancel-pending"
                    checked={cancelPending}
                    onChange={(e) => setCancelPending(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="cancel-pending" className="text-sm font-normal cursor-pointer">
                    ¿Cancelarlas automáticamente?
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAdjudicacion(false)}>
              Volver
            </Button>
            <Button
              onClick={handleAdjudicacion}
              disabled={!adjCategoria || updatePhase.isPending}
            >
              {updatePhase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Adjudicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLicitacion && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">🏛️ LIC</Badge>
            )}
            {prospect.company_name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">{prospect.contact_name}</div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Licitacion Info */}
          {isLicitacion && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1 text-sm">
              {prospect.licitacion_numero && (
                <p><span className="font-medium">Nº:</span> {prospect.licitacion_numero}</p>
              )}
              {prospect.licitacion_institucion && (
                <p><span className="font-medium">Institución:</span> {prospect.licitacion_institucion}</p>
              )}
              {prospect.licitacion_fecha_cierre && (
                <p>
                  <span className="font-medium">Cierre:</span>{' '}
                  {new Date(prospect.licitacion_fecha_cierre + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {(() => {
                    const d = daysUntil(prospect.licitacion_fecha_cierre);
                    if (d !== null && d >= 0) return ` (${d} días)`;
                    return '';
                  })()}
                </p>
              )}
              {prospect.licitacion_monto_estimado && (
                <p><span className="font-medium">Monto:</span> {formatColones(prospect.licitacion_monto_estimado)}</p>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {prospect.estimated_value && prospect.estimated_value > 0 && (
              <Badge variant="outline">💰 {formatCurrency(prospect.estimated_value)}</Badge>
            )}
            {prospect.pending_activities > 0 && (
              <Badge variant="secondary">📋 {prospect.pending_activities} pendientes</Badge>
            )}
          </div>

          {/* Phase Change */}
          <div className="space-y-3 pt-2 border-t">
            <div className="text-sm">
              Fase actual: <span className="font-medium">{prospect.current_phase}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cambiar a:</label>
              <Select
                value={newPhase || ''}
                onValueChange={(value) => setNewPhase(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona fase" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases.map((phase) => (
                    <SelectItem key={phase} value={phase}>
                      {phase} {phase === prospect.current_phase ? '(actual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Razón del cambio: (opcional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Cliente solicitó cotización formal"
                rows={2}
              />
            </div>
          </div>

          {/* Activity History Toggle */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Ocultar Historial' : 'Ver Actividades'}
            </Button>

            {showHistory && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {loadingActivities ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      {getStatusIcon(activity.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(activity.scheduled_date)}</span>
                          <span className="text-muted-foreground">|</span>
                          <span>{activity.activity_type}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-xs text-muted-foreground">
                            {getStatusLabel(activity.status)}
                          </span>
                        </div>
                        {(activity.completion_comment || activity.notes) && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            "{activity.completion_comment || activity.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-2">
                    Sin actividades registradas
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!newPhase || newPhase === prospect.current_phase || updatePhase.isPending}
            className="w-full sm:w-auto"
          >
            {updatePhase.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moviendo...
              </>
            ) : (
              'Mover'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
