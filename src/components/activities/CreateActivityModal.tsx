import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CalendarIcon, Loader2, Plus, Search } from 'lucide-react';
import { useCreateActivity } from '@/hooks/useActivities';
import { useProspectSearch } from '@/hooks/useProspects';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Constants, Database } from '@/integrations/supabase/types';

type ActivityType = Database['public']['Enums']['activity_type'];

const ACTIVITY_TYPES = Constants.public.Enums.activity_type;

interface CreateActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager?: boolean;
}

export function CreateActivityModal({ open, onOpenChange, isManager }: CreateActivityModalProps) {
  const [selectedProspect, setSelectedProspect] = useState<{
    id: string;
    company_name: string;
    contact_name: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Llamada');
  const [customType, setCustomType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isProspectPopoverOpen, setIsProspectPopoverOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { toast } = useToast();
  const createActivity = useCreateActivity();
  const { data: prospects, isLoading: isSearching } = useProspectSearch(searchTerm);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedProspect) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un prospecto.',
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
      // If urgent, set the date to yesterday so it appears in urgent section
      const finalDate = isUrgent 
        ? format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        : format(scheduledDate, 'yyyy-MM-dd');

      await createActivity.mutateAsync({
        prospect_id: selectedProspect.id,
        activity_type: activityType,
        custom_type: activityType === 'Otro' ? customType.trim() || null : null,
        scheduled_date: finalDate,
        notes: notes.trim() || null,
        status: 'pending',
        created_by: isManager ? 'manager' : 'salesperson',
      });

      toast({
        title: 'Actividad creada',
        description: `${activityType} programada para ${selectedProspect.company_name}`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la actividad.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSelectedProspect(null);
    setSearchTerm('');
    setActivityType('Llamada');
    setCustomType('');
    setScheduledDate(new Date());
    setNotes('');
    setIsUrgent(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Actividad</DialogTitle>
          <DialogDescription>
            Crear una nueva actividad de seguimiento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prospect selector */}
          <div className="space-y-2">
            <Label>Prospecto</Label>
            <Popover open={isProspectPopoverOpen} onOpenChange={setIsProspectPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedProspect && 'text-muted-foreground'
                  )}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {selectedProspect ? selectedProspect.company_name : 'Buscar prospecto...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por empresa o contacto..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isSearching ? 'Buscando...' : 'No se encontraron prospectos'}
                    </CommandEmpty>
                    <CommandGroup>
                      {prospects?.map((prospect) => (
                        <CommandItem
                          key={prospect.id}
                          value={prospect.company_name}
                          onSelect={() => {
                            setSelectedProspect(prospect);
                            setIsProspectPopoverOpen(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{prospect.company_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {prospect.contact_name}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Activity type */}
          <div className="space-y-2">
            <Label>Tipo de Actividad</Label>
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

          {/* Custom type if "Otro" */}
          {activityType === 'Otro' && (
            <div className="space-y-2">
              <Label>Tipo personalizado</Label>
              <Input
                placeholder="Describe el tipo de actividad..."
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            </div>
          )}

          {/* Date picker */}
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
                  disabled={isUrgent}
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
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Agregar notas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Urgent checkbox - only for managers */}
          {isManager && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked === true)}
              />
              <Label htmlFor="urgent" className="text-sm font-normal cursor-pointer">
                Marcar como URGENTE
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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