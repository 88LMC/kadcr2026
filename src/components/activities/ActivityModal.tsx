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
import { NextActivityPortal } from './NextActivityPortal';
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

interface CompletedActivityData {
  prospectId: string;
  prospectName: string;
  assignedTo: string | null;
}

export function ActivityModal({ open, onOpenChange, activity }: ActivityModalProps) {
  const [modalState, setModalState] = useState<ModalState>('buttons');
  const [comment, setComment] = useState('');
  const [showNextActivityModal, setShowNextActivityModal] = useState(false);
  const [completedData, setCompletedData] = useState<CompletedActivityData | null>(null);
  
  const { toast } = useToast();
  const completeActivity = useCompleteActivity();
  const notCompleteActivity = useNotCompleteActivity();
  const blockActivity = useBlockActivity();

  useEffect(() => {
    console.log('=== STATE CHANGE ===');
    console.log('showNextActivityModal:', showNextActivityModal);
    console.log('completedData:', completedData);
  }, [showNextActivityModal, completedData]);

  useEffect(() => {
    console.log('=== RESET EFFECT ===');
    console.log('open:', open);
    console.log('showNextActivityModal:', showNextActivityModal);
    console.log('completedData:', completedData);
    
    // CRÍTICO: NO resetear si showNextActivityModal está true O si hay completedData
    if (!open && !showNextActivityModal && !completedData) {
      console.log('Both modals closed AND no data, will reset state in 2 seconds');
      const timeout = setTimeout(() => {
        console.log('Resetting state now');
        setModalState('buttons');
        setComment('');
        setCompletedData(null);
      }, 2000); // AUMENTADO a 2 segundos
      return () => clearTimeout(timeout);
    } else {
      console.log('NOT resetting because:', {
        open,
        showNextActivityModal,
        hasCompletedData: !!completedData
      });
    }
  }, [open, showNextActivityModal, completedData]);

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
    console.log('=== handleComplete CALLED ===');
    
    if (!validateComment()) return;

    const originalProspectId = activity?.prospect_id;
    const originalProspectName = activity?.prospects?.company_name;
    const originalAssignedTo = activity?.assigned_to;

    console.log('=== BEFORE COMPLETE ===');
    console.log('Original prospect_id:', originalProspectId);
    console.log('Original prospect_name:', originalProspectName);

    try {
      // CRÍTICO: Ejecutar mutación SIN await para no bloquear
      const mutationPromise = completeActivity.mutateAsync({
        activityId: activity.id,
        comment: comment.trim(),
      });

      console.log('=== MUTATION STARTED (not awaited) ===');

      // Configurar modal inmediatamente (sin esperar la mutación)
      if (originalProspectId) {
        console.log('=== SETTING UP NEXT MODAL ===');
        
        const dataToPreserve = {
          prospectId: originalProspectId,
          prospectName: originalProspectName || "Cliente",
          assignedTo: originalAssignedTo || null
        };
        
        console.log('Data to preserve:', dataToPreserve);
        setCompletedData(dataToPreserve);
        
        console.log('Waiting 200ms for state to solidify...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setShowNextActivityModal(true);
        
        console.log('Modal state set to TRUE');
        console.log('Waiting another 200ms...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('State should be stable now');
      }

      // AHORA sí esperamos la mutación (pero el modal ya está configurado)
      await mutationPromise;

      console.log('=== AFTER COMPLETE MUTATION ===');

      if (!originalProspectId) {
        console.log('=== NO PROSPECT - CLOSING ===');
        toast({
          title: 'Actividad completada',
          description: 'La tarea general fue completada.',
        });
        handleClose();
      } else {
        console.log('=== HAS PROSPECT - Modal should be visible ===');
      }
    } catch (error: any) {
      console.error('=== ERROR ===', error);
      // Si hay error, resetear todo
      setShowNextActivityModal(false);
      setCompletedData(null);
      toast({
        title: 'Error',
        description: error.message || "Error al completar la actividad",
        variant: 'destructive',
      });
    }
  };

  const handleNextActivityCreated = () => {
    console.log('=== NEXT ACTIVITY CREATED ===');
    toast({
      title: 'Actividad completada',
      description: 'La actividad fue completada y la siguiente acción fue programada.',
    });
    
    setShowNextActivityModal(false);
    setCompletedData(null);
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
    console.log('🔒 handleClose called');
    console.log('showNextActivityModal:', showNextActivityModal);
    console.log('completedData:', completedData);
    
    // Solo cerrar si no hay modal de siguiente activo
    if (showNextActivityModal || completedData) {
      console.log('🚫 Not closing - next modal active');
      return;
    }
    
    console.log('✅ Closing modal');
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

  const handleDialogClose = (newOpen: boolean) => {
    console.log('🔒 handleDialogClose called:', { 
      newOpen, 
      showNextActivityModal, 
      completedData: !!completedData,
      willBlock: showNextActivityModal || !!completedData
    });
    
    // CRÍTICO: NO permitir cerrar si el modal de siguiente está activo
    if (showNextActivityModal || completedData) {
      console.log('🚫 BLOCKING CLOSE - Next modal is active');
      // NO llamar onOpenChange aquí - evitar que el padre se entere del cierre
      return;
    }
    
    if (!newOpen) {
      console.log('✅ Allowing close');
      handleClose();
    }
  };

  console.log('=== RENDER ===');
  console.log('open:', open);
  console.log('showNextActivityModal:', showNextActivityModal);
  console.log('completedData:', completedData);
  console.log('Will render NextActivityPortal:', !!completedData && !!completedData.prospectId && showNextActivityModal);

  return (
    <>
      <Dialog 
        open={(open && !showNextActivityModal) || showNextActivityModal} 
        onOpenChange={handleDialogClose}
      >
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
                    console.log('🔵 CANCEL CLICKED');
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
                  onClick={() => {
                    console.log('🔴 SUBMIT BUTTON CLICKED');
                    console.log('modalState:', modalState);
                    console.log('stateContent:', stateContent);
                    console.log('onSubmit function:', stateContent.onSubmit);
                    console.log('comment:', comment);
                    console.log('Calling onSubmit now...');
                    stateContent.onSubmit();
                  }}
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

      {completedData && completedData.prospectId && (
        <NextActivityPortal
          isOpen={showNextActivityModal}
          prospectId={completedData.prospectId}
          prospectName={completedData.prospectName}
          assignedTo={completedData.assignedTo}
          onComplete={handleNextActivityCreated}
        />
      )}
    </>
  );
}
