import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Activity = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ActivityUpdate = Database['public']['Tables']['activities']['Update'];
type ActivityStatus = Database['public']['Enums']['activity_status'];
type ActivityType = Database['public']['Enums']['activity_type'];

interface ActivityWithProspect extends Activity {
  prospects: {
    company_name: string;
    contact_name: string;
  } | null;
}

export function useUrgentActivities() {
  return useQuery({
    queryKey: ['activities', 'urgent'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          )
        `)
        .eq('status', 'pending')
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as ActivityWithProspect[];
    },
  });
}

export function useTodayActivities() {
  return useQuery({
    queryKey: ['activities', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          )
        `)
        .eq('status', 'pending')
        .eq('scheduled_date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ActivityWithProspect[];
    },
  });
}

export function useBlockedActivities() {
  return useQuery({
    queryKey: ['activities', 'blocked'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          )
        `)
        .eq('status', 'blocked')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as ActivityWithProspect[];
    },
  });
}

export function useNewCallsActivities() {
  return useQuery({
    queryKey: ['activities', 'new-calls'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          prospects (
            company_name,
            contact_name
          )
        `)
        .eq('status', 'pending')
        .eq('activity_type', 'Llamada')
        .eq('scheduled_date', today)
        .eq('created_by', 'system')
        .order('created_at', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data as ActivityWithProspect[];
    },
  });
}

export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'completed' as ActivityStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', activityId);

      if (error) throw error;
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
      const today = new Date().toISOString().split('T')[0];
      
      // Check if daily calls already exist for today
      const { data: existingCalls, error: checkError } = await supabase
        .from('activities')
        .select('id')
        .eq('activity_type', 'Llamada')
        .eq('scheduled_date', today)
        .eq('created_by', 'system');

      if (checkError) throw checkError;
      
      // If 3 or more calls already exist, skip
      if (existingCalls && existingCalls.length >= 3) {
        return { generated: 0, message: 'Calls already generated for today' };
      }

      const callsToGenerate = 3 - (existingCalls?.length || 0);

      // Get prospects in 'Prospección' phase without a call today
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
        .eq('scheduled_date', today);

      if (callsError) throw callsError;

      const prospectsWithCallsIds = new Set(prospectsWithCalls?.map(c => c.prospect_id) || []);
      const availableProspects = prospects.filter(p => !prospectsWithCallsIds.has(p.id));

      if (availableProspects.length === 0) {
        return { generated: 0, message: 'All prospects already have calls today' };
      }

      // Shuffle and take up to callsToGenerate
      const shuffled = availableProspects.sort(() => Math.random() - 0.5);
      const selectedProspects = shuffled.slice(0, Math.min(callsToGenerate, shuffled.length));

      // Create activities
      const newActivities = selectedProspects.map(p => ({
        prospect_id: p.id,
        activity_type: 'Llamada' as ActivityType,
        scheduled_date: today,
        status: 'pending' as ActivityStatus,
        created_by: 'system' as const,
        notes: 'Llamada diaria auto-generada',
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