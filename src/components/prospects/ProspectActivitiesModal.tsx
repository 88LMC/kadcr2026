import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      })) || [];
    },
    enabled: !!prospect?.id && open,
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
                    {(activity.completion_comment || activity.notes || activity.block_reason) && (
                      <p className="text-sm text-muted-foreground italic pl-7">
                        "{activity.completion_comment || activity.block_reason || activity.notes}"
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
    </Sheet>
  );
}
