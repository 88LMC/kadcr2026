import { useEffect } from 'react';
import { AlertCircle, CalendarCheck, CalendarDays, Phone, Ban, ClipboardList } from 'lucide-react';
import { MetricsBar } from '@/components/dashboard/MetricsBar';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ActivityItem } from '@/components/dashboard/ActivityItem';
import { GeneralActivityItem } from '@/components/dashboard/GeneralActivityItem';
import { 
  useUrgentActivities, 
  useTodayActivities, 
  useWeekActivities,
  useNewCallsActivities,
  useBlockedActivities,
  useGeneralActivities,
  useGenerateDailyCalls,
  useUnblockActivity,
} from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useNextActivity } from '@/contexts/NextActivityContext';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { isManager } = useAuth();
  const { showNextActivity } = useNextActivity();
  const { toast } = useToast();
  
  const { data: urgentActivities, isLoading: isLoadingUrgent } = useUrgentActivities();
  const { data: todayActivities, isLoading: isLoadingToday } = useTodayActivities();
  const { data: weekActivities, isLoading: isLoadingWeek } = useWeekActivities();
  const { data: newCallsActivities, isLoading: isLoadingCalls } = useNewCallsActivities();
  const { data: blockedActivities, isLoading: isLoadingBlocked } = useBlockedActivities();
  const { data: generalActivities, isLoading: isLoadingGeneral } = useGeneralActivities();

  // Group week activities by date
  const groupByDate = (activities: typeof weekActivities) => {
    const grouped: Record<string, typeof weekActivities> = {};
    activities?.forEach(activity => {
      const date = new Date(activity.scheduled_date + 'T12:00:00');
      const dayName = date.toLocaleDateString('es-CR', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
      const key = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key]!.push(activity);
    });
    return grouped;
  };

  const groupedWeekActivities = groupByDate(weekActivities);
  
  const generateDailyCalls = useGenerateDailyCalls();
  const unblockActivity = useUnblockActivity();

  // Generate daily calls on mount
  useEffect(() => {
    generateDailyCalls.mutate();
  }, []);

  const handleUnblock = async (activityId: string) => {
    // Find the activity to get prospect info before unblocking
    const blockedActivity = blockedActivities?.find(a => a.id === activityId);

    try {
      await unblockActivity.mutateAsync(activityId);
      toast({
        title: 'Actividad desbloqueada',
        description: 'La actividad ha sido reactivada.',
      });

      // Trigger next activity modal if it has a prospect
      if (blockedActivity?.prospect_id) {
        showNextActivity({
          prospectId: blockedActivity.prospect_id,
          prospectName: blockedActivity.prospects?.company_name || 'Cliente',
          assignedTo: blockedActivity.assigned_to || null,
        });
      }
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

        {/* This Week Section */}
        <DashboardSection
          title="Esta Semana"
          icon={<CalendarDays className="h-5 w-5 text-primary" />}
          count={weekActivities?.length || 0}
          variant="today"
          isLoading={isLoadingWeek}
          isEmpty={!weekActivities?.length}
          emptyMessage="No tienes actividades programadas para esta semana"
        >
          {Object.entries(groupedWeekActivities).map(([date, activities]) => (
            <div key={date} className="mb-3 last:mb-0">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 capitalize">{date}</h4>
              {activities?.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  variant="today"
                />
              ))}
            </div>
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

        {/* General Tasks Section */}
        <DashboardSection
          title="Tareas Generales"
          icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
          count={generalActivities?.length || 0}
          variant="today"
          isLoading={isLoadingGeneral}
          isEmpty={!generalActivities?.length}
          emptyMessage="No hay tareas generales pendientes"
        >
          {generalActivities?.map((activity) => (
            <GeneralActivityItem
              key={activity.id}
              activity={activity}
            />
          ))}
        </DashboardSection>

        {/* Blocked Section - Full width */}
        <DashboardSection
          title="Bloqueados"
          icon={<Ban className="h-5 w-5 text-blocked" />}
          count={blockedActivities?.length || 0}
          variant="blocked"
          isLoading={isLoadingBlocked}
          isEmpty={!blockedActivities?.length}
          emptyMessage="No hay actividades bloqueadas"
          className="lg:col-span-2"
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
