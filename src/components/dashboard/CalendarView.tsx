import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Phone, Mail, MapPin, FileText, Receipt, Clock, FileCheck, MoreHorizontal,
} from 'lucide-react';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { useNextActivity } from '@/contexts/NextActivityContext';
import { useDateRangeActivities } from '@/hooks/useActivities';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ActivityType = Database['public']['Enums']['activity_type'];

type CalendarActivity = {
  id: string;
  activity_type: ActivityType;
  custom_type?: string | null;
  scheduled_date: string;
  status: Database['public']['Enums']['activity_status'] | null;
  notes?: string | null;
  block_reason?: string | null;
  prospect_id?: string | null;
  assigned_to?: string | null;
  prospects: { company_name: string; contact_name: string } | null;
};

type ViewMode = 'list' | 'week' | 'month';

const STORAGE_KEY = 'crm-calendar-view-mode';

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

function getActivityColor(activity: CalendarActivity): string {
  if (activity.status === 'blocked') return 'bg-blocked/20 border-blocked/40 text-blocked';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(activity.scheduled_date + 'T12:00:00');
  scheduled.setHours(0, 0, 0, 0);
  if (scheduled < today) return 'bg-destructive/15 border-destructive/40 text-destructive';
  if (isSameDay(scheduled, today)) return 'bg-primary/15 border-primary/40 text-primary';
  return 'bg-muted border-border text-muted-foreground';
}

function getActivityDotColor(activity: CalendarActivity): string {
  if (activity.status === 'blocked') return 'bg-blocked';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(activity.scheduled_date + 'T12:00:00');
  scheduled.setHours(0, 0, 0, 0);
  if (scheduled < today) return 'bg-destructive';
  if (isSameDay(scheduled, today)) return 'bg-primary';
  return 'bg-muted-foreground/40';
}

// ── Mini Activity Card (for week view) ──
function WeekActivityCard({ activity, onClick }: { activity: CalendarActivity; onClick: () => void }) {
  const Icon = activityIcons[activity.activity_type] || MoreHorizontal;
  const colorClass = getActivityColor(activity);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border p-1.5 text-xs transition-all hover:shadow-sm',
        colorClass,
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate font-medium">
          {activity.prospects?.company_name || 'General'}
        </span>
      </div>
      <div className="truncate opacity-75 mt-0.5">
        {activity.activity_type}
        {activity.custom_type ? ` - ${activity.custom_type}` : ''}
      </div>
    </button>
  );
}

