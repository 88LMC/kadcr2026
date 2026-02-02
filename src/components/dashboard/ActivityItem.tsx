import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Receipt, 
  Clock, 
  FileCheck, 
  MoreHorizontal,
  AlertCircle,
  Ban,
  Edit,
  CalendarIcon,
  UserCircle,
  AlertTriangle,
  Trash2,
  Users,
} from 'lucide-react';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { EditActivityModal } from '@/components/activities/EditActivityModal';
import { NextActivityPortal } from '@/components/activities/NextActivityPortal';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ActivityType = Database['public']['Enums']['activity_type'];
type ActivityStatus = Database['public']['Enums']['activity_status'];

interface ActivityItemProps {
  activity: {
    id: string;
    activity_type: ActivityType;
    custom_type?: string | null;
    scheduled_date: string;
    status: ActivityStatus | null;
    notes?: string | null;
    block_reason?: string | null;
    prospect_id?: string | null;
    assigned_to?: string | null;
    prospects: {
      company_name: string;
      contact_name: string;
    } | null;
  };
  variant?: 'urgent' | 'today' | 'new-call' | 'blocked';
  isManager?: boolean;
  onUnblock?: (id: string) => void;
}

const activityIcons: Record<ActivityType, typeof Phone> = {
  'Llamada': Phone,
  'Correo': Mail,
  'Visita': MapPin,
  'Propuesta': FileText,
  'Cotización': Receipt,
  'Seguimiento': Clock,
  'Facturación': FileCheck,
  'General': MoreHorizontal,
  'Otro': MoreHorizontal,
};

