import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

interface ThemeSettings {
  mode: 'dark' | 'light';
}

interface BrandingSettings {
  companyName: string;
  logoUrl: string | null;
}

interface FeaturesSettings {
  audioUpload: boolean;
  aiAnalysis: boolean;
  dataExport: boolean;
}

interface ColorsSettings {
  primary: string;
  secondary: string;
  accent: string;
}

interface MenuSettings {
  dashboard: boolean;
  evaluations: boolean;
  sdrs: boolean;
  export: boolean;
}

interface AppSettings {
  theme: ThemeSettings;
  branding: BrandingSettings;
  features: FeaturesSettings;
  colors: ColorsSettings;
  menu: MenuSettings;
}

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: { mode: 'dark' },
  branding: { companyName: 'SDR Evaluator', logoUrl: null },
  features: { audioUpload: true, aiAnalysis: true, dataExport: true },
  colors: { primary: '#38035e', secondary: '#f59e0b', accent: '#9333ea' },
  menu: { dashboard: true, evaluations: true, sdrs: true, export: true },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');
      
      if (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
      
      const result = { ...defaultSettings };
      
      data.forEach((row) => {
        const key = row.setting_key as keyof AppSettings;
        const value = row.setting_value;
        
        if (key === 'theme' && value && typeof value === 'object' && 'mode' in value) {
          result.theme = value as unknown as ThemeSettings;
        } else if (key === 'branding' && value && typeof value === 'object') {
          result.branding = value as unknown as BrandingSettings;
        } else if (key === 'features' && value && typeof value === 'object') {
          result.features = value as unknown as FeaturesSettings;
        } else if (key === 'colors' && value && typeof value === 'object') {
          result.colors = value as unknown as ColorsSettings;
        } else if (key === 'menu' && value && typeof value === 'object') {
          result.menu = value as unknown as MenuSettings;
        }
      });
      
      return result;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (dbSettings) {
      setSettings(dbSettings);
      // Apply theme
      applyTheme(dbSettings.theme.mode);
      // Apply colors
      applyColors(dbSettings.colors);
    }
  }, [dbSettings]);

  const applyTheme = (mode: 'dark' | 'light') => {
    const root = document.documentElement;
    if (mode === 'light') {
      root.style.setProperty('--background', '0 0% 98%');
      root.style.setProperty('--foreground', '260 20% 10%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '260 20% 10%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '260 20% 10%');
      root.style.setProperty('--secondary', '260 10% 92%');
      root.style.setProperty('--secondary-foreground', '260 20% 10%');
      root.style.setProperty('--muted', '260 10% 90%');
      root.style.setProperty('--muted-foreground', '260 10% 40%');
      root.style.setProperty('--border', '260 10% 85%');
      root.style.setProperty('--input', '260 10% 90%');
      root.style.setProperty('--sidebar-background', '0 0% 98%');
      root.style.setProperty('--sidebar-foreground', '260 20% 10%');
      root.style.setProperty('--sidebar-accent', '260 10% 92%');
      root.style.setProperty('--sidebar-accent-foreground', '260 20% 10%');
      root.style.setProperty('--sidebar-border', '260 10% 85%');
    } else {
      root.style.setProperty('--background', '260 20% 6%');
      root.style.setProperty('--foreground', '0 0% 98%');
      root.style.setProperty('--card', '260 20% 10%');
      root.style.setProperty('--card-foreground', '0 0% 98%');
      root.style.setProperty('--popover', '260 20% 10%');
      root.style.setProperty('--popover-foreground', '0 0% 98%');
      root.style.setProperty('--secondary', '260 20% 15%');
      root.style.setProperty('--secondary-foreground', '0 0% 98%');
      root.style.setProperty('--muted', '260 15% 18%');
      root.style.setProperty('--muted-foreground', '260 10% 60%');
      root.style.setProperty('--border', '260 20% 18%');
      root.style.setProperty('--input', '260 20% 15%');
      root.style.setProperty('--sidebar-background', '260 20% 8%');
      root.style.setProperty('--sidebar-foreground', '0 0% 98%');
      root.style.setProperty('--sidebar-accent', '260 20% 15%');
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 98%');
      root.style.setProperty('--sidebar-border', '260 20% 15%');
    }
  };

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '280 85% 25%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const applyColors = (colors: ColorsSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHsl(colors.primary));
    root.style.setProperty('--accent', hexToHsl(colors.accent));
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          setting_value: value as Json,
          updated_by: user?.id 
        })
        .eq('setting_key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await updateSettingMutation.mutateAsync({ key, value });
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
