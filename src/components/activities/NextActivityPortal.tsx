import { useState, type FormEvent } from 'react';
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

  console.log('=== NextActivityPortal RENDER ===');
  console.log('isOpen:', isOpen);
  console.log('prospectId:', prospectId);
  console.log('prospectName:', prospectName);
  console.log('Will render:', isOpen && prospectId);

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

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  // CRÍTICO: NO HACER EARLY RETURN
  // if (!isOpen) return null; ❌ NUNCA HACER ESTO

  if (!isOpen || !prospectId) {
    console.log('NextActivityPortal: NOT rendering (isOpen:', isOpen, 'prospectId:', prospectId, ')');
    return null;
  }

  console.log('NextActivityPortal: RENDERING NOW');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80"
      style={{ zIndex: 999999 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleTryClose();
        }
      }}
    >
      {/* Modal */}
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-md border-4 border-orange-500"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <div>
            <h2 className="text-xl font-bold text-orange-600">⚠️ SIGUIENTE ACCIÓN</h2>
            <p className="text-sm font-semibold">{prospectName}</p>
          </div>
          <button
            type="button"
            onClick={handleTryClose}
            className="p-1 rounded hover:bg-orange-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-4 mt-4 flex items-start gap-2 p-3 rounded-lg bg-orange-100 border-2 border-orange-500">
          <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0" />
          <p className="text-sm font-bold text-orange-900">
            OBLIGATORIO: Debes definir la siguiente acción para continuar
          </p>
        </div>

        {/* Form */}
        <form className="p-4 space-y-4" onSubmit={handleFormSubmit}>
          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold">
              Tipo de actividad <span className="text-red-600">*</span>
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full h-10 px-3 rounded-md border-2 border-gray-300 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona el tipo...</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-bold">
              Fecha programada <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                'w-full h-10 px-3 rounded-md border-2 border-gray-300 text-sm text-left flex items-center gap-2',
                !scheduledDate && 'text-gray-400'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {scheduledDate ? format(scheduledDate, 'PPP', { locale: es }) : 'Selecciona fecha'}
            </button>

            {showCalendar && (
              <div className="border-2 rounded-md bg-white shadow-xl">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => {
                    setScheduledDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-bold">
              Descripción <span className="text-red-600">*</span>
            </label>
            <textarea
              placeholder="Describe la siguiente acción..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border-2 border-gray-300 text-sm resize-none focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-600">
              Mínimo {minDescriptionLength} caracteres ({description.trim().length}/{minDescriptionLength})
            </p>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || createActivity.isPending}
            className="w-full h-12 rounded-md font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createActivity.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            ✓ Crear Siguiente Actividad
          </button>
        </form>
      </div>

      {/* Warning Dialog */}
      {showWarning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 1000000 }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-bold">¿Estás seguro?</h3>
            </div>
            <p className="text-sm mb-4">
              Debes crear la siguiente actividad. Es obligatorio.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 h-10 rounded-md border-2 font-medium hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 h-10 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
