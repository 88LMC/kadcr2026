import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalespersons } from '@/hooks/useUsers';
import { useActivityLogs, useActivitySummary, DateFilter, ActionFilter } from '@/hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Activity, BarChart3, Clock, CheckCircle, Plus, Ban, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { ActivityLogCard } from '@/components/equipo/ActivityLogCard';

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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Ban className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                {logs.map((log) => (
                  <ActivityLogCard 
                    key={log.id} 
                    log={{
                      ...log,
                      details: log.details as Record<string, any> | null
                    }} 
                  />
                ))}
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
