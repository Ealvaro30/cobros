'use client';

import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useCampanias } from '@/hooks/useCampanias';
import { Sun, Moon, LogOut, Menu, Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuthStore();
  const { toggleSidebar, selectedCampanaId, setSelectedCampana } = useUIStore();
  const { data: campanas } = useCampanias();

  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      // 1. Limpiar persistencia de navegador preventivamente
      localStorage.clear();
      sessionStorage.clear();
      
      // 2. Cerrar sesión en el proveedor de Auth
      await supabase.auth.signOut();
      
      // 3. Limpiar estados globales en memoria
      useAuthStore.getState().logout();
      useUIStore.setState({ selectedCampanaId: null });
      
      // 4. Limpiar cache de consultas
      queryClient.clear();
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
    } finally {
      // 5. Hard redirect: recarga completa del documento para destruir cualquier estado residual de React
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Campaign selector */}
        <select
          value={selectedCampanaId || ''}
          onChange={(e) => setSelectedCampana(e.target.value || null)}
          className="bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-[200px]"
        >
          <option value="">Todas las campañas</option>
          {campanas?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-accent transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* User menu */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium">{user?.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
