import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { QuickAddModal } from './QuickAddModal';

export function FloatingQuickAdd() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-orange-500 hover:bg-orange-600 text-white"
        size="icon"
        title="Agregar actividad rápida"
      >
        <Zap className="h-7 w-7" />
      </Button>

      <QuickAddModal open={open} onOpenChange={setOpen} />
    </>
  );
}
