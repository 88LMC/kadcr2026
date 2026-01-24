import { useEffect } from 'react';
import { AlertCircle, CalendarCheck, Phone, Ban } from 'lucide-react';
import { MetricsBar } from '@/components/dashboard/MetricsBar';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ActivityItem } from '@/components/dashboard/ActivityItem';
import { 
  useUrgentActivities, 
  useTodayActivities, 
  useNewCallsActivities,
  useBlockedActivities,
  useGenerateDailyCalls,
  useUnblockActivity,
} from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { isManager } = useAuth();
  const { toast } = useToast();
  
  const { data: urgentActivities, isLoading: isLoadingUrgent } = useUrgentActivities();
  const { data: todayActivities, isLoading: isLoadingToday } = useTodayActivities();
  const { data: newCallsActivities, isLoading: isLoadingCalls } = useNewCallsActivities();
  const { data: blockedActivities, isLoading: isLoadingBlocked } = useBlockedActivities();
  
  const generateDailyCalls = useGenerateDailyCalls();
  const unblockActivity = useUnblockActivity();

  // Generate daily calls on mount
  useEffect(() => {
    generateDailyCalls.mutate();
  }, []);

  const handleUnblock = async (activityId: string) => {
    try {
      await unblockActivity.mutateAsync(activityId);
      toast({
        title: 'Actividad desbloqueada',
        description: 'La actividad ha sido reactivada.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desbloquear la actividad.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <MetricsBar />

      {/* Dashboard Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Section */}
        <DashboardSection
          title="Urgente"
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          count={urgentActivities?.length || 0}
          variant="urgent"
          isLoading={isLoadingUrgent}
          isEmpty={!urgentActivities?.length}
          emptyMessage="¡Excelente! No tienes actividades vencidas"
        >
          {urgentActivities?.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              variant="urgent"
            />
          ))}
        </DashboardSection>

        {/* Today Section */}
        <DashboardSection
          title="Hoy"
          icon={<CalendarCheck className="h-5 w-5 text-warning" />}
          count={todayActivities?.length || 0}
          variant="today"
          isLoading={isLoadingToday}
          isEmpty={!todayActivities?.length}
          emptyMessage="No tienes actividades programadas para hoy"
        >
          {todayActivities?.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              variant="today"
            />
          ))}
        </DashboardSection>

        {/* New Calls Section */}
        <DashboardSection
          title="Llamadas Nuevas Obligatorias"
          icon={<Phone className="h-5 w-5 text-primary" />}
          count={newCallsActivities?.length || 0}
          variant="new-call"
          isLoading={isLoadingCalls}
          isEmpty={!newCallsActivities?.length}
          emptyMessage="No hay llamadas nuevas asignadas"
        >
          {newCallsActivities?.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              variant="new-call"
            />
          ))}
        </DashboardSection>

        {/* Blocked Section */}
        <DashboardSection
          title="Bloqueados"
          icon={<Ban className="h-5 w-5 text-blocked" />}
          count={blockedActivities?.length || 0}
          variant="blocked"
          isLoading={isLoadingBlocked}
          isEmpty={!blockedActivities?.length}
          emptyMessage="No hay actividades bloqueadas"
        >
          {blockedActivities?.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              variant="blocked"
              isManager={isManager}
              onUnblock={handleUnblock}
            />
          ))}
        </DashboardSection>
      </div>
    </div>
  );
}