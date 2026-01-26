import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Constants, Database } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Plus } from 'lucide-react';

type PhaseType = Database['public']['Enums']['phase_type'];

const PHASES = Constants.public.Enums.phase_type;

interface CreateProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  current_phase: PhaseType;
  estimated_value: string;
  notes: string;
}

const initialFormData: FormData = {
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  current_phase: 'Prospección',
  estimated_value: '0',
  notes: '',
};

export default function CreateProspectModal({
  open,
  onOpenChange,
}: CreateProspectModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProspect = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('prospects').insert({
        company_name: data.company_name.trim(),
        contact_name: data.contact_name.trim() || null,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        current_phase: data.current_phase,
        estimated_value: parseFloat(data.estimated_value) || 0,
        notes: data.notes.trim() || null,
      });

      if (error) {
        console.error('Error al crear prospecto:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast({
        title: 'Prospecto agregado exitosamente',
        description: `${formData.company_name} ha sido agregado al CRM.`,
      });
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating prospect:', error);
      toast({
        title: 'Error al agregar prospecto',
        description: 'Hubo un problema al guardar el prospecto. Intenta de nuevo.',
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre de empresa (obligatorio)
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'El nombre de empresa es obligatorio';
    }

    // Validar email (si se llena, debe ser válido)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'El formato de email no es válido';
      }
    }

    // Validar valor estimado (debe ser número positivo)
    const value = parseFloat(formData.estimated_value);
    if (isNaN(value) || value < 0) {
      newErrors.estimated_value = 'El valor debe ser un número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createProspect.mutate(formData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Nuevo Prospecto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Nombre de empresa */}
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Nombre de empresa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company_name"
              placeholder="Ej: Hotel Radisson"
              value={formData.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              className={errors.company_name ? 'border-destructive' : ''}
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name}</p>
            )}
          </div>

          {/* Nombre de contacto */}
          <div className="space-y-2">
            <Label htmlFor="contact_name">Nombre de contacto</Label>
            <Input
              id="contact_name"
              placeholder="Ej: Juan Pérez"
              value={formData.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Ej: +506 8888-8888"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej: contacto@empresa.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Fase inicial */}
          <div className="space-y-2">
            <Label htmlFor="current_phase">Fase inicial</Label>
            <Select
              value={formData.current_phase}
              onValueChange={(value) => updateField('current_phase', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar fase" />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor estimado */}
          <div className="space-y-2">
            <Label htmlFor="estimated_value">Valor estimado (USD)</Label>
            <Input
              id="estimated_value"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={formData.estimated_value}
              onChange={(e) => updateField('estimated_value', e.target.value)}
              className={errors.estimated_value ? 'border-destructive' : ''}
            />
            {errors.estimated_value && (
              <p className="text-sm text-destructive">{errors.estimated_value}</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre el prospecto..."
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProspect.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createProspect.isPending}>
              {createProspect.isPending ? 'Guardando...' : 'Guardar Prospecto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
