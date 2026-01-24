import { useState } from 'react';
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
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { useCreateActivity } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Constants, Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type ActivityType = Database['public']['Enums']['activity_type'];

const ACTIVITY_TYPES = Constants.public.Enums.activity_type;

interface NextActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string;
  prospectName: string;
  activity?: {
    id: string;
    activity_type: ActivityType;
    prospects: {
      company_name: string;
      contact_name: string;
    } | null;
  };
}

export function NextActivityModal({ 
  open, 
  onOpenChange, 
  prospectId: initialProspectId,
  prospectName,
  activity,
}: NextActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>('Seguimiento');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  );
  const [notes, setNotes] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { toast } = useToast();
  const createActivity = useCreateActivity();

  // Fetch the actual prospect_id from the activity
  const { data: activityData } = useQuery({
    queryKey: ['activity', activity?.id],
    queryFn: async () => {
      if (!activity?.id) return null;
      const { data, error } = await supabase
        .from('activities')
        .select('prospect_id')
        .eq('id', activity.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activity?.id && !initialProspectId,
  });

  const prospectId = initialProspectId || activityData?.prospect_id;

  const handleSubmit = async () => {
    if (!prospectId) {
      toast({
        title: 'Error',
        description: 'No se encontró el prospecto.',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una fecha.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createActivity.mutateAsync({
        prospect_id: prospectId,
        activity_type: activityType,
        scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
        status: 'pending',
        created_by: 'salesperson',
      });

      toast({
        title: 'Actividad creada',
        description: `${activityType} programada para ${format(scheduledDate, 'PPP', { locale: es })}`,
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la actividad.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setActivityType('Seguimiento');
    setScheduledDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    setNotes('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programar Siguiente Actividad</DialogTitle>
          <DialogDescription>
            {prospectName || activity?.prospects?.company_name || 'Prospecto'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-type">Tipo de Actividad</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
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

          <div className="space-y-2">
            <Label>Fecha Programada</Label>
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
              <PopoverContent className="w-auto p-0" align="start">
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Agregar notas sobre la actividad..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createActivity.isPending}>
            {createActivity.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Crear Actividad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}