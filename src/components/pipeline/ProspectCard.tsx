import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { daysUntil, formatColones } from '@/lib/licitacion-constants';

interface ProspectWithStats {
  id: string;
  company_name: string;
  contact_name: string;
  estimated_value: number | null;
  pending_activities: number;
  days_in_phase: number;
  prospect_type?: string | null;
  licitacion_numero?: string | null;
  licitacion_institucion?: string | null;
  licitacion_fecha_cierre?: string | null;
  licitacion_monto_estimado?: number | null;
}

interface ProspectCardProps {
  prospect: ProspectWithStats;
  onClick?: () => void;
}

export function ProspectCard({ prospect, onClick }: ProspectCardProps) {
  const isLicitacion = prospect.prospect_type === 'licitacion';
  const closingDays = daysUntil(prospect.licitacion_fecha_cierre);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatClosingDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50 bg-card',
        isLicitacion && 'border-l-4 border-l-amber-500'
      )}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div>
            {isLicitacion && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 mb-1 text-[10px]">
                🏛️ LICITACIÓN
              </Badge>
            )}
            <h4 className="font-medium text-sm truncate">
              {prospect.company_name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {prospect.contact_name}
            </p>
          </div>

          {/* Licitacion-specific info */}
          {isLicitacion && (
            <div className="space-y-0.5">
              {prospect.licitacion_numero && (
                <p className="text-xs text-muted-foreground truncate">
                  #{prospect.licitacion_numero}
                </p>
              )}
              {prospect.licitacion_institucion && (
                <p className="text-xs font-medium truncate">
                  {prospect.licitacion_institucion}
                </p>
              )}
              {prospect.licitacion_fecha_cierre && (
                <p className={cn(
                  'text-xs font-medium',
                  closingDays !== null && closingDays < 3 && 'text-destructive',
                  closingDays !== null && closingDays >= 3 && closingDays <= 7 && 'text-amber-600',
                )}>
                  Cierra: {formatClosingDate(prospect.licitacion_fecha_cierre)}
                  {closingDays !== null && closingDays >= 0 && ` (${closingDays}d)`}
                </p>
              )}
              {prospect.licitacion_monto_estimado && prospect.licitacion_monto_estimado > 0 && (
                <Badge variant="outline" className="text-xs">
                  {formatColones(prospect.licitacion_monto_estimado)}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {prospect.estimated_value && prospect.estimated_value > 0 && (
              <Badge variant="outline" className="text-xs">
                💰 {formatCurrency(prospect.estimated_value)}
              </Badge>
            )}
            {prospect.pending_activities > 0 && (
              <Badge variant="secondary" className="text-xs">
                📋 {prospect.pending_activities}
              </Badge>
            )}
            {prospect.days_in_phase > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  prospect.days_in_phase > 14 && 'border-warning text-warning',
                  prospect.days_in_phase > 30 && 'border-destructive text-destructive'
                )}
              >
                ⏱️ {prospect.days_in_phase}d
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
