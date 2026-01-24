import { useState } from 'react';
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
import { useCompleteActivity, useBlockActivity } from '@/hooks/useActivities';
import { NextActivityModal } from './NextActivityModal';
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
    prospects: {
      company_name: string;
      contact_name: string;
    } | null;
  };
}

export function ActivityModal({ open, onOpenChange, activity }: ActivityModalProps) {
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showNextActivityModal, setShowNextActivityModal] = useState(false);
  
  const { toast } = useToast();
  const completeActivity = useCompleteActivity();
  const blockActivity = useBlockActivity();

  const handleComplete = async () => {
    try {
      await completeActivity.mutateAsync(activity.id);
      toast({
        title: 'Actividad completada',
        description: 'Ahora programa la siguiente acción.',
      });
      onOpenChange(false);
      setShowNextActivityModal(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo completar la actividad.',
        variant: 'destructive',
      });
    }
  };

  const handleNo = () => {
    onOpenChange(false);
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor describe el motivo del bloqueo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await blockActivity.mutateAsync({
        activityId: activity.id,
        blockReason: blockReason.trim(),
      });
      toast({
        title: 'Actividad bloqueada',
        description: 'La actividad ha sido marcada como bloqueada.',
      });
      onOpenChange(false);
      setShowBlockInput(false);
      setBlockReason('');
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
    setShowBlockInput(false);
    setBlockReason('');
  };

  const isLoading = completeActivity.isPending || blockActivity.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activity.activity_type}
              {activity.custom_type && ` - ${activity.custom_type}`}
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{activity.prospects?.company_name}</span>
              <br />
              {activity.prospects?.contact_name}
            </DialogDescription>
          </DialogHeader>

          {activity.notes && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">{activity.notes}</p>
            </div>
          )}

          {showBlockInput ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="block-reason">
                  ¿Por qué está bloqueada esta actividad?
                </Label>
                <Textarea
                  id="block-reason"
                  placeholder="Describe el motivo del bloqueo..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowBlockInput(false);
                    setBlockReason('');
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleBlock}
                  disabled={isLoading || !blockReason.trim()}
                >
                  {blockActivity.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Confirmar Bloqueo
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="default"
                className="flex-1 bg-success hover:bg-success/90"
                onClick={handleComplete}
                disabled={isLoading}
              >
                {completeActivity.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                SÍ
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleNo}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                NO
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowBlockInput(true)}
                disabled={isLoading}
              >
                <Ban className="mr-2 h-4 w-4" />
                BLOQUEADA
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <NextActivityModal
        open={showNextActivityModal}
        onOpenChange={setShowNextActivityModal}
        prospectId={activity.prospects ? undefined : undefined}
        prospectName={activity.prospects?.company_name || ''}
        // We need to pass the prospect_id, but we don't have it directly
        // So we'll fetch it from the activity
        activity={activity}
      />
    </>
  );
}