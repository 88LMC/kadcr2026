import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  title: string;
  icon: ReactNode;
  count?: number;
  variant?: 'urgent' | 'today' | 'new-call' | 'blocked';
  isLoading?: boolean;
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  className?: string;
}

export function DashboardSection({
  title,
  icon,
  count,
  variant = 'today',
  isLoading,
  children,
  emptyMessage = 'No hay actividades',
  isEmpty,
  className,
}: DashboardSectionProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'urgent':
        return {
          badge: 'bg-destructive text-destructive-foreground',
          header: 'text-destructive',
        };
      case 'new-call':
        return {
          badge: 'bg-primary text-primary-foreground',
          header: 'text-primary',
        };
      case 'blocked':
        return {
          badge: 'bg-blocked text-blocked-foreground',
          header: 'text-blocked',
        };
      default:
        return {
          badge: 'bg-warning text-warning-foreground',
          header: 'text-warning-foreground',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('', styles.header)}>{icon}</span>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          {count !== undefined && (
            <Badge className={styles.badge}>
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}