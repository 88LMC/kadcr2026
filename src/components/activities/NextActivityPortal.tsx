import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, AlertTriangle, X } from 'lucide-react';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Constants, Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];

const ACTIVITY_TYPES = Constants.public.Enums.activity_type.filter(t => t !== 'General');

interface NextActivityPortalProps {
  isOpen: boolean;
  prospectId: string;
  prospectName: string;
  assignedTo?: string | null;
  onComplete: () => void;
}

export function NextActivityPortal({ 
  isOpen, 
  prospectId,
  prospectName,
  assignedTo,
  onComplete,
}: NextActivityPortalProps) {
  const [activityType, setActivityType] = useState<ActivityType | ''>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const { toast } = useToast();
  const { isManager } = useAuth();
  const createActivity = useCreateActivity();

  const minDescriptionLength = 5;

  // Debug logging
  useEffect(() => {
    console.log('=== NextActivityPortal ===');
    console.log('isOpen:', isOpen);
    console.log('prospectId:', prospectId);
    console.log('prospectName:', prospectName);
  }, [isOpen, prospectId, prospectName]);

  const isFormValid = activityType && scheduledDate && description.trim().length >= minDescriptionLength;

  const handleSubmit = async () => {
    if (!activityType) {
      toast({ title: 'Selecciona el tipo de actividad', variant: 'destructive' });
      return;
    }
    if (!scheduledDate) {
      toast({ title: 'Selecciona la fecha', variant: 'destructive' });
      return;
    }
    if (description.trim().length < minDescriptionLength) {
      toast({ title: `Mínimo ${minDescriptionLength} caracteres en descripción`, variant: 'destructive' });
      return;
    }

    try {
      await createActivity.mutateAsync({
        prospect_id: prospectId,
        activity_type: activityType as ActivityType,
        scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
        notes: description.trim() || null,
        status: 'pending',
        assigned_to: assignedTo || undefined,
        created_by: isManager ? 'manager' : 'salesperson',
      });

      onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la actividad.',
        variant: 'destructive',
      });
    }
  };

  const handleTryClose = () => {
    setShowWarning(true);
  };

  if (!isOpen) {
    return null;
  }

  console.log('NextActivityPortal: RENDERING TO DOCUMENT.BODY');

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={handleTryClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-background rounded-lg shadow-2xl w-full max-w-md border-2 border-warning animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              📋 Siguiente acción
            </h2>
            <p className="text-sm text-muted-foreground">{prospectName}</p>
          </div>
          <button 
            onClick={handleTryClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-4 mt-4 flex items-start gap-2 p-3 rounded-lg bg-warning/20 border border-warning">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            ⚠️ OBLIGATORIO: Debes definir la siguiente acción
          </p>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo de actividad <span className="text-destructive">*</span>
            </label>
            <select 
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona el tipo...</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Fecha programada <span className="text-destructive">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                'w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-left flex items-center gap-2',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                !scheduledDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {scheduledDate ? format(scheduledDate, 'PPP', { locale: es }) : 'Selecciona una fecha'}
            </button>
            
            {showCalendar && (
              <div className="border rounded-md bg-background shadow-lg">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => {
                    setScheduledDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="pointer-events-auto"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descripción <span className="text-destructive">*</span>
            </label>
            <textarea
              placeholder="Ej: Enviar contrato para firma, Llamar para confirmar reunión..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {minDescriptionLength} caracteres ({description.trim().length}/{minDescriptionLength})
              {description.trim().length >= minDescriptionLength && (
                <span className="text-green-600 ml-2">✓ Válido</span>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || createActivity.isPending}
            className={cn(
              'w-full h-10 rounded-md font-medium text-sm transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {createActivity.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            ✓ Crear Actividad
          </button>
        </div>
      </div>

      {/* Warning Dialog */}
      {showWarning && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 100000 }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-background rounded-lg shadow-2xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">¿Estás seguro?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Debes crear la siguiente actividad para completar el flujo. 
              Es obligatorio definir el próximo paso con este prospecto.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Volver a crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
