import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Loader2, Search } from 'lucide-react';
import { useCreateActivity } from '@/hooks/useActivities';
import { useProspectSearch } from '@/hooks/useProspects';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_TYPES = [
  'Llamada', 'Visita', 'Correo', 'Cotización', 'Propuesta', 'Seguimiento', 'Facturación'
] as const;

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createActivity = useCreateActivity();

  const [prospectId, setProspectId] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('Llamada');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showProspectList, setShowProspectList] = useState(false);

  const { data: prospects, isLoading: isSearching } = useProspectSearch(searchTerm);

  const selectedProspect = prospects?.find(p => p.id === prospectId);

  const resetForm = () => {
    setProspectId('');
    setActivityType('Llamada');
    setNotes('');
    setDate(new Date());
    setSearchTerm('');
    setShowProspectList(false);
  };

  const handleSave = async () => {
    if (!prospectId || !user?.id) return;

    try {
      await createActivity.mutateAsync({
        prospect_id: prospectId,
        activity_type: activityType as any,
        notes: notes || null,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        assigned_to: user.id,
        status: 'pending',
        created_by: 'salesperson',
      });

      toast({
        title: '✅ Actividad guardada',
        description: `${activityType} programada para ${format(date, 'dd/MM/yyyy')}`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la actividad',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-4 gap-3">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">⚡ Actividad Rápida</DialogTitle>
        </DialogHeader>

        {/* Prospect search */}
        <div className="space-y-1.5">
          <Label className="text-sm">Prospecto *</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar prospecto..."
              value={selectedProspect ? (selectedProspect.company_name || selectedProspect.contact_name || '') : searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setProspectId('');
                setShowProspectList(true);
              }}
              onFocus={() => setShowProspectList(true)}
              className="pl-9 h-9"
            />
            {showProspectList && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : prospects?.length ? (
                  prospects.map((p) => (
                    <button
                      key={p.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent truncate"
                      onClick={() => {
                        setProspectId(p.id);
                        setSearchTerm('');
                        setShowProspectList(false);
                      }}
                    >
                      <span className="font-medium">{p.company_name}</span>
                      {p.contact_name && (
                        <span className="text-muted-foreground ml-1">— {p.contact_name}</span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Type + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tipo</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-sm">Notas</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Qué pasó o qué harás?"
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter className="pt-1 gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="h-9">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!prospectId || createActivity.isPending}
            className="h-9 bg-green-600 hover:bg-green-700"
          >
            {createActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
