import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calculator,
  RefreshCw,
  Receipt,
  MoreHorizontal,
  User,
  Edit,
  Trash2,
  Unlock,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EditActivityModal } from '@/components/activities/EditActivityModal';
import { Database } from '@/integrations/supabase/types';

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface ProspectActivitiesModalProps {
  prospect: {
    id: string;
    company_name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateActivity?: () => void;
}

const activityIcons: Record<string, React.ReactNode> = {
  'Llamada': <Phone className="h-4 w-4" />,
  'Correo': <Mail className="h-4 w-4" />,
  'Visita': <MapPin className="h-4 w-4" />,
  'Propuesta': <FileText className="h-4 w-4" />,
  'Cotización': <Calculator className="h-4 w-4" />,
  'Seguimiento': <RefreshCw className="h-4 w-4" />,
  'Facturación': <Receipt className="h-4 w-4" />,
  'Otro': <MoreHorizontal className="h-4 w-4" />,
};

export default function ProspectActivitiesModal({
  prospect,
  open,
  onOpenChange,
  onCreateActivity,
}: ProspectActivitiesModalProps) {
  const { isManager } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for actions
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [viewingActivity, setViewingActivity] = useState<any | null>(null);

  const { data: activities, isLoading } = useQuery({
    queryKey: ['prospect-activities', prospect?.id],
    queryFn: async () => {
      if (!prospect?.id) return [];

      // Get activities for this prospect
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('scheduled_date', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Get user profiles to map assigned_to -> full_name
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name');

      if (usersError) throw usersError;

      const userMap: Record<string, string> = {};
      userProfiles?.forEach(u => {
        userMap[u.id] = u.full_name;
      });

      // Map activities with user names
      return activitiesData?.map(a => ({
        ...a,
        assigned_user_name: a.assigned_to ? userMap[a.assigned_to] || null : null,
        prospects: { company_name: prospect.company_name, contact_name: '' },
      })) || [];
    },
    enabled: !!prospect?.id && open,
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Actividad eliminada',
        description: 'La actividad ha sido eliminada correctamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['prospect-activities', prospect?.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDeletingActivityId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la actividad.',
        variant: 'destructive',
      });
    },
  });

  const unblockActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'pending' as ActivityStatus,
          block_reason: null,
        })
        .eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Actividad desbloqueada',
        description: 'La actividad ha sido reactivada.',
      });
      queryClient.invalidateQueries({ queryKey: ['prospect-activities', prospect?.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo desbloquear la actividad.',
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'COMPLETADA';
      case 'blocked':
        return 'BLOQUEADA';
      default:
        return 'PENDIENTE';
    }
  };

  const getStatusVariant = (status: string | null): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'blocked':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!prospect) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📊 {prospect.company_name} - Historial
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100vh-140px)]">
          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activities?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay actividades registradas para este prospecto.
              </div>
            ) : (
              <div className="space-y-4">
                {activities?.map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      'border rounded-lg p-4 space-y-2',
                      activity.status === 'completed' && 'bg-primary/5 border-primary/30',
                      activity.status === 'blocked' && 'bg-destructive/5 border-destructive/30',
                      activity.status === 'pending' && 'bg-secondary/50 border-border'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(activity.status)}
                        <span className="font-medium">
                          {formatDate(activity.scheduled_date)}
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {activityIcons[activity.activity_type] || activityIcons['Otro']}
                          {activity.activity_type}
                          {activity.custom_type && ` - ${activity.custom_type}`}
                        </span>
                      </div>
                      <Badge variant={getStatusVariant(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>

                    {/* Notes or Completion Comment */}
                    {/* Notes */}
                    {activity.notes && activity.status !== 'completed' && (
                      <p className="text-sm text-muted-foreground pl-7">
                        "{activity.notes}"
                      </p>
                    )}

                    {/* Completion Comment (for completed activities) */}
                    {activity.status === 'completed' && activity.completion_comment && (
                      <div className="flex items-start gap-1 text-sm pl-7 bg-primary/10 rounded p-2 mt-1">
                        <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-primary">"{activity.completion_comment}"</span>
                      </div>
                    )}

                    {/* Block Reason (for blocked activities) */}
                    {activity.status === 'blocked' && activity.block_reason && (
                      <p className="text-sm text-destructive italic pl-7">
                        "{activity.block_reason}"
                      </p>
                    )}

                    {/* Assigned User */}
                    {activity.assigned_user_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pl-7">
                        <User className="h-3 w-3" />
                        {activity.status === 'completed' ? 'Completada por:' : 'Asignada a:'}
                        <span className="font-medium">{activity.assigned_user_name}</span>
                      </div>
                    )}

                    {/* Completed at */}
                    {activity.status === 'completed' && activity.completed_at && (
                      <div className="text-xs text-muted-foreground pl-7">
                        Completada el {formatDate(activity.completed_at)}
                      </div>
                    )}

                    {/* Action Buttons based on status */}
                    <div className="flex items-center gap-2 pl-7 pt-2">
                      {/* PENDING: Edit & Delete */}
                      {activity.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingActivity(activity)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingActivityId(activity.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </Button>
                        </>
                      )}

                      {/* BLOCKED: Unblock (managers only) */}
                      {activity.status === 'blocked' && isManager && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unblockActivityMutation.mutate(activity.id)}
                          disabled={unblockActivityMutation.isPending}
                        >
                          <Unlock className="h-3 w-3 mr-1" />
                          Desbloquear
                        </Button>
                      )}

                      {/* COMPLETED: View detail */}
                      {activity.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingActivity(activity)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver detalle
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="pt-4 border-t mt-4 flex gap-2">
            {onCreateActivity && (
              <Button onClick={onCreateActivity} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Actividad
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Edit Activity Modal */}
      {editingActivity && (
        <EditActivityModal
          open={!!editingActivity}
          onOpenChange={(open) => {
            if (!open) {
              setEditingActivity(null);
              queryClient.invalidateQueries({ queryKey: ['prospect-activities', prospect?.id] });
            }
          }}
          activity={editingActivity}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingActivityId} onOpenChange={(open) => !open && setDeletingActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La actividad será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingActivityId && deleteActivityMutation.mutate(deletingActivityId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Activity Detail Dialog */}
      <Dialog open={!!viewingActivity} onOpenChange={(open) => !open && setViewingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Detalle de Actividad Completada
            </DialogTitle>
          </DialogHeader>
          {viewingActivity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{viewingActivity.activity_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha programada:</span>
                  <p className="font-medium">{formatDate(viewingActivity.scheduled_date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha completada:</span>
                  <p className="font-medium">{viewingActivity.completed_at ? formatDate(viewingActivity.completed_at) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsable:</span>
                  <p className="font-medium">{viewingActivity.assigned_user_name || '-'}</p>
                </div>
              </div>
              
              {viewingActivity.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Descripción:</span>
                  <p className="mt-1">{viewingActivity.notes}</p>
                </div>
              )}
              
              {viewingActivity.completion_comment && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Comentario de completación:
                  </span>
                  <p className="mt-1 font-medium text-primary">{viewingActivity.completion_comment}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingActivity(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
