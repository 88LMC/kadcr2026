import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUrgentActivities, useTodayActivities, useNewCallsActivities, useWeekActivities } from '@/hooks/useActivities';
import { useProspects } from '@/hooks/useProspects';
import { useNextActivity } from '@/contexts/NextActivityContext';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sun, Play, ArrowRight, Home, BarChart3, Check, X, Ban, SkipForward, Loader2 } from 'lucide-react';
import { daysUntil } from '@/lib/licitacion-constants';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mi-dia-progress';

interface MiDiaProgress {
  date: string;
  currentIndex: number;
  completedIds: string[];
  skippedIds: string[];
}

function loadProgress(): MiDiaProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as MiDiaProgress;
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return null;
    return data;
  } catch { return null; }
}

function saveProgress(progress: MiDiaProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

type Mode = 'overview' | 'focus' | 'completed' | 'resume';

export default function MiDia() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showNextActivity } = useNextActivity();

  const { data: urgentActivities = [], isLoading: loadingUrgent } = useUrgentActivities();
  const { data: newCalls = [], isLoading: loadingCalls } = useNewCallsActivities();
  const { data: todayActivities = [], isLoading: loadingToday } = useTodayActivities();
  const { data: prospects = [] } = useProspects();

  const [mode, setMode] = useState<Mode>('overview');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityModalState, setActivityModalState] = useState<'complete' | 'not-complete' | 'block' | null>(null);

  const isLoading = loadingUrgent || loadingCalls || loadingToday;

  // Licitaciones próximas (14 días)
  const upcomingLicitaciones = useMemo(() => {
    return prospects.filter(p => {
      if ((p as any).prospect_type !== 'licitacion') return false;
      const phase = p.current_phase;
      if (phase === 'Adjudicada Ganada' || phase === 'Adjudicada Perdida') return false;
      const days = daysUntil((p as any).licitacion_fecha_cierre);
      return days !== null && days >= 0 && days <= 14;
    }).sort((a, b) => {
      const da = daysUntil((a as any).licitacion_fecha_cierre) ?? 999;
      const db = daysUntil((b as any).licitacion_fecha_cierre) ?? 999;
      return da - db;
    });
  }, [prospects]);

  // All activities combined, prioritized
  const allActivities = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof urgentActivities = [];
    for (const list of [urgentActivities, newCalls, todayActivities]) {
      for (const act of list) {
        if (!seen.has(act.id)) {
          seen.add(act.id);
          result.push(act);
        }
      }
    }
    return result;
  }, [urgentActivities, newCalls, todayActivities]);

  // Check for saved progress on mount
  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.completedIds.length > 0 && allActivities.length > 0) {
      setCompletedIds(saved.completedIds);
      setSkippedIds(saved.skippedIds || []);
      setCurrentIndex(saved.currentIndex);
      setMode('resume');
    }
  }, [allActivities.length]);

  // Persist progress
  useEffect(() => {
    if (mode === 'focus' || mode === 'completed') {
      saveProgress({
        date: new Date().toISOString().split('T')[0],
        currentIndex,
        completedIds,
        skippedIds,
      });
    }
  }, [mode, currentIndex, completedIds, skippedIds]);

  const currentActivity = allActivities[currentIndex];
  const processedCount = completedIds.length + skippedIds.length;
  const totalCount = allActivities.length;
  const progressPercent = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;

  const advanceToNext = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= allActivities.length) {
      setMode('completed');
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [currentIndex, allActivities.length]);

  const handleActivityCompleted = useCallback((data?: { prospectId: string; prospectName: string; assignedTo: string | null }) => {
    if (currentActivity) {
      setCompletedIds(prev => [...prev, currentActivity.id]);
    }
    setActivityModalOpen(false);
    
    // If it has a prospect, trigger the next activity flow
    if (data?.prospectId) {
      showNextActivity({ prospectId: data.prospectId, prospectName: data.prospectName, assignedTo: data.assignedTo });
    }
    
    // Small delay to let modal close
    setTimeout(() => advanceToNext(), 300);
  }, [currentActivity, advanceToNext, showNextActivity]);

  const handleSkip = () => {
    if (currentActivity) {
      setSkippedIds(prev => [...prev, currentActivity.id]);
    }
    advanceToNext();
  };

  const startFocus = (fromIndex = 0) => {
    setCurrentIndex(fromIndex);
    setMode('focus');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const todayFormatted = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const getActivityCategory = (actId: string) => {
    if (urgentActivities.some(a => a.id === actId)) return 'urgent';
    if (newCalls.some(a => a.id === actId)) return 'calls';
    return 'today';
  };

  const getDaysOverdue = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // ─── RESUME MODE ─────────────────────────────────────
  if (mode === 'resume') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">⏸️ Sesión en progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Llevas <span className="font-bold text-foreground">{processedCount} de {totalCount}</span> actividades
            </p>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setMode('focus'); }} size="lg" className="gap-2">
                <Play className="h-4 w-4" /> Continuar donde quedé
              </Button>
              <Button variant="outline" onClick={() => {
                setCompletedIds([]);
                setSkippedIds([]);
                setCurrentIndex(0);
                setMode('overview');
              }}>
                Empezar de nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── COMPLETED MODE ──────────────────────────────────
  if (mode === 'completed') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-3xl">🎉 ¡Día Completado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">
              Procesaste <span className="font-bold text-foreground">{totalCount}</span> actividades hoy
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-success/10 p-4">
                <p className="text-2xl font-bold text-success">{completedIds.length}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold text-muted-foreground">{skippedIds.length}</p>
                <p className="text-xs text-muted-foreground">Saltadas</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => navigate('/dashboard')} size="lg" className="gap-2">
                <Home className="h-4 w-4" /> Volver al Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/pipeline')} className="gap-2">
                <BarChart3 className="h-4 w-4" /> Ver Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── FOCUS MODE ──────────────────────────────────────
  if (mode === 'focus') {
    if (!currentActivity) {
      setMode('completed');
      return null;
    }

    const category = getActivityCategory(currentActivity.id);
    const isOverdue = category === 'urgent';
    const overdueDays = isOverdue ? getDaysOverdue(currentActivity.scheduled_date) : 0;

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        {/* Progress bar */}
        <div className="w-full max-w-xl mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Actividad {currentIndex + 1} de {totalCount}</span>
            <span>{processedCount} procesadas</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {/* Dot indicators */}
          <div className="flex gap-1 justify-center flex-wrap">
            {allActivities.map((a, i) => (
              <div
                key={a.id}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  completedIds.includes(a.id) ? 'bg-success' :
                  skippedIds.includes(a.id) ? 'bg-muted-foreground/40' :
                  i === currentIndex ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </div>
        </div>

        {/* Activity card */}
        <Card className={cn(
          'w-full max-w-xl',
          isOverdue && 'border-destructive/50',
          category === 'calls' && 'border-primary/50'
        )}>
          <CardContent className="p-6 space-y-5">
            {/* Category badge */}
            {isOverdue && (
              <Badge variant="destructive" className="text-sm">
                🔴 URGENTE — Vencida hace {overdueDays} día{overdueDays !== 1 ? 's' : ''}
              </Badge>
            )}
            {category === 'calls' && (
              <Badge className="bg-primary/10 text-primary text-sm">
                📞 LLAMADA NUEVA
              </Badge>
            )}
            {category === 'today' && (
              <Badge variant="secondary" className="text-sm">
                ✅ PROGRAMADA HOY
              </Badge>
            )}

            {/* Activity type */}
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">{currentActivity.activity_type}</p>
              {currentActivity.prospects && (
                <>
                  <p className="text-lg font-semibold">{currentActivity.prospects.company_name}</p>
                  <p className="text-muted-foreground">{currentActivity.prospects.contact_name}</p>
                </>
              )}
            </div>

            {/* Notes */}
            {currentActivity.notes && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">📝 {currentActivity.notes}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="border-t pt-5">
              <p className="text-center text-sm font-medium text-muted-foreground mb-4">
                ¿Completaste esta actividad?
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  size="lg"
                  className="bg-success hover:bg-success/90 h-14 text-base"
                  onClick={() => {
                    setActivityModalState('complete');
                    setActivityModalOpen(true);
                  }}
                >
                  <Check className="mr-1 h-5 w-5" /> SÍ
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 text-base"
                  onClick={() => {
                    setActivityModalState('not-complete');
                    setActivityModalOpen(true);
                  }}
                >
                  <X className="mr-1 h-5 w-5" /> NO
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-14 text-base"
                  onClick={() => {
                    setActivityModalState('block');
                    setActivityModalOpen(true);
                  }}
                >
                  <Ban className="mr-1 h-5 w-5" /> BLOQ
                </Button>
              </div>
            </div>

            {/* Skip link */}
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground gap-1">
                <SkipForward className="h-3 w-3" /> Saltar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity modal */}
        {currentActivity && (
          <ActivityModal
            open={activityModalOpen}
            onOpenChange={(open) => {
              setActivityModalOpen(open);
              if (!open) setActivityModalState(null);
            }}
            activity={currentActivity}
            onActivityCompleted={handleActivityCompleted}
          />
        )}
      </div>
    );
  }

  // ─── OVERVIEW MODE ───────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sun className="h-7 w-7 text-warning" />
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Vendedor'}
        </h1>
        <p className="text-muted-foreground capitalize">{todayFormatted}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">📊 TU DÍA DE HOY:</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Urgentes */}
            {urgentActivities.length > 0 && (
              <Card className="border-l-4 border-l-destructive cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => startFocus(0)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔴</span>
                    <div>
                      <p className="font-bold text-lg">{urgentActivities.length} URGENTES</p>
                      <p className="text-sm text-muted-foreground">Actividades vencidas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Llamadas nuevas */}
            {newCalls.length > 0 && (
              <Card className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => startFocus(urgentActivities.length)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="font-bold text-lg">{newCalls.length} LLAMADAS NUEVAS</p>
                      <p className="text-sm text-muted-foreground">Primera llamada a prospectos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Programadas hoy */}
            {todayActivities.length > 0 && (
              <Card className="border-l-4 border-l-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => startFocus(urgentActivities.length + newCalls.length)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-bold text-lg">{todayActivities.length} PROGRAMADAS HOY</p>
                      <p className="text-sm text-muted-foreground">Seguimientos y tareas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Licitaciones */}
            {upcomingLicitaciones.length > 0 && (
              <Card className="border-l-4 border-l-warning cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏛️</span>
                    <div>
                      <p className="font-bold text-lg">{upcomingLicitaciones.length} LICITACIÓN{upcomingLicitaciones.length > 1 ? 'ES' : ''}</p>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const nearest = daysUntil((upcomingLicitaciones[0] as any).licitacion_fecha_cierre);
                          return nearest !== null ? `Cierra en ${nearest} día${nearest !== 1 ? 's' : ''}` : 'Próximas a vencer';
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Empty state */}
          {totalCount === 0 && upcomingLicitaciones.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-lg font-medium">¡No tienes actividades pendientes!</p>
                <p className="text-muted-foreground">Tu día está libre. Revisa el pipeline para nuevas oportunidades.</p>
              </CardContent>
            </Card>
          )}

          {/* Total + CTA */}
          {totalCount > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-center text-muted-foreground">
                TOTAL: <span className="font-bold text-foreground">{totalCount}</span> actividades
              </p>
              <Button
                size="lg"
                className="w-full h-14 text-lg gap-2"
                onClick={() => startFocus(0)}
              >
                <Play className="h-5 w-5" /> COMENZAR MI DÍA
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={() => navigate('/dashboard')}
              >
                📋 Ver Dashboard completo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
