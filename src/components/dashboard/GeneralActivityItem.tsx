import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  AlertCircle,
} from 'lucide-react';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];
type ActivityStatus = Database['public']['Enums']['activity_status'];

interface GeneralActivityItemProps {
  activity: {
    id: string;
    activity_type: ActivityType;
    custom_type?: string | null;
    scheduled_date: string;
    status: ActivityStatus | null;
    notes?: string | null;
    prospect_id?: string | null;
  };
}

export function GeneralActivityItem({ activity }: GeneralActivityItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getDaysOverdue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(activity.scheduled_date);
    scheduled.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysOverdue = getDaysOverdue();
  const isOverdue = daysOverdue > 0;

  const getUrgencyColor = () => {
    if (!isOverdue) return '';
    if (daysOverdue > 3) return 'border-l-4 border-l-destructive';
    if (daysOverdue >= 1) return 'border-l-4 border-l-warning';
    return '';
  };

  // Format activity for the modal
  const activityForModal = {
    ...activity,
    prospects: null, // General activities don't have prospects
  };

  return (
    <>
      <Card 
        className={cn(
          'cursor-pointer transition-colors hover:bg-accent',
          getUrgencyColor()
        )}
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'rounded-lg p-2',
              isOverdue && daysOverdue > 3 ? 'bg-destructive/10' :
              isOverdue && daysOverdue >= 1 ? 'bg-warning/10' :
              'bg-muted'
            )}>
              <ClipboardList className={cn(
                'h-5 w-5',
                isOverdue && daysOverdue > 3 ? 'text-destructive' :
                isOverdue && daysOverdue >= 1 ? 'text-warning' :
                'text-muted-foreground'
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-muted-foreground">
                  TAREA GENERAL
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {activity.activity_type}
                  {activity.custom_type && ` - ${activity.custom_type}`}
                </Badge>
              </div>
              
              {activity.notes && (
                <p className="mt-1 text-sm line-clamp-2">
                  {activity.notes}
                </p>
              )}

              {isOverdue && (
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
            </div>
          </div>
        </CardContent>
      </Card>

      <ActivityModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        activity={activityForModal}
      />
    </>
  );
}
