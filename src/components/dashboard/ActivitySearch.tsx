import { useState, useMemo } from 'react';
import { useSearchActivities } from '@/hooks/useActivities';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivitySearchProps {
  onActivityClick: (activity: any) => void;
}

export function ActivitySearch({ onActivityClick }: ActivitySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: searchResults = [], isLoading } = useSearchActivities(searchTerm);

  // Agrupar por prospecto
  const groupedResults = useMemo(() => {
    const groups: Record<string, { 
      prospectId: string;
      prospectName: string;
      activities: any[];
    }> = {};

    searchResults.forEach(activity => {
      const prospectId = activity.prospect_id || 'general';
      const prospectName = activity.prospects?.company_name || 'Tareas Generales';

      if (!groups[prospectId]) {
        groups[prospectId] = {
          prospectId,
          prospectName,
          activities: [],
        };
      }

      groups[prospectId].activities.push(activity);
    });

    // Ordenar actividades dentro de cada grupo
    Object.values(groups).forEach(group => {
      group.activities.sort((a, b) => {
        // Pendientes primero
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // Por fecha
        return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
      });
    });

    return Object.values(groups).sort((a, b) => 
      a.prospectName.localeCompare(b.prospectName)
    );
  }, [searchResults]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (prospectId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.add(prospectId);
      }
      return next;
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Llamada': return '📞';
      case 'Visita': return '📍';
      case 'Email': return '✉️';
      case 'Correo': return '✉️';
      case 'Seguimiento': return '⏱️';
      case 'Cotización': return '💰';
      default: return '📋';
    }
  };

  const getStatusBadge = (activity: any) => {
    const today = new Date().toISOString().split('T')[0];
    const scheduled = activity.scheduled_date;

    if (activity.status === 'completed') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">✅ Completada</Badge>;
    }
    if (activity.status === 'blocked') {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">🚫 Bloqueada</Badge>;
    }
    if (scheduled < today) {
      const days = Math.floor((new Date(today).getTime() - new Date(scheduled).getTime()) / (1000 * 60 * 60 * 24));
      return <Badge variant="destructive">🔴 Vencida {days}d</Badge>;
    }
    if (scheduled === today) {
      return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">📅 HOY</Badge>;
    }
    return <Badge variant="secondary">📆 Programada</Badge>;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar cliente o actividad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {searchTerm.length >= 2 && (
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
            ) : groupedResults.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-2">🤷 No se encontraron actividades</p>
                <p className="text-xs text-muted-foreground">
                  Intenta buscar parte del nombre del cliente
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  ✨ {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                </p>

                {groupedResults.map(group => {
                  const isExpanded = expandedGroups.has(group.prospectId);
                  const visibleActivities = isExpanded 
                    ? group.activities 
                    : group.activities.slice(0, 3);
                  const hasMore = group.activities.length > 3;

                  return (
                    <div key={group.prospectId} className="border rounded-lg p-3 space-y-2">
                      {/* Group header */}
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">
                          {group.prospectName}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({group.activities.length} actividad{group.activities.length !== 1 ? 'es' : ''})
                          </span>
                        </p>
                      </div>

                      {/* Activities */}
                      <div className="space-y-1.5">
                        {visibleActivities.map(activity => (
                          <button
                            key={activity.id}
                            onClick={() => onActivityClick(activity)}
                            className={cn(
                              "w-full text-left p-2 rounded border hover:border-primary hover:bg-accent/50 transition-colors",
                              activity.status === 'completed' && "opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span>{getActivityIcon(activity.activity_type)}</span>
                                  <span className="text-sm font-medium truncate">
                                    {activity.activity_type}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(activity.scheduled_date)}
                                  </span>
                                </div>
                                {activity.notes && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {activity.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {getStatusBadge(activity)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Show more/less */}
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => toggleGroup(group.prospectId)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Ver {group.activities.length - 3} más
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
