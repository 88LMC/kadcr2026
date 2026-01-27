import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar, MessageSquare, AlertCircle, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityLogDetails {
  prospect_name?: string;
  activity_type?: string;
  scheduled_date?: string;
  completion_comment?: string;
  completed_at?: string;
  notes?: string;
  block_reason?: string;
  assigned_to_name?: string;
  company_name?: string;
  changes?: {
    phase_from?: string;
    phase_to?: string;
  };
  platform?: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  details: ActivityLogDetails | null;
  created_at: string;
  user_agent?: string | null;
}

interface ActivityLogCardProps {
  log: ActivityLog;
}

const actionConfig: Record<string, { icon: string; color: string; borderColor: string }> = {
  login: { icon: '🔵', color: 'text-blue-500 bg-blue-50', borderColor: 'border-l-blue-500' },
  logout: { icon: '🔴', color: 'text-red-500 bg-red-50', borderColor: 'border-l-red-500' },
  complete: { icon: '✅', color: 'text-green-500 bg-green-50', borderColor: 'border-l-green-500' },
  create: { icon: '➕', color: 'text-emerald-500 bg-emerald-50', borderColor: 'border-l-emerald-500' },
  block: { icon: '🚫', color: 'text-gray-500 bg-gray-100', borderColor: 'border-l-gray-500' },
  update: { icon: '✏️', color: 'text-orange-500 bg-orange-50', borderColor: 'border-l-orange-500' },
};

const getActionTitle = (actionType: string): string => {
  switch (actionType) {
    case 'login': return 'LOGIN';
    case 'logout': return 'LOGOUT';
    case 'complete': return 'COMPLETÓ ACTIVIDAD';
    case 'create': return 'CREÓ ACTIVIDAD';
    case 'block': return 'BLOQUEÓ ACTIVIDAD';
    case 'update': return 'ACTUALIZÓ PROSPECTO';
    default: return actionType.toUpperCase();
  }
};

const formatTime = (timestamp: string): string => {
  return format(new Date(timestamp), 'hh:mm a', { locale: es });
};

const formatDate = (date: string): string => {
  return format(new Date(date), 'dd MMM yyyy', { locale: es });
};

const formatDateTime = (timestamp: string): string => {
  return format(new Date(timestamp), "dd MMM 'a las' hh:mm a", { locale: es });
};

const parseUserAgent = (userAgent: string | null | undefined): string => {
  if (!userAgent) return 'Navegador desconocido';
  
  let browser = 'Navegador';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  let os = '';
  if (userAgent.includes('Windows')) os = ' en Windows';
  else if (userAgent.includes('Mac')) os = ' en Mac';
  else if (userAgent.includes('Linux')) os = ' en Linux';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = ' en iOS';
  else if (userAgent.includes('Android')) os = ' en Android';
  
  return browser + os;
};

export function ActivityLogCard({ log }: ActivityLogCardProps) {
  const config = actionConfig[log.action_type] || { 
    icon: '📋', 
    color: 'text-gray-500 bg-gray-50', 
    borderColor: 'border-l-gray-300' 
  };
  const details = log.details;

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-2xl flex-shrink-0">
            {config.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Time and Title */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{formatTime(log.created_at)}</span>
            </div>
            <h4 className="font-semibold text-lg">
              {getActionTitle(log.action_type)}
            </h4>
            
            {/* Expanded Details */}
            {details && (
              <div className="space-y-3 mt-3 pl-4 border-l-2 border-muted">
                
                {/* Prospect and Activity Type */}
                {details.prospect_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{details.prospect_name}</span>
                    {details.activity_type && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{details.activity_type}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Company name for prospect updates */}
                {details.company_name && !details.prospect_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{details.company_name}</span>
                  </div>
                )}

                {/* Phase changes */}
                {details.changes?.phase_from && details.changes?.phase_to && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Cambió fase:</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">{details.changes.phase_from}</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{details.changes.phase_to}</span>
                  </div>
                )}

                {/* Scheduled Date */}
                {details.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Programada: {formatDate(details.scheduled_date)}</span>
                  </div>
                )}

                {/* Completion Comment */}
                {details.completion_comment && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Comentario:
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                          "{details.completion_comment}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Block Reason */}
                {details.block_reason && (
                  <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-1 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          Razón del bloqueo:
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                          "{details.block_reason}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {details.notes && !details.completion_comment && !details.block_reason && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Notas:</span> {details.notes}
                  </div>
                )}

                {/* Assigned To */}
                {details.assigned_to_name && log.action_type === 'create' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Asignada a: {details.assigned_to_name}</span>
                  </div>
                )}

                {/* Completed At */}
                {details.completed_at && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Clock className="w-4 h-4" />
                    <span>Completada: {formatDateTime(details.completed_at)}</span>
                  </div>
                )}

                {/* Login platform info */}
                {log.action_type === 'login' && details.platform && (
                  <div className="text-sm text-muted-foreground">
                    Plataforma: {details.platform}
                  </div>
                )}
              </div>
            )}

            {/* User Agent for login */}
            {log.action_type === 'login' && log.user_agent && (
              <div className="mt-2 text-xs text-muted-foreground">
                📱 {parseUserAgent(log.user_agent)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
