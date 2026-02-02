import { createContext, useContext, useState, ReactNode } from 'react';
import { NextActivityPortal } from '@/components/activities/NextActivityPortal';
import { useToast } from '@/hooks/use-toast';

interface NextActivityData {
  prospectId: string;
  prospectName: string;
  assignedTo: string | null;
}

interface NextActivityContextType {
  showNextActivity: (data: NextActivityData) => void;
}

const NextActivityContext = createContext<NextActivityContextType | null>(null);

export function NextActivityProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NextActivityData | null>(null);
  const { toast } = useToast();

  const showNextActivity = (activityData: NextActivityData) => {
    console.log('🌍 GLOBAL: showNextActivity called', activityData);
    setData(activityData);
    setIsOpen(true);
  };

  const handleComplete = () => {
    console.log('🌍 GLOBAL: Next activity created');
    toast({
      title: 'Actividad completada',
      description: 'La actividad fue completada y la siguiente acción fue programada.',
    });
    setIsOpen(false);
    setData(null);
  };

  console.log('🌍 GLOBAL RENDER:', { isOpen, hasData: !!data });

  return (
    <NextActivityContext.Provider value={{ showNextActivity }}>
      {children}
      {data && (
        <NextActivityPortal
          isOpen={isOpen}
          prospectId={data.prospectId}
          prospectName={data.prospectName}
          assignedTo={data.assignedTo}
          onComplete={handleComplete}
        />
      )}
    </NextActivityContext.Provider>
  );
}

export function useNextActivity() {
  const context = useContext(NextActivityContext);
  if (!context) {
    throw new Error('useNextActivity must be used within NextActivityProvider');
  }
  return context;
}
