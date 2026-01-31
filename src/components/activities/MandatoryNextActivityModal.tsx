import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Constants, Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];

// Filter out 'General' since this is for prospect activities
const ACTIVITY_TYPES = Constants.public.Enums.activity_type.filter(t => t !== 'General');

interface MandatoryNextActivityModalProps {
  open: boolean;
  prospectId: string;
  prospectName: string;
  assignedTo?: string | null;
  onActivityCreated: () => void;
}

export function MandatoryNextActivityModal({ 
  open, 
  prospectId,
  prospectName,
  assignedTo,
  onActivityCreated,
}: MandatoryNextActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType | ''>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { toast } = useToast();
  const { isManager } = useAuth();
  const createActivity = useCreateActivity();

  const minDescriptionLength = 5;

  // Ensure we're mounted on client for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('=== MandatoryNextActivityModal RENDER ===');
    console.log('open:', open);
    console.log('prospectId:', prospectId);
    console.log('prospectName:', prospectName);
    console.log('mounted:', mounted);
  }, [open, prospectId, prospectName, mounted]);

  const validateFields = (): boolean => {
    if (!activityType) {
      toast({
        title: 'Campo requerido',
        description: 'Selecciona el tipo de actividad.',
        variant: 'destructive',
      });
      return false;
    }

    if (!scheduledDate) {
      toast({
        title: 'Campo requerido',
        description: 'Selecciona la fecha programada.',
        variant: 'destructive',
      });
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduledDate < today) {
      toast({
        title: 'Fecha inválida',
        description: 'La fecha no puede ser en el pasado.',
        variant: 'destructive',
      });
      return false;
    }

    if (!description.trim() || description.trim().length < minDescriptionLength) {
      toast({
        title: 'Campo requerido',
        description: `La descripción debe tener al menos ${minDescriptionLength} caracteres.`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;

    try {
      await createActivity.mutateAsync({
        prospect_id: prospectId,
        activity_type: activityType as ActivityType,
        scheduled_date: format(scheduledDate!, 'yyyy-MM-dd'),
        notes: description.trim() || null,
        status: 'pending',
        assigned_to: assignedTo || undefined,
        created_by: isManager ? 'manager' : 'salesperson',
      });

      onActivityCreated();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la actividad.',
        variant: 'destructive',
      });
    }
  };

  // Handle attempt to close the modal
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // User is trying to close - show warning
      setShowCloseWarning(true);
    }
  };

  // Don't render until mounted (for portal)
  if (!mounted || !open) {
    console.log('MandatoryNextActivityModal: Not rendering - mounted:', mounted, 'open:', open);
    return null;
  }

  console.log('MandatoryNextActivityModal: Rendering portal to document.body');

  // Use portal to render directly to document.body to avoid parent dialog interference
  return createPortal(
    <>
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="sm:max-w-md z-[100]"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            setShowCloseWarning(true);
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setShowCloseWarning(true);
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📋 Siguiente acción con {prospectName}
            </DialogTitle>
            <DialogDescription className="font-medium text-primary">
              (Obligatorio)
            </DialogDescription>
          </DialogHeader>

          {/* Warning banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning-foreground font-medium">
              Debes definir la siguiente acción antes de continuar
            </p>
          </div>

          <div className="space-y-4">
            {/* Activity Type */}
            <div className="space-y-2">
              <Label htmlFor="activity-type">
                Tipo de actividad <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={activityType} 
                onValueChange={(v) => setActivityType(v as ActivityType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label>
                Fecha programada <span className="text-destructive">*</span>
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[110]" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      setScheduledDate(date);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Ej: Enviar contrato para firma, Llamar para confirmar reunión..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo {minDescriptionLength} caracteres ({description.trim().length}/{minDescriptionLength})
              </p>
            </div>
          </div>

          <DialogFooter>
            {/* Only one button - no cancel/skip option */}
            <Button 
              onClick={handleSubmit} 
              disabled={createActivity.isPending}
              className="w-full"
            >
              {createActivity.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Crear Actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning dialog when trying to close */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              ¿Estás seguro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Debes crear la siguiente actividad para completar el flujo. 
              Es obligatorio definir el próximo paso con este prospecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowCloseWarning(false)}>
              Volver a crear actividad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}
