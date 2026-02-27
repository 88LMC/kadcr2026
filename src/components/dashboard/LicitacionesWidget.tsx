import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { daysUntil, formatColones } from '@/lib/licitacion-constants';
import { cn } from '@/lib/utils';

export function LicitacionesWidget() {
  const { data: licitaciones, isLoading } = useQuery({
    queryKey: ['licitaciones-proximas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, company_name, licitacion_numero, licitacion_institucion, licitacion_fecha_cierre, licitacion_monto_estimado, current_phase')
        .eq('prospect_type', 'licitacion')
        .not('current_phase', 'in', '("Adjudicada Ganada","Adjudicada Perdida")')
        .not('licitacion_fecha_cierre', 'is', null)
        .order('licitacion_fecha_cierre', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!licitaciones?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏛️ Licitaciones Próximas a Vencer
          <Badge variant="secondary">{licitaciones.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {licitaciones.map((lic) => {
          const days = daysUntil(lic.licitacion_fecha_cierre);
          const isUrgent = days !== null && days < 3;
          const isWarning = days !== null && days >= 3 && days <= 7;

          return (
            <div
              key={lic.id}
              className={cn(
                'p-3 rounded-lg border',
                isUrgent && 'border-destructive/50 bg-destructive/5',
                isWarning && 'border-amber-500/50 bg-amber-50',
                !isUrgent && !isWarning && 'border-border bg-muted/30',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {lic.licitacion_numero || lic.company_name}
                  </p>
                  {lic.licitacion_institucion && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lic.licitacion_institucion}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-sm font-bold',
                    isUrgent && 'text-destructive',
                    isWarning && 'text-amber-600',
                  )}>
                    {days !== null && days >= 0 ? `${days}d` : 'Vencida'}
                  </p>
                  {lic.licitacion_monto_estimado && (
                    <p className="text-xs text-muted-foreground">
                      {formatColones(lic.licitacion_monto_estimado)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
