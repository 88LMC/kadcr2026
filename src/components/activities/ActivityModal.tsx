import { useState, useEffect, useRef } from 'react';
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
import { MandatoryNextActivityModal } from './MandatoryNextActivityModal';
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
}

type ModalState = 'buttons' | 'complete' | 'not-complete' | 'block';

// Data to preserve for next activity modal
interface CompletedActivityData {
  prospectId: string;
  prospectName: string;
  assignedTo: string | null;
}

export function ActivityModal({ open, onOpenChange, activity }: ActivityModalProps) {
  const [modalState, setModalState] = useState<ModalState>('buttons');
  const [comment, setComment] = useState('');
  const [showNextActivityModal, setShowNextActivityModal] = useState(false);
  // Preserve completed activity data in a ref to survive re-renders
  const completedDataRef = useRef<CompletedActivityData | null>(null);
  
  const { toast } = useToast();
  const completeActivity = useCompleteActivity();
  const notCompleteActivity = useNotCompleteActivity();
  const blockActivity = useBlockActivity();

  // Debug: track state changes
  useEffect(() => {
    console.log('=== STATE CHANGE ===');
    console.log('showNextActivityModal:', showNextActivityModal);
    console.log('completedDataRef.current:', completedDataRef.current);
  }, [showNextActivityModal]);

  // Reset state when modal fully closes (not showing next activity modal)
  useEffect(() => {
    if (!open && !showNextActivityModal) {
      console.log('Modal fully closed, resetting all state');
      const timeout = setTimeout(() => {
        setModalState('buttons');
        setComment('');
        completedDataRef.current = null;
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, showNextActivityModal]);

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

    console.log('handleComplete called');
    console.log('Activity:', activity);
    console.log('Has prospect_id:', !!activity.prospect_id);
    console.log('Is general activity:', isGeneralActivity);

    // CRITICAL: Preserve activity data BEFORE the mutation changes anything
    if (activity.prospect_id) {
      completedDataRef.current = {
        prospectId: activity.prospect_id,
        prospectName: activity.prospects?.company_name || '',
        assignedTo: activity.assigned_to || null,
      };
      console.log('Preserved activity data:', completedDataRef.current);
    }

    try {
      const result = await completeActivity.mutateAsync({
        activityId: activity.id,
        comment: comment.trim(),
      });
      
      console.log('Complete mutation result:', result);
      
      // If it's a prospect activity, show mandatory next activity modal
      if (completedDataRef.current) {
        console.log('=== NEXT ACTIVITY MODAL TRIGGER ===');
        console.log('Using preserved data:', completedDataRef.current);
        console.log('Setting showNextActivityModal to true');
        setShowNextActivityModal(true);
        // DON'T close the modal - we'll hide it and show the next activity modal
      } else {
        // General task - just close everything
        console.log('General task completed, closing modal');
        toast({
          title: 'Actividad completada',
          description: 'La tarea ha sido marcada como completada.',
        });
        handleClose();
      }
    } catch (error) {
      console.error('Error completing activity:', error);
      completedDataRef.current = null; // Clear on error
      toast({
        title: 'Error',
        description: 'No se pudo completar la actividad.',
        variant: 'destructive',
      });
    }
  };

  const handleNextActivityCreated = () => {
    console.log('Next activity created, closing all modals');
    toast({
      title: 'Actividad completada',
      description: 'La actividad fue completada y la siguiente acción fue programada.',
    });
    // Reset all states and close
    setShowNextActivityModal(false);
    completedDataRef.current = null;
    setModalState('buttons');
    setComment('');
    onOpenChange(false);
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
      
      handleClose();
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
      handleClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo bloquear la actividad.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setModalState('buttons');
    setComment('');
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

  // Don't allow closing the modal if we're in the next activity flow
  const handleDialogClose = (newOpen: boolean) => {
    if (showNextActivityModal) {
      // Don't close while showing next activity modal
      console.log('Preventing close - next activity modal is open');
      return;
    }
    if (!newOpen) {
      handleClose();
    }
  };

  // Debug render state
  console.log('=== ACTIVITY MODAL RENDER ===');
  console.log('open:', open);
  console.log('showNextActivityModal:', showNextActivityModal);
  console.log('activity.prospect_id:', activity?.prospect_id);
  console.log('Main dialog open state:', open && !showNextActivityModal);

  return (
    <>
      {/* Hide the main dialog when showing the next activity modal */}
      <Dialog open={open && !showNextActivityModal} onOpenChange={handleDialogClose}>
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

      {/* Render MandatoryNextActivityModal using preserved data from ref */}
      {showNextActivityModal && completedDataRef.current && (
        <>
          {console.log('=== RENDERING MANDATORY MODAL ===', {
            showNextActivityModal,
            completedData: completedDataRef.current,
          })}
          <MandatoryNextActivityModal
            open={showNextActivityModal}
            prospectId={completedDataRef.current.prospectId}
            prospectName={completedDataRef.current.prospectName}
            assignedTo={completedDataRef.current.assignedTo}
            onActivityCreated={handleNextActivityCreated}
          />
        </>
      )}
    </>
  );
}
