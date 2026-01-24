import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Prospect = Database['public']['Tables']['prospects']['Row'];
type ProspectUpdate = Database['public']['Tables']['prospects']['Update'];
type PhaseType = Database['public']['Enums']['phase_type'];

interface ProspectWithStats extends Prospect {
  pending_activities: number;
  days_in_phase: number;
}

export function useProspects() {
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Prospect[];
    },
  });
}

export function useProspectsWithStats() {
  return useQuery({
    queryKey: ['prospects', 'with-stats'],
    queryFn: async () => {
      // Get all prospects
      const { data: prospects, error: prospectsError } = await supabase
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (prospectsError) throw prospectsError;

      // Get pending activities count per prospect
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('prospect_id')
        .eq('status', 'pending');

      if (activitiesError) throw activitiesError;

      // Count pending activities per prospect
      const pendingCounts: Record<string, number> = {};
      activities?.forEach(a => {
        pendingCounts[a.prospect_id] = (pendingCounts[a.prospect_id] || 0) + 1;
      });

      // Calculate days in phase and add stats
      const now = new Date();
      const prospectsWithStats: ProspectWithStats[] = prospects?.map(p => {
        const updatedAt = new Date(p.updated_at || p.created_at || now);
        const daysInPhase = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...p,
          pending_activities: pendingCounts[p.id] || 0,
          days_in_phase: daysInPhase,
        };
      }) || [];

      return prospectsWithStats;
    },
  });
}

export function useUpdateProspectPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, phase }: { prospectId: string; phase: PhaseType }) => {
      const { error } = await supabase
        .from('prospects')
        .update({ 
          current_phase: phase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
}

export function useProspectSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['prospects', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) {
        const { data, error } = await supabase
          .from('prospects')
          .select('id, company_name, contact_name')
          .order('company_name')
          .limit(10);
        
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('prospects')
        .select('id, company_name, contact_name')
        .or(`company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`)
        .order('company_name')
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      // Get all prospects
      const { data: prospects, error: prospectsError } = await supabase
        .from('prospects')
        .select('id, current_phase, estimated_value');

      if (prospectsError) throw prospectsError;

      // Get today's pending activities count
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayError } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('scheduled_date', today);

      if (todayError) throw todayError;

      // Calculate metrics
      const totalProspects = prospects?.length || 0;
      const todayActivities = todayCount || 0;

      // Pipeline value (Cotización + Negociación)
      const pipelineValue = prospects
        ?.filter(p => p.current_phase === 'Cotización' || p.current_phase === 'Negociación')
        .reduce((sum, p) => sum + (p.estimated_value || 0), 0) || 0;

      // Conversion rate (Lead → Cotización)
      const leadCount = prospects?.filter(p => p.current_phase === 'Lead').length || 0;
      const cotizacionCount = prospects?.filter(p => 
        ['Cotización', 'Negociación', 'Ganada', 'En Producción', 'Facturada', 'Post Venta'].includes(p.current_phase || '')
      ).length || 0;
      
      const conversionRate = leadCount + cotizacionCount > 0 
        ? Math.round((cotizacionCount / (leadCount + cotizacionCount)) * 100) 
        : 0;

      return {
        totalProspects,
        todayActivities,
        pipelineValue,
        conversionRate,
      };
    },
  });
}