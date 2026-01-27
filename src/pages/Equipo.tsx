import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalespersons } from '@/hooks/useUsers';
import { useActivityLogs, useActivitySummary, DateFilter, ActionFilter } from '@/hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Activity, BarChart3, Clock, CheckCircle, Plus, Ban, Pencil, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const actionIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  login: { icon: <LogIn className="h-5 w-5" />, color: 'text-blue-500 bg-blue-50' },
  logout: { icon: <LogOut className="h-5 w-5" />, color: 'text-red-500 bg-red-50' },
  complete: { icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-500 bg-green-50' },
  create: { icon: <Plus className="h-5 w-5" />, color: 'text-emerald-500 bg-emerald-50' },
  block: { icon: <Ban className="h-5 w-5" />, color: 'text-gray-500 bg-gray-100' },
  update: { icon: <Pencil className="h-5 w-5" />, color: 'text-orange-500 bg-orange-50' },
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

const formatDetails = (details: Record<string, any> | null, actionType: string): string | null => {
  if (!details) return null;

  if (actionType === 'login') {
    return `Plataforma: ${details.platform || 'web'}`;
  }

  if (actionType === 'logout') {
    return null;
  }

  if (details.prospect && details.activity_type) {
    return `${details.prospect} - ${details.activity_type}`;
  }

  if (details.completion_comment) {
    return `💬 "${details.completion_comment}"`;
  }

  if (details.block_reason) {
    return `💬 "${details.block_reason}"`;
  }

  if (details.company_name) {
    if (details.changes?.phase_from && details.changes?.phase_to) {
      return `${details.company_name}: ${details.changes.phase_from} → ${details.changes.phase_to}`;
    }
    return details.company_name;
  }

  if (details.activity_type && details.scheduled_date) {
    return `${details.activity_type} - ${format(new Date(details.scheduled_date), 'dd MMM', { locale: es })}`;
  }

  return null;
};

const formatTime = (timestamp: string): string => {
  return format(new Date(timestamp), 'hh:mm a', { locale: es });
};

export default function Equipo() {
  const { isManager } = useAuth();
  const { data: salespersons, isLoading: loadingSalespersons } = useSalespersons();
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  const { data: logs, isLoading: loadingLogs } = useActivityLogs(
    selectedVendorId || undefined,
    dateFilter,
    actionFilter
  );

  const summary = useActivitySummary(logs);

  // Redirect non-managers
  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  // Auto-select first vendor when loaded
  if (salespersons && salespersons.length > 0 && !selectedVendorId) {
    setSelectedVendorId(salespersons[0].id);
  }

  const selectedVendor = salespersons?.find(v => v.id === selectedVendorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Equipo</h1>
            <p className="text-sm text-muted-foreground">Monitorea la actividad de tus vendedores</p>
          </div>
        </div>

        {/* Vendor Selector */}
        <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Seleccionar vendedor" />
          </SelectTrigger>
          <SelectContent>
            {loadingSalespersons ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              salespersons?.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.full_name} - Vendedor
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedVendorId && (
        <Tabs defaultValue="historial" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumen" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2">
              <Activity className="h-4 w-4" />
              Historial de Actividad
            </TabsTrigger>
          </TabsList>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.completedCount}</p>
                      <p className="text-sm text-muted-foreground">Completadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <Plus className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.createdCount}</p>
                      <p className="text-sm text-muted-foreground">Creadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Ban className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.blockedCount}</p>
                      <p className="text-sm text-muted-foreground">Bloqueadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.activeTime}</p>
                      <p className="text-sm text-muted-foreground">Tiempo activo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Historial Tab */}
          <TabsContent value="historial" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="login">Login/Logout</SelectItem>
                  <SelectItem value="complete">Completadas</SelectItem>
                  <SelectItem value="create">Creadas</SelectItem>
                  <SelectItem value="block">Bloqueadas</SelectItem>
                  <SelectItem value="update">Actualizaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activity Logs */}
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => {
                  const actionConfig = actionIcons[log.action_type] || { 
                    icon: <Activity className="h-5 w-5" />, 
                    color: 'text-gray-500 bg-gray-50' 
                  };
                  const details = formatDetails(log.details as Record<string, any> | null, log.action_type);

                  return (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${actionConfig.color}`}>
                            {actionConfig.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(log.created_at)}
                            </div>
                            <p className="font-semibold mt-1">
                              {getActionTitle(log.action_type)}
                            </p>
                            {details && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {details}
                              </p>
                            )}
                            {log.action_type === 'login' && log.user_agent && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {log.user_agent.includes('Chrome') ? 'Chrome' : 
                                 log.user_agent.includes('Firefox') ? 'Firefox' : 
                                 log.user_agent.includes('Safari') ? 'Safari' : 'Navegador'}
                                {log.user_agent.includes('Windows') ? ' en Windows' : 
                                 log.user_agent.includes('Mac') ? ' en Mac' : 
                                 log.user_agent.includes('Linux') ? ' en Linux' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No hay actividad registrada para este período
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Daily Summary */}
            {logs && logs.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumen del período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">• Actividades completadas:</span>
                      <span className="font-medium">{summary.completedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">• Actividades creadas:</span>
                      <span className="font-medium">{summary.createdCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">• Actividades bloqueadas:</span>
                      <span className="font-medium">{summary.blockedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">• Prospectos actualizados:</span>
                      <span className="font-medium">{summary.updatedCount}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">• Tiempo activo:</span>
                      <span className="font-medium">{summary.activeTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
