import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'SDRs', path: '/sdrs' },
  { icon: ClipboardCheck, label: 'Avaliações', path: '/evaluations' },
  { icon: FileSpreadsheet, label: 'Exportar', path: '/export' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

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
              <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg">Cardápio Web</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center mx-auto">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
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
