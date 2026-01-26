import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Constants, Database } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type PhaseType = Database['public']['Enums']['phase_type'];

const PHASES = Constants.public.Enums.phase_type;

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  current_phase: PhaseType | null;
  estimated_value: number | null;
  notes?: string | null;
}

interface EditProspectModalProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProspectModal({
  prospect,
  open,
  onOpenChange,
}: EditProspectModalProps) {
  const [formData, setFormData] = useState({
    contact_name: '',
    phone: '',
    email: '',
    current_phase: '' as PhaseType | '',
    estimated_value: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (prospect) {
      setFormData({
        contact_name: prospect.contact_name || '',
        phone: prospect.phone || '',
        email: prospect.email || '',
        current_phase: prospect.current_phase || '',
        estimated_value: prospect.estimated_value?.toString() || '',
        notes: '',
      });
      setErrors({});
    }
  }, [prospect]);

  // Fetch notes separately since it's not in the main query
  useEffect(() => {
    if (prospect?.id && open) {
      supabase
        .from('prospects')
        .select('notes')
        .eq('id', prospect.id)
        .single()
        .then(({ data }) => {
          if (data?.notes) {
            setFormData(prev => ({ ...prev, notes: data.notes || '' }));
          }
        });
    }
  }, [prospect?.id, open]);

  const updateProspect = useMutation({
    mutationFn: async () => {
      if (!prospect) throw new Error('No prospect selected');

      const { error } = await supabase
        .from('prospects')
        .update({
          contact_name: formData.contact_name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          current_phase: formData.current_phase as PhaseType || null,
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospect.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast({
        title: 'Prospecto actualizado',
        description: `${prospect?.company_name} ha sido actualizado correctamente.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el prospecto.',
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'El nombre de contacto es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.estimated_value && parseFloat(formData.estimated_value) < 0) {
      newErrors.estimated_value = 'El valor debe ser positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      updateProspect.mutate();
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>✏️ Editar Prospecto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name - Read Only */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Nombre de empresa*</Label>
            <Input
              id="company_name"
              value={prospect.company_name}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El nombre de empresa no se puede modificar
            </p>
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contact_name">Nombre de contacto*</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
              placeholder="Nombre del contacto principal"
            />
            {errors.contact_name && (
              <p className="text-xs text-destructive">{errors.contact_name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+506 8888-8888"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="contacto@empresa.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phase */}
          <div className="space-y-2">
            <Label>Fase</Label>
            <Select
              value={formData.current_phase}
              onValueChange={(value) =>
                setFormData({ ...formData, current_phase: value as PhaseType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar fase" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Value */}
          <div className="space-y-2">
            <Label htmlFor="estimated_value">Valor estimado (USD)</Label>
            <Input
              id="estimated_value"
              type="number"
              min="0"
              step="0.01"
              value={formData.estimated_value}
              onChange={(e) =>
                setFormData({ ...formData, estimated_value: e.target.value })
              }
              placeholder="0.00"
            />
            {errors.estimated_value && (
              <p className="text-xs text-destructive">{errors.estimated_value}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Información adicional sobre el prospecto..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateProspect.isPending}>
              {updateProspect.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