// ── Week View ──
function WeekView({ activities, onSelectActivity }: { activities: CalendarActivity[]; onSelectActivity: (a: CalendarActivity) => void }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  const activitiesByDay = useMemo(() => {
    const map: Record<string, CalendarActivity[]> = {};
    days.forEach(d => { map[format(d, 'yyyy-MM-dd')] = []; });
    activities.forEach(a => {
      const key = a.scheduled_date;
      if (map[key]) map[key].push(a);
    });
    return map;
  }, [activities, days]);

  return (
    <div className="space-y-3">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="grid grid-cols-7 gap-1 min-w-[640px]">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayActivities = activitiesByDay[key] || [];
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  'rounded-lg border p-2 min-h-[120px] flex flex-col',
                  today ? 'border-primary border-2 bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className={cn(
                  'text-xs font-semibold mb-1.5 text-center',
                  today ? 'text-primary' : 'text-muted-foreground',
                )}>
                  <div className="capitalize">{format(day, 'EEE', { locale: es })}</div>
                  <div className={cn(
                    'text-lg leading-none',
                    today ? 'text-primary' : 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-1 flex-1">
                  {dayActivities.map(a => (
                    <WeekActivityCard key={a.id} activity={a} onClick={() => onSelectActivity(a)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month View ──
function MonthView({ activities, onSelectActivity }: { activities: CalendarActivity[]; onSelectActivity: (a: CalendarActivity) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = useMemo(() => eachDayOfInterval({ start: calStart, end: calEnd }), [calStart.getTime(), calEnd.getTime()]);

  const activitiesByDay = useMemo(() => {
    const map: Record<string, CalendarActivity[]> = {};
    activities.forEach(a => {
      if (!map[a.scheduled_date]) map[a.scheduled_date] = [];
      map[a.scheduled_date].push(a);
    });
    return map;
  }, [activities]);

  const expandedActivities = expandedDay ? (activitiesByDay[expandedDay] || []) : [];

  // Fetch range for month view — we need the full calendar grid range
  const rangeStart = format(calStart, 'yyyy-MM-dd');
  const rangeEnd = format(calEnd, 'yyyy-MM-dd');

  return (
    <div className="space-y-3">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => { setCurrentMonth(addMonths(currentMonth, -1)); setExpandedDay(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(startOfMonth(new Date())); setExpandedDay(null); }}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setExpandedDay(null); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayActivities = activitiesByDay[key] || [];
          const inMonth = day.getMonth() === currentMonth.getMonth();
          const today = isToday(day);
          const isExpanded = expandedDay === key;
          const visibleCount = Math.min(dayActivities.length, 3);
          const extraCount = dayActivities.length - visibleCount;

          return (
            <button
              key={key}
              onClick={() => setExpandedDay(isExpanded ? null : key)}
              className={cn(
                'rounded-md border p-1.5 min-h-[60px] text-left transition-all',
                !inMonth && 'opacity-30',
                today && 'border-primary border-2 bg-primary/5',
                isExpanded && 'ring-2 ring-primary',
                !today && !isExpanded && 'border-border hover:border-primary/50',
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1',
                today ? 'text-primary' : 'text-foreground',
              )}>
                {format(day, 'd')}
              </div>
              {dayActivities.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {dayActivities.slice(0, 3).map(a => (
                    <div key={a.id} className={cn('h-2 w-2 rounded-full', getActivityDotColor(a))} />
                  ))}
                  {extraCount > 0 && (
                    <span className="text-[10px] text-muted-foreground leading-none">+{extraCount}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded day panel */}
      {expandedDay && expandedActivities.length > 0 && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <h4 className="text-sm font-semibold capitalize">
            {format(new Date(expandedDay + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
          </h4>
          <div className="space-y-1">
            {expandedActivities.map(a => (
              <WeekActivityCard key={a.id} activity={a} onClick={() => onSelectActivity(a)} />
            ))}
          </div>
        </div>
      )}
      {expandedDay && expandedActivities.length === 0 && (
        <div className="rounded-lg border bg-card p-3 text-center text-sm text-muted-foreground">
          Sin actividades para este día
        </div>
      )}
    </div>
  );
}

// ── Main CalendarView ──
export function CalendarView({ listContent }: { listContent: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ViewMode) || 'list';
  });
  const [selectedActivity, setSelectedActivity] = useState<CalendarActivity | null>(null);
  const { showNextActivity } = useNextActivity();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Compute date ranges for data fetching
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  // Fetch a wide range to cover navigation (±2 months)
  const fetchStart = format(addMonths(startOfMonth(now), -2), 'yyyy-MM-dd');
  const fetchEnd = format(endOfMonth(addMonths(now, 2)), 'yyyy-MM-dd');

  const { data: rangeActivities, isLoading } = useDateRangeActivities(
    viewMode !== 'list' ? fetchStart : '',
    viewMode !== 'list' ? fetchEnd : '',
  );

  const handleActivityCompleted = (data: { prospectId: string; prospectName: string; assignedTo: string | null }) => {
    showNextActivity(data);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">Actividades</CardTitle>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
            <ToggleGroupItem value="list" className="text-xs px-3">Lista</ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs px-3">Semana</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs px-3">Mes</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'list' && listContent}

        {viewMode === 'week' && (
          isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <WeekView
              activities={rangeActivities || []}
              onSelectActivity={setSelectedActivity}
            />
          )
        )}

        {viewMode === 'month' && (
          isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <MonthView
              activities={rangeActivities || []}
              onSelectActivity={setSelectedActivity}
            />
          )
        )}
      </CardContent>

      {/* Activity modal for calendar clicks */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          open={!!selectedActivity}
          onOpenChange={(open) => { if (!open) setSelectedActivity(null); }}
          onActivityCompleted={handleActivityCompleted}
        />
      )}
    </Card>
  );
}