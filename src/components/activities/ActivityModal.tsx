import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Ban, Loader2 } from 'lucide-react';
import { useCompleteActivity, useBlockActivity, useNotCompleteActivity } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: {
    id: string;
    activity_type: ActivityType;
    custom_type?: string | null;
    scheduled_date: string;
    notes?: string | null;
    prospect_id?: string | null;
    assigned_to?: string | null;
    prospects: {
      company_name: string;
      contact_name: string;
    } | null;
  };
  onActivityCompleted?: (data: { prospectId: string; prospectName: string; assignedTo: string | null }) => void;
}

type ModalState = 'buttons' | 'complete' | 'not-complete' | 'block';

export function ActivityModal({ open, onOpenChange, activity, onActivityCompleted }: ActivityModalProps) {
  const [modalState, setModalState] = useState<ModalState>('buttons');
  const [comment, setComment] = useState('');
  
  const { toast } = useToast();
  const completeActivity = useCompleteActivity();
  const notCompleteActivity = useNotCompleteActivity();
  const blockActivity = useBlockActivity();

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setModalState('buttons');
        setComment('');
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const isGeneralActivity = !activity.prospect_id;
  const minCommentLength = 10;

  const validateComment = () => {
    if (!comment.trim() || comment.trim().length < minCommentLength) {
      toast({
        title: 'Error',
        description: `Por favor escribe un comentario de al menos ${minCommentLength} caracteres.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!validateComment()) return;

    const originalProspectId = activity?.prospect_id;
    const originalProspectName = activity?.prospects?.company_name;
    const originalAssignedTo = activity?.assigned_to;

    try {
      await completeActivity.mutateAsync({
        activityId: activity.id,
        comment: comment.trim(),
      });

      if (!originalProspectId) {
        toast({
          title: 'Actividad completada',
          description: 'La tarea general fue completada.',
        });
        onOpenChange(false);
      } else {
        // Notificar al padre que se completó con prospecto
        onActivityCompleted?.({
          prospectId: originalProspectId,
          prospectName: originalProspectName || "Cliente",
          assignedTo: originalAssignedTo || null
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || "Error al completar la actividad",
        variant: 'destructive',
      });
    }
  };

  const handleNotComplete = async () => {
    if (!validateComment()) return;

    try {
      await notCompleteActivity.mutateAsync({
        activityId: activity.id,
        comment: comment.trim(),
      });
      
      toast({
        title: 'Comentario guardado',
        description: 'La actividad permanece pendiente y aparecerá en URGENTE mañana.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el comentario.',
        variant: 'destructive',
      });
    }
  };

  const handleBlock = async () => {
    if (!validateComment()) return;

    try {
      await blockActivity.mutateAsync({
        activityId: activity.id,
        blockReason: comment.trim(),
      });
      toast({
        title: 'Actividad bloqueada',
        description: 'La actividad ha sido marcada como bloqueada.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo bloquear la actividad.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = completeActivity.isPending || blockActivity.isPending || notCompleteActivity.isPending;

  const getStateContent = () => {
    switch (modalState) {
      case 'complete':
        return {
          title: '✅ Actividad Completada',
          label: '¿Qué lograste? (obligatorio)',
          placeholder: 'Ej: "Cliente aceptó cotización, enviaré contrato mañana"',
          examples: [
            'Cliente aceptó cotización, enviaré contrato mañana',
            'Reunión exitosa, definimos 3 opciones de uniformes',
            'Factura #1234 depositada en Banco Nacional',
          ],
          onSubmit: handleComplete,
          submitText: 'Guardar y Continuar',
          isPending: completeActivity.isPending,
        };
      case 'not-complete':
        return {
          title: '❌ Actividad NO Completada',
          label: '¿Por qué no se completó? (obligatorio)',
          placeholder: 'Ej: "Cliente no contestó el teléfono"',
          examples: [
            'Cliente no contestó el teléfono',
            'No tuve tiempo, muchas urgencias',
            'Faltó información del cliente',
            'Se me olvidó por otra prioridad',
          ],
          note: 'La actividad permanecerá PENDIENTE y aparecerá en URGENTE mañana.',
          onSubmit: handleNotComplete,
          submitText: 'Guardar',
          isPending: notCompleteActivity.isPending,
        };
      case 'block':
        return {
          title: '🚫 Actividad Bloqueada',
          label: 'Describe el bloqueo: (obligatorio)',
          placeholder: 'Ej: "Cliente de vacaciones hasta 15-feb"',
          examples: [
            'Cliente de vacaciones hasta 15-feb',
            'Esperando aprobación gerente compras',
            'Sin presupuesto hasta Q2',
            'Falta firma del contrato por legal',
          ],
          onSubmit: handleBlock,
          submitText: 'Guardar Bloqueo',
          isPending: blockActivity.isPending,
          variant: 'destructive' as const,
        };
      default:
        return null;
    }
  };

  const stateContent = getStateContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {modalState === 'buttons' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Completaste esta actividad?</DialogTitle>
              <DialogDescription>
                <span className="font-medium">
                  {isGeneralActivity ? 'TAREA GENERAL' : activity.prospects?.company_name}
                </span>
                <br />
                {activity.activity_type}
                {activity.custom_type && ` - ${activity.custom_type}`}
                {!isGeneralActivity && activity.prospects?.contact_name && (
                  <>
                    <br />
                    {activity.prospects.contact_name}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {activity.notes && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">{activity.notes}</p>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="default"
                className="flex-1 bg-success hover:bg-success/90"
                onClick={() => setModalState('complete')}
                disabled={isLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                SÍ
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setModalState('not-complete')}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                NO
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setModalState('block')}
                disabled={isLoading}
              >
                <Ban className="mr-2 h-4 w-4" />
                BLOQUEADA
              </Button>
            </DialogFooter>
          </>
        ) : stateContent && (
          <>
            <DialogHeader>
              <DialogTitle>{stateContent.title}</DialogTitle>
              <DialogDescription>
                <span className="font-medium">
                  {isGeneralActivity ? 'TAREA GENERAL' : activity.prospects?.company_name}
                </span>
                {' - '}
                {activity.activity_type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{stateContent.label}</Label>
                <Textarea
                  placeholder={stateContent.placeholder}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo {minCommentLength} caracteres ({comment.trim().length}/{minCommentLength})
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Ejemplos:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {stateContent.examples.map((example, i) => (
                    <li key={i}>• "{example}"</li>
                  ))}
                  </ul>
              </div>

              {stateContent.note && (
                <p className="text-sm text-muted-foreground bg-warning/10 p-2 rounded">
                  {stateContent.note}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setModalState('buttons');
                  setComment('');
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant={stateContent.variant || 'default'}
                className="flex-1"
                onClick={stateContent.onSubmit}
                disabled={isLoading || comment.trim().length < minCommentLength}
              >
                {stateContent.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {stateContent.submitText}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
