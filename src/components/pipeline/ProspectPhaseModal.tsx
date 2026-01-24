import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Constants, Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { CheckCircle, XCircle, Clock, Ban, Loader2 } from 'lucide-react';

type PhaseType = Database['public']['Enums']['phase_type'];
type ActivityStatus = Database['public']['Enums']['activity_status'];

const PHASES = Constants.public.Enums.phase_type;

interface ProspectWithStats {
  id: string;
  company_name: string;
  contact_name: string;
  current_phase: PhaseType | null;
  estimated_value: number | null;
  pending_activities: number;
  days_in_phase: number;
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
  const [newPhase, setNewPhase] = useState<PhaseType | null>(null);
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const updatePhase = useMutation({
    mutationFn: async ({ prospectId, phase }: { prospectId: string; phase: PhaseType }) => {
      const { error } = await supabase
        .from('prospects')
        .update({
          current_phase: phase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
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
    onOpenChange(false);
  };

  const handleMove = () => {
    if (!prospect || !newPhase) return;
    updatePhase.mutate({ prospectId: prospect.id, phase: newPhase });
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
      case 'completed':
        return 'COMPLETADA';
      case 'blocked':
        return 'BLOQUEADA';
      default:
        return 'PENDIENTE';
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prospect.company_name}</DialogTitle>
          <div className="text-sm text-muted-foreground">{prospect.contact_name}</div>
        </DialogHeader>

        <div className="space-y-4">
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
                onValueChange={(value) => setNewPhase(value as PhaseType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona fase" />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((phase) => (
                    <SelectItem key={phase} value={phase}>
                      {phase} {phase === prospect.current_phase && '(actual)'}
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
