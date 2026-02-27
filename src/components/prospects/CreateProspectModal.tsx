import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { B2B_PHASES, LICITACION_PHASES, type ProspectType } from '@/lib/licitacion-constants';

type PhaseType = Database['public']['Enums']['phase_type'];

interface CreateProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  prospect_type: ProspectType;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  current_phase: string;
  estimated_value: string;
  notes: string;
  // Licitacion fields
  licitacion_numero: string;
  licitacion_institucion: string;
  licitacion_fecha_cierre: string;
  licitacion_fecha_publicacion: string;
  licitacion_fecha_apertura: string;
  licitacion_monto_estimado: string;
}

const initialFormData: FormData = {
  prospect_type: 'regular',
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  current_phase: '',
  estimated_value: '0',
  notes: '',
  licitacion_numero: '',
  licitacion_institucion: '',
  licitacion_fecha_cierre: '',
  licitacion_fecha_publicacion: '',
  licitacion_fecha_apertura: '',
  licitacion_monto_estimado: '',
};

export default function CreateProspectModal({
  open,
  onOpenChange,
}: CreateProspectModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLicitacion = formData.prospect_type === 'licitacion';
  const availablePhases = isLicitacion ? LICITACION_PHASES : B2B_PHASES;

  const createProspect = useMutation({
    mutationFn: async (data: FormData) => {
      const defaultPhase = data.prospect_type === 'licitacion' ? 'Por Publicar' : 'Prospección';
      const phase = data.current_phase || defaultPhase;

      const insertData: Record<string, any> = {
        company_name: data.company_name.trim(),
        contact_name: data.contact_name.trim() || '',
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        current_phase: phase,
        estimated_value: parseFloat(data.estimated_value) || 0,
        notes: data.notes.trim() || null,
        prospect_type: data.prospect_type,
      };

      if (data.prospect_type === 'licitacion') {
        insertData.licitacion_numero = data.licitacion_numero.trim() || null;
        insertData.licitacion_institucion = data.licitacion_institucion.trim() || null;
        insertData.licitacion_fecha_cierre = data.licitacion_fecha_cierre || null;
        insertData.licitacion_fecha_publicacion = data.licitacion_fecha_publicacion || null;
        insertData.licitacion_fecha_apertura = data.licitacion_fecha_apertura || null;
        insertData.licitacion_monto_estimado = parseFloat(data.licitacion_monto_estimado) || null;
      }

      const { error } = await supabase.from('prospects').insert(insertData as any);
      if (error) throw error;
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

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'El nombre de empresa es obligatorio';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'El formato de email no es válido';
      }
    }

    const value = parseFloat(formData.estimated_value);
    if (isNaN(value) || value < 0) {
      newErrors.estimated_value = 'El valor debe ser un número positivo';
    }

    // Licitacion validation
    if (isLicitacion) {
      if (!formData.licitacion_institucion.trim()) {
        newErrors.licitacion_institucion = 'La institución es obligatoria para licitaciones';
      }
      if (!formData.licitacion_fecha_cierre) {
        newErrors.licitacion_fecha_cierre = 'La fecha de cierre es obligatoria para licitaciones';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createProspect.mutate(formData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (type: ProspectType) => {
    setFormData(prev => ({
      ...prev,
      prospect_type: type,
      current_phase: '',
    }));
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
          {/* Prospect Type */}
          <div className="space-y-2">
            <Label>Tipo de prospecto</Label>
            <RadioGroup
              value={formData.prospect_type}
              onValueChange={(v) => handleTypeChange(v as ProspectType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="type-regular" />
                <Label htmlFor="type-regular" className="font-normal cursor-pointer">
                  Regular (B2B)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="licitacion" id="type-licitacion" />
                <Label htmlFor="type-licitacion" className="font-normal cursor-pointer">
                  🏛️ Licitación
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">
              {isLicitacion ? 'Nombre del proyecto / licitación' : 'Nombre de empresa'}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company_name"
              placeholder={isLicitacion ? 'Ej: Uniformes MOPT 2025' : 'Ej: Hotel Radisson'}
              value={formData.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              className={errors.company_name ? 'border-destructive' : ''}
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name}</p>
            )}
          </div>

          {/* Licitacion-specific fields */}
          {isLicitacion && (
            <div className="space-y-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800">📋 Datos de Licitación</p>

              <div className="space-y-2">
                <Label htmlFor="licitacion_numero">Número de Licitación</Label>
                <Input
                  id="licitacion_numero"
                  placeholder="Ej: MOPT-2025-001"
                  value={formData.licitacion_numero}
                  onChange={(e) => updateField('licitacion_numero', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licitacion_institucion">
                  Institución Contratante <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licitacion_institucion"
                  placeholder="Ej: MOPT, ICE, CCSS"
                  value={formData.licitacion_institucion}
                  onChange={(e) => updateField('licitacion_institucion', e.target.value)}
                  className={errors.licitacion_institucion ? 'border-destructive' : ''}
                />
                {errors.licitacion_institucion && (
                  <p className="text-sm text-destructive">{errors.licitacion_institucion}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licitacion_fecha_cierre">
                  Fecha de Cierre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licitacion_fecha_cierre"
                  type="date"
                  value={formData.licitacion_fecha_cierre}
                  onChange={(e) => updateField('licitacion_fecha_cierre', e.target.value)}
                  className={errors.licitacion_fecha_cierre ? 'border-destructive' : ''}
                />
                {errors.licitacion_fecha_cierre && (
                  <p className="text-sm text-destructive">{errors.licitacion_fecha_cierre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licitacion_fecha_publicacion">Fecha de Publicación</Label>
                <Input
                  id="licitacion_fecha_publicacion"
                  type="date"
                  value={formData.licitacion_fecha_publicacion}
                  onChange={(e) => updateField('licitacion_fecha_publicacion', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licitacion_fecha_apertura">Fecha de Apertura</Label>
                <Input
                  id="licitacion_fecha_apertura"
                  type="date"
                  value={formData.licitacion_fecha_apertura}
                  onChange={(e) => updateField('licitacion_fecha_apertura', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licitacion_monto_estimado">Monto Estimado (₡)</Label>
                <Input
                  id="licitacion_monto_estimado"
                  type="number"
                  min="0"
                  placeholder="Ej: 45000000"
                  value={formData.licitacion_monto_estimado}
                  onChange={(e) => updateField('licitacion_monto_estimado', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contact_name">Nombre de contacto</Label>
            <Input
              id="contact_name"
              placeholder="Ej: Juan Pérez"
              value={formData.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
            />
          </div>

          {/* Phone */}
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

          {/* Phase */}
          <div className="space-y-2">
            <Label htmlFor="current_phase">Fase inicial</Label>
            <Select
              value={formData.current_phase}
              onValueChange={(value) => updateField('current_phase', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLicitacion ? 'Por Publicar (default)' : 'Prospección (default)'} />
              </SelectTrigger>
              <SelectContent>
                {availablePhases.map((phase) => (
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
              placeholder="0"
              value={formData.estimated_value}
              onChange={(e) => updateField('estimated_value', e.target.value)}
              className={errors.estimated_value ? 'border-destructive' : ''}
            />
            {errors.estimated_value && (
              <p className="text-sm text-destructive">{errors.estimated_value}</p>
            )}
          </div>

          {/* Notes */}
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

          {/* Buttons */}
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
