import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Ban
} from 'lucide-react';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

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

export function ActivityItem({ activity, variant = 'today', isManager, onUnblock }: ActivityItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const Icon = activityIcons[activity.activity_type] || MoreHorizontal;
  
  const getDaysOverdue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(activity.scheduled_date);
    scheduled.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysOverdue = getDaysOverdue();

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

  return (
    <>
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

      {variant !== 'blocked' && (
        <ActivityModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          activity={activity}
        />
      )}
    </>
  );
}