export function ActivityItem({ activity, variant = 'today', isManager: isManagerProp, onUnblock }: ActivityItemProps) {
  const { isManager: isAuthManager, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users } = useAllUsers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isHoveringDate, setIsHoveringDate] = useState(false);
  const [isHoveringUser, setIsHoveringUser] = useState(false);
  
  // NUEVO: Usar useRef en lugar de useState para evitar problemas de timing
  const showNextActivityModalRef = useRef(false);
  const completedActivityDataRef = useRef<{
    prospectId: string;
    prospectName: string;
    assignedTo: string | null;
  } | null>(null);
  
  // Estado solo para forzar re-render
  const [, setForceRender] = useState(0);

  // Use prop if provided, otherwise use auth context
  const isManager = isManagerProp !== undefined ? isManagerProp : isAuthManager;

  const Icon = activityIcons[activity.activity_type] || MoreHorizontal;

  // Get assigned user name
  const assignedUserName = users?.find(u => u.id === activity.assigned_to)?.full_name;
  
  const getDaysOverdue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(activity.scheduled_date);
    scheduled.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysOverdue = getDaysOverdue();

  // Quick date change mutation
  const updateDateMutation = useMutation({
    mutationFn: async (newDate: Date) => {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('activities')
        .update({ scheduled_date: dateStr })
        .eq('id', activity.id);
      if (error) throw error;

      // Log the change
      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action_type: 'update',
        entity_type: 'activity',
        entity_id: activity.id,
        details: {
          quick_action: 'change_date',
          from: activity.scheduled_date,
          to: dateStr,
          updated_by: 'manager',
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Fecha actualizada' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsDatePickerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cambiar la fecha', variant: 'destructive' });
    },
  });

  // Quick reassign mutation
  const reassignMutation = useMutation({
    mutationFn: async (newUserId: string) => {
      const { error } = await supabase
        .from('activities')
        .update({ assigned_to: newUserId })
        .eq('id', activity.id);
      if (error) throw error;

      const newUserName = users?.find(u => u.id === newUserId)?.full_name;
      
      // Log the change
      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action_type: 'update',
        entity_type: 'activity',
        entity_id: activity.id,
        details: {
          quick_action: 'reassign',
          from: activity.assigned_to,
          to: newUserId,
          to_name: newUserName,
          updated_by: 'manager',
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Actividad reasignada' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsUserSelectOpen(false);
      setShowReassignConfirm(false);
      setPendingUserId(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo reasignar', variant: 'destructive' });
    },
  });

  // Mark as urgent mutation (set date to yesterday)
  const markUrgentMutation = useMutation({
    mutationFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = format(yesterday, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('activities')
        .update({ scheduled_date: dateStr })
        .eq('id', activity.id);
      if (error) throw error;

      // Log the change
      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action_type: 'update',
        entity_type: 'activity',
        entity_id: activity.id,
        details: {
          quick_action: 'mark_urgent',
          from: activity.scheduled_date,
          to: dateStr,
          updated_by: 'manager',
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Marcada como urgente', description: 'La actividad aparecerá en "Urgente"' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo marcar como urgente', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Actividad eliminada' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowDeleteConfirm(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    },
  });

  const handleUserSelect = (userId: string) => {
    if (userId !== activity.assigned_to) {
      setPendingUserId(userId);
      setShowReassignConfirm(true);
    }
  };

  const confirmReassign = () => {
    if (pendingUserId) {
      reassignMutation.mutate(pendingUserId);
    }
  };

  // NUEVO: Manejar actividad completada con useRef
  const handleActivityCompleted = (data: { prospectId: string; prospectName: string; assignedTo: string | null }) => {
    console.log('🎉 Activity completed with prospect:', data);
    console.log('🔵 Setting refs and forcing render');
    
    // Usar refs en lugar de setState
    completedActivityDataRef.current = data;
    showNextActivityModalRef.current = true;
    
    console.log('🟢 Refs set:', {
      completedActivityData: completedActivityDataRef.current,
      showNextActivityModal: showNextActivityModalRef.current
    });
    
    // Forzar re-render
    setForceRender(prev => prev + 1);
    
    console.log('🟣 Force render triggered');
  };

  // NUEVO: Manejar siguiente actividad creada
  const handleNextActivityCreated = () => {
    console.log('✅ Next activity created');
    toast({
      title: 'Actividad completada',
      description: 'La actividad fue completada y la siguiente acción fue programada.',
    });
    
    showNextActivityModalRef.current = false;
    completedActivityDataRef.current = null;
    setForceRender(prev => prev + 1);
  };

  const getUrgencyColor = () => {
    if (variant !== 'urgent') return '';
    if (daysOverdue > 3) return 'border-l-4 border-l-destructive';
    if (daysOverdue >= 1) return 'border-l-4 border-l-warning';
    return '';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'urgent':
        return 'hover:bg-destructive/5';
      case 'new-call':
        return 'bg-primary/5 hover:bg-primary/10';
      case 'blocked':
        return 'bg-muted hover:bg-muted/80';
      default:
        return 'hover:bg-accent';
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return format(date, 'd-MMM', { locale: es });
  };

  console.log('🔍 ActivityItem render:', {
    showNextActivityModal: showNextActivityModalRef.current,
    hasCompletedData: !!completedActivityDataRef.current
  });

  const cardContent = (
    <Card 
      className={cn(
        'cursor-pointer transition-colors',
        getUrgencyColor(),
        getVariantStyles()
      )}
      onClick={() => variant !== 'blocked' && setIsModalOpen(true)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'rounded-lg p-2',
            variant === 'urgent' && daysOverdue > 3 ? 'bg-destructive/10' :
            variant === 'urgent' && daysOverdue >= 1 ? 'bg-warning/10' :
            variant === 'new-call' ? 'bg-primary/10' :
            variant === 'blocked' ? 'bg-blocked/10' :
            'bg-muted'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              variant === 'urgent' && daysOverdue > 3 ? 'text-destructive' :
              variant === 'urgent' && daysOverdue >= 1 ? 'text-warning' :
              variant === 'new-call' ? 'text-primary' :
              variant === 'blocked' ? 'text-blocked' :
              'text-muted-foreground'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium truncate">
                {activity.prospects?.company_name || 'Sin empresa'}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {activity.activity_type}
                {activity.custom_type && ` - ${activity.custom_type}`}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              {activity.prospects?.contact_name || 'Sin contacto'}
            </p>

            {activity.notes && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                {activity.notes}
              </p>
            )}

            {/* Date and User row with quick actions for managers */}
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {/* Quick Date Change */}
              {isManager ? (
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1 hover:text-primary transition-colors group"
                      onMouseEnter={() => setIsHoveringDate(true)}
                      onMouseLeave={() => setIsHoveringDate(false)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CalendarIcon className={cn(
                        'h-3 w-3 transition-opacity',
                        isHoveringDate ? 'opacity-100 text-primary' : 'opacity-50'
                      )} />
                      <span className="group-hover:underline">{formatDisplayDate(activity.scheduled_date)}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="start" onClick={(e) => e.stopPropagation()}>
                    <Calendar
                      mode="single"
                      selected={new Date(activity.scheduled_date + 'T12:00:00')}
                      onSelect={(date) => date && updateDateMutation.mutate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 opacity-50" />
                  {formatDisplayDate(activity.scheduled_date)}
                </span>
              )}

              {/* Quick User Reassign */}
              {assignedUserName && (
                isManager ? (
                  <Popover open={isUserSelectOpen} onOpenChange={setIsUserSelectOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1 hover:text-primary transition-colors group"
                        onMouseEnter={() => setIsHoveringUser(true)}
                        onMouseLeave={() => setIsHoveringUser(false)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserCircle className={cn(
                          'h-3 w-3 transition-opacity',
                          isHoveringUser ? 'opacity-100 text-primary' : 'opacity-50'
                        )} />
                        <span className="group-hover:underline">{assignedUserName}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2 bg-background" align="start" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Reasignar a:</p>
                        {users?.map((u) => (
                          <button
                            key={u.id}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                              u.id === activity.assigned_to && 'bg-accent font-medium'
                            )}
                            onClick={() => handleUserSelect(u.id)}
                          >
                            {u.full_name}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({u.role === 'manager' ? 'Manager' : 'Vendedor'})
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="flex items-center gap-1">
                    <UserCircle className="h-3 w-3 opacity-50" />
                    {assignedUserName}
                  </span>
                )
              )}
            </div>

            {variant === 'urgent' && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                <AlertCircle className={cn(
                  'h-4 w-4',
                  daysOverdue > 3 ? 'text-destructive' : 'text-warning'
                )} />
                <span className={cn(
                  daysOverdue > 3 ? 'text-destructive' : 'text-warning'
                )}>
                  Vencida hace {daysOverdue} día{daysOverdue !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {variant === 'blocked' && activity.block_reason && (
              <div className="mt-2 flex items-start gap-2">
                <Ban className="h-4 w-4 text-blocked mt-0.5" />
                <p className="text-sm text-blocked line-clamp-2">
                  {activity.block_reason}
                </p>
              </div>
            )}
          </div>

          {/* Edit button for managers */}
          {isManager && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
              title="Editar actividad"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}

          {variant === 'blocked' && isManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUnblock?.(activity.id);
              }}
            >
              Desbloquear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Context Menu for managers */}
      {isManager ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {cardContent}
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48 bg-background">
            <ContextMenuItem
              onClick={() => markUrgentMutation.mutate()}
              disabled={variant === 'urgent'}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
              Marcar como urgente
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setIsDatePickerOpen(true)}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Cambiar fecha
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setIsUserSelectOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Reasignar
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setIsEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar completo
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        cardContent
      )}

      {variant !== 'blocked' && (
        <ActivityModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          activity={activity}
          onActivityCompleted={handleActivityCompleted}
        />
      )}

      {isManager && (
        <EditActivityModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          activity={activity}
        />
      )}

      {/* NUEVO: NextActivityPortal renderizado FUERA del ActivityModal usando refs */}
      {showNextActivityModalRef.current && completedActivityDataRef.current && (
        <NextActivityPortal
          isOpen={showNextActivityModalRef.current}
          prospectId={completedActivityDataRef.current.prospectId}
          prospectName={completedActivityDataRef.current.prospectName}
          assignedTo={completedActivityDataRef.current.assignedTo}
          onComplete={handleNextActivityCreated}
        />
      )}

      {/* Reassign Confirmation */}
      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reasignar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              La actividad será asignada a {users?.find(u => u.id === pendingUserId)?.full_name}. 
              El usuario actual ya no podrá verla en su dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUserId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReassign}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
              onClick={() => deleteMutation.mutate()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
