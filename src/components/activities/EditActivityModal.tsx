import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Edit, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];
type ActivityStatus = Database['public']['Enums']['activity_status'];

const activityTypes: ActivityType[] = [
  'Llamada',
  'Correo',
  'Visita',
  'Seguimiento',
  'Propuesta',
  'Cotización',
  'Facturación',
  'General',
  'Otro',
];

const activityStatuses: { value: ActivityStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'completed', label: 'Completada' },
];

interface EditActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: {
    id: string;
    activity_type: ActivityType;
    custom_type?: string | null;
    scheduled_date: string;
    status: ActivityStatus | null;
    notes?: string | null;
    assigned_to?: string | null;
    prospect_id?: string | null;
    prospects?: {
      company_name: string;
      contact_name: string;
    } | null;
  };
}

export function EditActivityModal({ open, onOpenChange, activity }: EditActivityModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users } = useAllUsers();

  // Form state
  const [activityType, setActivityType] = useState<ActivityType>(activity.activity_type);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    new Date(activity.scheduled_date + 'T12:00:00')
  );
  const [status, setStatus] = useState<ActivityStatus>(activity.status || 'pending');
  const [assignedTo, setAssignedTo] = useState<string>(activity.assigned_to || '');
  const [notes, setNotes] = useState(activity.notes || '');

  // For status changes that require additional input
  const [completionComment, setCompletionComment] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Confirmation dialogs
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [pendingAssignTo, setPendingAssignTo] = useState<string | null>(null);

  // Track original values for comparison
  const originalAssignedTo = activity.assigned_to;
  const originalStatus = activity.status;
  const originalScheduledDate = activity.scheduled_date;

  // Reset form when activity changes
  useEffect(() => {
    setActivityType(activity.activity_type);
    setScheduledDate(new Date(activity.scheduled_date + 'T12:00:00'));
    setStatus(activity.status || 'pending');
    setAssignedTo(activity.assigned_to || '');
    setNotes(activity.notes || '');
    setCompletionComment('');
    setBlockReason('');
  }, [activity]);

  const updateActivityMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields for status changes
      if (status === 'completed' && originalStatus !== 'completed' && completionComment.length < 10) {
        throw new Error('El comentario de completación debe tener al menos 10 caracteres');
      }
      if (status === 'blocked' && originalStatus !== 'blocked' && blockReason.length < 10) {
        throw new Error('La razón de bloqueo debe tener al menos 10 caracteres');
      }

      // Validate date is not in past (unless it was already in past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const originalDate = new Date(originalScheduledDate);
      originalDate.setHours(0, 0, 0, 0);
      
      if (scheduledDate) {
        const selectedDate = new Date(scheduledDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today && originalDate >= today) {
          throw new Error('La fecha no puede ser en el pasado');
        }
      }

      const updateData: Record<string, unknown> = {
        activity_type: activityType,
        scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : activity.scheduled_date,
        status: status,
        assigned_to: assignedTo || null,
        notes: notes,
      };

      // Add completion fields if status changed to completed
      if (status === 'completed' && originalStatus !== 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completion_comment = completionComment;
      }

      // Add block fields if status changed to blocked
      if (status === 'blocked' && originalStatus !== 'blocked') {
        updateData.block_reason = blockReason;
        updateData.completion_comment = blockReason;
      }

      // Clear block reason if unblocking
      if (status === 'pending' && originalStatus === 'blocked') {
        updateData.block_reason = null;
      }

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activity.id);

      if (error) throw error;

      // Log the update (trigger handles it, but we add extra context)
      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action_type: 'update',
        entity_type: 'activity',
        entity_id: activity.id,
        details: {
          changes: {
            activity_type: activityType !== activity.activity_type ? { from: activity.activity_type, to: activityType } : undefined,
            scheduled_date: scheduledDate && format(scheduledDate, 'yyyy-MM-dd') !== activity.scheduled_date
              ? { from: activity.scheduled_date, to: format(scheduledDate, 'yyyy-MM-dd') }
              : undefined,
            status: status !== originalStatus ? { from: originalStatus, to: status } : undefined,
            assigned_to: assignedTo !== originalAssignedTo ? { from: originalAssignedTo, to: assignedTo } : undefined,
          },
          updated_by: 'manager',
          prospect_name: activity.prospects?.company_name,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Actividad actualizada',
        description: 'Los cambios se guardaron correctamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la actividad.',
        variant: 'destructive',
      });
    },
  });

  const handleAssignedToChange = (newValue: string) => {
    if (newValue !== originalAssignedTo && originalAssignedTo) {
      setPendingAssignTo(newValue);
      setShowReassignConfirm(true);
    } else {
      setAssignedTo(newValue);
    }
  };

  const confirmReassign = () => {
    if (pendingAssignTo !== null) {
      setAssignedTo(pendingAssignTo);
    }
    setPendingAssignTo(null);
    setShowReassignConfirm(false);
  };

  const cancelReassign = () => {
    setPendingAssignTo(null);
    setShowReassignConfirm(false);
  };

  const handleSave = () => {
    updateActivityMutation.mutate();
  };

  const showCompletionInput = status === 'completed' && originalStatus !== 'completed';
  const showBlockInput = status === 'blocked' && originalStatus !== 'blocked';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Actividad
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Prospect Info (Read-only) */}
            {activity.prospects && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span>Prospecto</span>
                </div>
                <p className="font-medium">{activity.prospects.company_name}</p>
                <p className="text-sm text-muted-foreground">{activity.prospects.contact_name}</p>
              </div>
            )}

            {/* Activity Type */}
            <div className="space-y-2">
              <Label>Tipo de actividad</Label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {activityStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Completion Comment (if changing to completed) */}
            {showCompletionInput && (
              <div className="space-y-2">
                <Label className="text-primary">
                  Comentario de completación *
                </Label>
                <Textarea
                  placeholder="Describe qué se logró (mínimo 10 caracteres)"
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {completionComment.length}/10 caracteres mínimo
                </p>
              </div>
            )}

            {/* Block Reason (if changing to blocked) */}
            {showBlockInput && (
              <div className="space-y-2">
                <Label className="text-destructive">
                  Razón de bloqueo *
                </Label>
                <Textarea
                  placeholder="Explica por qué se bloquea (mínimo 10 caracteres)"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {blockReason.length}/10 caracteres mínimo
                </p>
              </div>
            )}

            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Asignado a</Label>
              <Select value={assignedTo} onValueChange={handleAssignedToChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.role === 'manager' ? 'Manager' : 'Vendedor'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Descripción / Notas</Label>
              <Textarea
                placeholder="Notas sobre la actividad"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                updateActivityMutation.isPending ||
                (showCompletionInput && completionComment.length < 10) ||
                (showBlockInput && blockReason.length < 10)
              }
            >
              {updateActivityMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Confirmation Dialog */}
      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reasignar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta actividad será reasignada a otro usuario. El usuario original ya no podrá verla en su dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReassign}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReassign}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
