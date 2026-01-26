import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Constants, Database } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, ArrowUpDown, AlertTriangle, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CreateProspectModal from '@/components/prospects/CreateProspectModal';

type PhaseType = Database['public']['Enums']['phase_type'];

const PHASES = Constants.public.Enums.phase_type;

interface ProspectRow {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  current_phase: PhaseType | null;
  estimated_value: number | null;
  pending_activities: number;
  next_activity_date: string | null;
  days_in_phase: number;
  assigned_user_name: string | null;
}

type SortKey = 'company_name' | 'current_phase' | 'estimated_value' | 'pending_activities' | 'next_activity_date';
type SortOrder = 'asc' | 'desc';

export default function Gestion() {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('company_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prospects, isLoading } = useQuery({
    queryKey: ['prospects', 'gestion'],
    queryFn: async () => {
      // Get prospects with stats
      const { data: prospectsData, error: prospectsError } = await supabase
        .from('prospects')
        .select('*')
        .order('company_name');

      if (prospectsError) throw prospectsError;

      // Get pending activities per prospect with next date and assigned user
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          prospect_id, 
          scheduled_date,
          assigned_to
        `)
        .eq('status', 'pending')
        .not('prospect_id', 'is', null);

      if (activitiesError) throw activitiesError;

      // Get all user profiles to map assigned_to -> full_name
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name');

      if (usersError) throw usersError;

      const userMap: Record<string, string> = {};
      userProfiles?.forEach(u => {
        userMap[u.id] = u.full_name;
      });

      // Calculate stats
      const activityStats: Record<string, { count: number; nextDate: string | null; assignedTo: string | null }> = {};
      activities?.forEach(a => {
        if (!a.prospect_id) return;
        if (!activityStats[a.prospect_id]) {
          activityStats[a.prospect_id] = { count: 0, nextDate: null, assignedTo: null };
        }
        activityStats[a.prospect_id].count++;
        if (!activityStats[a.prospect_id].nextDate || a.scheduled_date < activityStats[a.prospect_id].nextDate!) {
          activityStats[a.prospect_id].nextDate = a.scheduled_date;
          activityStats[a.prospect_id].assignedTo = a.assigned_to;
        }
      });

      const now = new Date();
      const prospectsWithStats: ProspectRow[] = prospectsData?.map(p => {
        const updatedAt = new Date(p.updated_at || p.created_at || now);
        const daysInPhase = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        const stats = activityStats[p.id] || { count: 0, nextDate: null, assignedTo: null };

        return {
          id: p.id,
          company_name: p.company_name,
          contact_name: p.contact_name,
          phone: p.phone,
          email: p.email,
          current_phase: p.current_phase,
          estimated_value: p.estimated_value,
          pending_activities: stats.count,
          next_activity_date: stats.nextDate,
          days_in_phase: daysInPhase,
          assigned_user_name: stats.assignedTo ? userMap[stats.assignedTo] || null : null,
        };
      }) || [];

      return prospectsWithStats;
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, newPhase }: { id: string; newPhase: PhaseType }) => {
      const { error } = await supabase
        .from('prospects')
        .update({
          current_phase: newPhase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      const prospect = prospects?.find(p => p.id === variables.id);
      toast({
        title: 'Fase actualizada',
        description: `${prospect?.company_name} movido a ${variables.newPhase}`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la fase.',
        variant: 'destructive',
      });
    },
  });

  // Filter and sort
  const filteredProspects = useMemo(() => {
    if (!prospects) return [];

    let result = [...prospects];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        p =>
          p.company_name.toLowerCase().includes(searchLower) ||
          p.contact_name.toLowerCase().includes(searchLower)
      );
    }

    // Phase filter
    if (phaseFilter !== 'all') {
      result = result.filter(p => p.current_phase === phaseFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'company_name':
          comparison = a.company_name.localeCompare(b.company_name);
          break;
        case 'current_phase':
          comparison = (a.current_phase || '').localeCompare(b.current_phase || '');
          break;
        case 'estimated_value':
          comparison = (a.estimated_value || 0) - (b.estimated_value || 0);
          break;
        case 'pending_activities':
          comparison = a.pending_activities - b.pending_activities;
          break;
        case 'next_activity_date':
          if (!a.next_activity_date && !b.next_activity_date) comparison = 0;
          else if (!a.next_activity_date) comparison = 1;
          else if (!b.next_activity_date) comparison = -1;
          else comparison = a.next_activity_date.localeCompare(b.next_activity_date);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [prospects, search, phaseFilter, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const SortButton = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(sortKeyValue)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Gestión de Prospectos</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Prospecto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas las fases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fases</SelectItem>
            {PHASES.map((phase) => (
              <SelectItem key={phase} value={phase}>
                {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create Prospect Modal */}
      <CreateProspectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton label="Empresa" sortKeyValue="company_name" />
              </TableHead>
              <TableHead className="hidden md:table-cell">Contacto</TableHead>
              <TableHead>
                <SortButton label="Fase" sortKeyValue="current_phase" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Valor" sortKeyValue="estimated_value" />
              </TableHead>
              <TableHead className="hidden lg:table-cell">Asignado a</TableHead>
              <TableHead className="text-center hidden sm:table-cell">
                <SortButton label="Act." sortKeyValue="pending_activities" />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortButton label="Próx. Act." sortKeyValue="next_activity_date" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProspects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron prospectos
                </TableCell>
              </TableRow>
            ) : (
              filteredProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">{prospect.company_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {prospect.contact_name}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={prospect.current_phase || ''}
                      onValueChange={(value) =>
                        updatePhase.mutate({
                          id: prospect.id,
                          newPhase: value as PhaseType,
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASES.map((phase) => (
                          <SelectItem key={phase} value={phase}>
                            {phase}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {prospect.estimated_value ? formatCurrency(prospect.estimated_value) : '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {prospect.assigned_user_name ? (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        {prospect.assigned_user_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {prospect.pending_activities > 0 ? (
                      <Badge variant="secondary">{prospect.pending_activities}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        isOverdue(prospect.next_activity_date) && 'text-destructive font-medium'
                      )}
                    >
                      {isOverdue(prospect.next_activity_date) && (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {formatDate(prospect.next_activity_date)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Mostrando {filteredProspects.length} de {prospects?.length || 0} prospectos
      </p>
    </div>
  );
}
