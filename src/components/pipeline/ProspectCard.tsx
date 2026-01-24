import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProspectWithStats {
  id: string;
  company_name: string;
  contact_name: string;
  estimated_value: number | null;
  pending_activities: number;
  days_in_phase: number;
}

interface ProspectCardProps {
  prospect: ProspectWithStats;
  onClick?: () => void;
}

export function ProspectCard({ prospect, onClick }: ProspectCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50 bg-card'
      )}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-sm truncate">
              {prospect.company_name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {prospect.contact_name}
            </p>
          </div>

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
