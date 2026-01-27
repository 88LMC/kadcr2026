import { ReactNode, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Kanban,
  TableProperties,
  Users,
  LogOut, 
  Plus, 
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { CreateActivityModal } from '@/components/activities/CreateActivityModal';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, loading, signOut, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getCurrentTab = () => {
    if (location.pathname === '/pipeline') return 'pipeline';
    if (location.pathname === '/gestion') return 'gestion';
    if (location.pathname === '/equipo') return 'equipo';
    return 'dashboard';
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'pipeline':
        navigate('/pipeline');
        break;
      case 'gestion':
        navigate('/gestion');
        break;
      case 'equipo':
        navigate('/equipo');
        break;
      default:
        navigate('/dashboard');
    }
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">VH</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">Van Heusen CRM</h1>
              <p className="text-xs text-muted-foreground">Ventas B2B</p>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden md:block">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2">
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="gestion" className="gap-2">
                  <TableProperties className="h-4 w-4" />
                  Gestión
                </TabsTrigger>
                {isManager && (
                  <TabsTrigger value="equipo" className="gap-2">
                    <Users className="h-4 w-4" />
                    Equipo
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          {/* User info & actions */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.role === 'manager' ? 'Manager' : 'Vendedor'}
              </p>
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "absolute left-0 right-0 border-b bg-card shadow-lg md:hidden",
          isMobileMenuOpen ? "block" : "hidden"
        )}>
          <div className="container px-4 py-4">
            <div className="flex flex-col gap-2">
              <Button
                variant={currentTab === 'dashboard' ? 'default' : 'ghost'}
                className="justify-start gap-2"
                onClick={() => handleTabChange('dashboard')}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={currentTab === 'pipeline' ? 'default' : 'ghost'}
                className="justify-start gap-2"
                onClick={() => handleTabChange('pipeline')}
              >
                <Kanban className="h-4 w-4" />
                Pipeline
              </Button>
              <Button
                variant={currentTab === 'gestion' ? 'default' : 'ghost'}
                className="justify-start gap-2"
                onClick={() => handleTabChange('gestion')}
              >
                <TableProperties className="h-4 w-4" />
                Gestión
              </Button>
              {isManager && (
                <Button
                  variant={currentTab === 'equipo' ? 'default' : 'ghost'}
                  className="justify-start gap-2"
                  onClick={() => handleTabChange('equipo')}
                >
                  <Users className="h-4 w-4" />
                  Equipo
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-6">
        {children}
      </main>

      {/* Floating action button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Create Activity Modal */}
      <CreateActivityModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen}
        isManager={isManager}
      />
    </div>
  );
}
