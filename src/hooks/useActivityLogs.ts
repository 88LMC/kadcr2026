import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';

export type DateFilter = 'today' | 'yesterday' | 'week' | 'month';
export type ActionFilter = 'all' | 'login' | 'complete' | 'create' | 'block' | 'update';

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } {
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function getActionTypes(filter: ActionFilter): string[] | null {
  switch (filter) {
    case 'login':
      return ['login', 'logout'];
    case 'complete':
      return ['complete'];
    case 'create':
      return ['create'];
    case 'block':
      return ['block'];
    case 'update':
      return ['update'];
    default:
      return null; // All actions
  }
}

export function useActivityLogs(
  userId: string | undefined,
  dateFilter: DateFilter = 'today',
  actionFilter: ActionFilter = 'all'
) {
  return useQuery({
    queryKey: ['activity-logs', userId, dateFilter, actionFilter],
    queryFn: async () => {
      if (!userId) return [];

      const { start, end } = getDateRange(dateFilter);
      const actionTypes = getActionTypes(actionFilter);

      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (actionTypes) {
        query = query.in('action_type', actionTypes);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!userId,
  });
}

export function useActivitySummary(logs: ActivityLog[] | undefined) {
  if (!logs || logs.length === 0) {
    return {
      completedCount: 0,
      createdCount: 0,
      blockedCount: 0,
      updatedCount: 0,
      activeTime: 'Sin datos',
    };
  }

  const completedCount = logs.filter(l => l.action_type === 'complete').length;
  const createdCount = logs.filter(l => l.action_type === 'create').length;
  const blockedCount = logs.filter(l => l.action_type === 'block').length;
  const updatedCount = logs.filter(l => l.action_type === 'update').length;

  // Calculate active time
  const loginLog = logs.find(l => l.action_type === 'login');
  const logoutLog = logs.find(l => l.action_type === 'logout');

  let activeTime = 'Aún activo';
  if (loginLog && logoutLog) {
    const diff = new Date(logoutLog.created_at).getTime() - new Date(loginLog.created_at).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    activeTime = `${hours}h ${minutes}min`;
  } else if (!loginLog && !logoutLog) {
    activeTime = 'Sin sesión registrada';
  }

  return {
    completedCount,
    createdCount,
    blockedCount,
    updatedCount,
    activeTime,
  };
}
