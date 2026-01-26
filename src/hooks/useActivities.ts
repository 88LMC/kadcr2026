import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type Activity = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ActivityUpdate = Database['public']['Tables']['activities']['Update'];
type ActivityStatus = Database['public']['Enums']['activity_status'];
type ActivityType = Database['public']['Enums']['activity_type'];

interface AssignedUser {
  full_name: string;
  role: string;
}

interface ActivityWithProspect extends Activity {
  prospects: {
    company_name: string;
    contact_name: string;
  } | null;
  assigned_user?: AssignedUser | null;
}

export function useUrgentActivities() {
  const { user, isManager } = useAuth();
  
  return useQuery({
    queryKey: ['activities', 'urgent', user?.id, isManager],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          ),
          assigned_user:user_profiles (
            full_name,
            role
          )
        `)
        .eq('status', 'pending')
        .lt('scheduled_date', today)
        .not('prospect_id', 'is', null)
        .order('scheduled_date', { ascending: true });

      // Salesperson only sees their own activities
      if (!isManager && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ActivityWithProspect[];
    },
    enabled: !!user,
  });
}

export function useTodayActivities() {
  const { user, isManager } = useAuth();
  
  return useQuery({
    queryKey: ['activities', 'today', user?.id, isManager],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          ),
          assigned_user:user_profiles (
            full_name,
            role
          )
        `)
        .eq('status', 'pending')
        .eq('scheduled_date', today)
        .not('prospect_id', 'is', null)
        .order('created_at', { ascending: true });

      if (!isManager && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ActivityWithProspect[];
    },
    enabled: !!user,
  });
}

export function useBlockedActivities() {
  const { user, isManager } = useAuth();
  
  return useQuery({
    queryKey: ['activities', 'blocked', user?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          ),
          assigned_user:user_profiles (
            full_name,
            role
          )
        `)
        .eq('status', 'blocked')
        .order('scheduled_date', { ascending: true });

      if (!isManager && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ActivityWithProspect[];
    },
    enabled: !!user,
  });
}

export function useNewCallsActivities() {
  const { user, isManager } = useAuth();
  
  return useQuery({
    queryKey: ['activities', 'new-calls', user?.id, isManager],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          ),
          assigned_user:user_profiles (
            full_name,
            role
          )
        `)
        .eq('status', 'pending')
        .eq('activity_type', 'Llamada')
        .eq('scheduled_date', today)
        .eq('created_by', 'system')
        .order('created_at', { ascending: true })
        .limit(3);

      if (!isManager && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ActivityWithProspect[];
    },
    enabled: !!user,
  });
}

export function useGeneralActivities() {
  const { user, isManager } = useAuth();
  
  return useQuery({
    queryKey: ['activities', 'general', user?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          assigned_user:user_profiles (
            full_name,
            role
          )
        `)
        .eq('status', 'pending')
        .is('prospect_id', null)
        .order('scheduled_date', { ascending: true });

      if (!isManager && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as (Activity & { assigned_user?: AssignedUser | null })[];
    },
    enabled: !!user,
  });
}

export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, comment }: { activityId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .update({
          status: 'completed' as ActivityStatus,
          completed_at: new Date().toISOString(),
          completion_comment: comment,
        })
        .eq('id', activityId)
        .select('prospect_id, assigned_to')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useNotCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, comment }: { activityId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .update({
          completion_comment: comment,
        })
        .eq('id', activityId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useBlockActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, blockReason }: { activityId: string; blockReason: string }) => {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'blocked' as ActivityStatus,
          block_reason: blockReason,
          completion_comment: blockReason,
        })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUnblockActivity() {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Omit<ActivityInsert, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('activities').insert(activity);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useGenerateDailyCalls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayStr = today.toISOString().split('T')[0];
      
      // Only generate calls Monday (1) to Thursday (4)
      if (dayOfWeek < 1 || dayOfWeek > 4) {
        return { generated: 0, message: 'Solo se generan llamadas de Lunes a Jueves' };
      }
      
      // Check if daily calls already exist for today
      const { data: existingCalls, error: checkError } = await supabase
        .from('activities')
        .select('id')
        .eq('activity_type', 'Llamada')
        .eq('scheduled_date', todayStr)
        .eq('created_by', 'system');

      if (checkError) throw checkError;
      
      if (existingCalls && existingCalls.length >= 3) {
        return { generated: 0, message: 'Calls already generated for today' };
      }

      const callsToGenerate = 3 - (existingCalls?.length || 0);

      // Get prospects in 'Prospección' phase
      const { data: prospects, error: prospectsError } = await supabase
        .from('prospects')
        .select('id')
        .eq('current_phase', 'Prospección');

      if (prospectsError) throw prospectsError;
      if (!prospects || prospects.length === 0) {
        return { generated: 0, message: 'No prospects available' };
      }

      // Get prospects that already have a call today
      const { data: prospectsWithCalls, error: callsError } = await supabase
        .from('activities')
        .select('prospect_id')
        .eq('activity_type', 'Llamada')
        .eq('scheduled_date', todayStr);

      if (callsError) throw callsError;

      const prospectsWithCallsIds = new Set(prospectsWithCalls?.map(c => c.prospect_id) || []);
      const availableProspects = prospects.filter(p => !prospectsWithCallsIds.has(p.id));

      if (availableProspects.length === 0) {
        return { generated: 0, message: 'All prospects already have calls today' };
      }

      // Get a salesperson to assign calls to
      const { data: salesperson } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'salesperson')
        .limit(1)
        .maybeSingle();

      // Shuffle and take up to callsToGenerate
      const shuffled = availableProspects.sort(() => Math.random() - 0.5);
      const selectedProspects = shuffled.slice(0, Math.min(callsToGenerate, shuffled.length));

      // Create activities
      const newActivities = selectedProspects.map(p => ({
        prospect_id: p.id,
        activity_type: 'Llamada' as ActivityType,
        scheduled_date: todayStr,
        status: 'pending' as ActivityStatus,
        created_by: 'system' as const,
        notes: 'Primera llamada de calificación',
        assigned_to: salesperson?.id || null,
      }));

      if (newActivities.length > 0) {
        const { error: insertError } = await supabase.from('activities').insert(newActivities);
        if (insertError) throw insertError;
      }

      return { generated: newActivities.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
