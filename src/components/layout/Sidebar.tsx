import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  LogOut,
  Settings,
  Target,
  TrendingUp,
  GitCompare,
  BookOpen,
  Trophy,
  Plug,
  Video,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const baseMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', key: 'dashboard' },
  { icon: Brain, label: 'Inteligência Comercial', path: '/intelligence', key: 'intelligence' },
  { icon: Target, label: 'Metas', path: '/goals', key: 'goals' },
  { icon: TrendingUp, label: 'PDI', path: '/development', key: 'development' },
  { icon: GitCompare, label: 'Comparar', path: '/compare', key: 'compare' },
  { icon: BookOpen, label: 'Boas Práticas', path: '/best-practices', key: 'bestPractices' },
  { icon: Trophy, label: 'Gamificação', path: '/gamification', key: 'gamification' },
];

const colaboradoresSubmenu = [
  { label: 'SDRs', path: '/sdrs' },
  { label: 'Closers', path: '/closers' },
];

const evaluationsSubmenu = [
  { label: 'SDRs', path: '/evaluations' },
  { label: 'Closers', path: '/closer-evaluations' },
];


export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [colaboradoresOpen, setColaboradoresOpen] = useState(false);
  const [evaluationsOpen, setEvaluationsOpen] = useState(false);
  
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const { isAdmin } = useUserRole();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

  // Check if current path is in a submenu
  const isInColaboradores = colaboradoresSubmenu.some(item => location.pathname === item.path);
  const isInEvaluations = evaluationsSubmenu.some(item => location.pathname === item.path);
  

  // Auto-expand if active route is inside
  const colaboradoresExpanded = colaboradoresOpen || isInColaboradores;
  const evaluationsExpanded = evaluationsOpen || isInEvaluations;
  

  // Filter menu items based on settings (show by default if not explicitly disabled)
  const menuItems = baseMenuItems.filter(item => {
    const menuKey = item.key as keyof typeof settings.menu;
    return settings.menu[menuKey] !== false;
  });

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 glass-card",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          {!collapsed && (
            <div className="flex items-center gap-2">
              {settings.branding.logoUrl ? (
                <img 
                  src={settings.branding.logoUrl} 
                  alt="Logo" 
                  className="h-8 w-8 rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-accent-foreground" />
                </div>
              )}
              <span className="font-bold text-lg">{settings.branding.companyName}</span>
            </div>
          )}
          {collapsed && (
            settings.branding.logoUrl ? (
              <img 
                src={settings.branding.logoUrl} 
                alt="Logo" 
                className="h-8 w-8 rounded-lg object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center mx-auto">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Colaboradores Submenu */}
          {(settings.menu.sdrs !== false || settings.menu.closers !== false) && (
            <Collapsible open={!collapsed && colaboradoresExpanded} onOpenChange={setColaboradoresOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full",
                    isInColaboradores
                      ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Users className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Colaboradores</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", colaboradoresExpanded && "rotate-180")} />
                    </>
                  )}
                </button>
              </CollapsibleTrigger>
              {!collapsed && (
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                  {colaboradoresSubmenu.map((subItem) => {
                    const isSubActive = location.pathname === subItem.path;
                    const menuKey = subItem.path === '/sdrs' ? 'sdrs' : 'closers';
                    if (settings.menu[menuKey as keyof typeof settings.menu] === false) return null;
                    return (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          isSubActive
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <span>{subItem.label}</span>
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              )}
            </Collapsible>
          )}

          {/* Evaluations Submenu */}
          {settings.menu.evaluations !== false && (
            <Collapsible open={!collapsed && evaluationsExpanded} onOpenChange={setEvaluationsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full",
                    isInEvaluations
                      ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <ClipboardCheck className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Avaliações</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", evaluationsExpanded && "rotate-180")} />
                    </>
                  )}
                </button>
              </CollapsibleTrigger>
              {!collapsed && (
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                  {evaluationsSubmenu.map((subItem) => {
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          isSubActive
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <span>{subItem.label}</span>
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              )}
            </Collapsible>
          )}


          {/* Admin Settings Link */}
          {isAdmin && (
            <NavLink
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                location.pathname === '/settings'
                  ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Configurações</span>}
            </NavLink>
          )}
        </nav>

        {/* User & Actions */}
        <div className="p-3 border-t border-border/50 space-y-2">
          {user && !collapsed && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn("w-full text-destructive hover:text-destructive hover:bg-destructive/10", collapsed ? "justify-center" : "justify-start")}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Recolher</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
