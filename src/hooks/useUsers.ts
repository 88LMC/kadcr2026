import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole | null;
}

interface UserActivityStats {
  total_activities: number;
  completed_this_week: number;
  pending_activities: number;
  overdue_activities: number;
  blocked_activities: number;
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .order('role', { ascending: false }) // Managers first
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as UserProfile[];
    },
  });
}

export function useSalespersons() {
  return useQuery({
    queryKey: ['users', 'salespersons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .eq('role', 'salesperson')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as UserProfile[];
    },
  });
}

export function useUserActivityStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .rpc('get_user_activity_stats', { p_user_id: userId });

      if (error) throw error;
      
      // RPC returns array, get first item
      const stats = Array.isArray(data) ? data[0] : data;
      return stats as UserActivityStats | null;
    },
    enabled: !!userId,
  });
}

export function useTeamStats() {
  return useQuery({
    queryKey: ['team-stats'],
    queryFn: async () => {
      // Get all salespersons
      const { data: salespersons, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role')
        .eq('role', 'salesperson')
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      // Get stats for each salesperson
      const statsPromises = salespersons?.map(async (user) => {
        const { data: stats, error } = await supabase
          .rpc('get_user_activity_stats', { p_user_id: user.id });
        
        if (error) {
          console.error('Error fetching stats for', user.full_name, error);
          return {
            user,
            stats: null,
          };
        }
        
        const statsData = Array.isArray(stats) ? stats[0] : stats;
        return {
          user,
          stats: statsData as UserActivityStats | null,
        };
      }) || [];

      return Promise.all(statsPromises);
    },
  });
}
