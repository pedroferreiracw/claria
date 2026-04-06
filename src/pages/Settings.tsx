import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSettings } from '@/contexts/SettingsContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Palette, 
  ToggleLeft, 
  Menu, 
  Building2,
  Sun,
  Moon,
  Loader2,
  Save,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { settings, isLoading: settingsLoading, updateSetting } = useSettings();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [isSaving, setIsSaving] = useState(false);

  // Local state for form fields
  const [themeMode, setThemeMode] = useState(settings.theme.mode);
  const [companyName, setCompanyName] = useState(settings.branding.companyName);
  const [logoUrl, setLogoUrl] = useState(settings.branding.logoUrl || '');
  const [features, setFeatures] = useState(settings.features);
  const [colors, setColors] = useState(settings.colors);
  const [menu, setMenu] = useState(settings.menu);

  // Sync local state when settings load
  useState(() => {
    setThemeMode(settings.theme.mode);
    setCompanyName(settings.branding.companyName);
    setLogoUrl(settings.branding.logoUrl || '');
    setFeatures(settings.features);
    setColors(settings.colors);
    setMenu(settings.menu);
  });

  if (roleLoading || settingsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSaveTheme = async () => {
    setIsSaving(true);
    try {
      await updateSetting('theme', { mode: themeMode });
      toast.success('Tema salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar tema');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await updateSetting('branding', { companyName, logoUrl: logoUrl || null });
      toast.success('Branding salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setIsSaving(true);
    try {
      await updateSetting('features', features);
      toast.success('Funcionalidades salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar funcionalidades');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveColors = async () => {
    setIsSaving(true);
    try {
      await updateSetting('colors', colors);
      toast.success('Cores salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar cores');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMenu = async () => {
    setIsSaving(true);
    try {
      await updateSetting('menu', menu);
      toast.success('Menu salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar menu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
            <Settings className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Configurações
              <Shield className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground">Painel de administração do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="theme" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Tema
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4" />
              Funcionalidades
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Menu
            </TabsTrigger>
          </TabsList>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Modo de Tema</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={cn(
                      "flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                      themeMode === 'dark' 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Moon className="h-8 w-8" />
                    <span className="font-medium">Modo Escuro</span>
                  </button>
                  <button
                    onClick={() => setThemeMode('light')}
                    className={cn(
                      "flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                      themeMode === 'light' 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Sun className="h-8 w-8" />
                    <span className="font-medium">Modo Claro</span>
                  </button>
                </div>
              </div>
              <Button onClick={handleSaveTheme} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Tema
              </Button>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Identidade Visual</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome exibido no sidebar"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Logo</Label>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="bg-secondary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole a URL de uma imagem para usar como logo no sidebar
                    </p>
                  </div>
                  {logoUrl && (
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                      <img 
                        src={logoUrl} 
                        alt="Logo preview" 
                        className="h-10 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveBranding} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Branding
              </Button>
            </div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Paleta de Cores</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <Input
                        type="color"
                        value={colors.primary}
                        onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                        className="w-full h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colors.secondary }}
                      />
                      <Input
                        type="color"
                        value={colors.secondary}
                        onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                        className="w-full h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <div 
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colors.accent }}
                      />
                      <Input
                        type="color"
                        value={colors.accent}
                        onChange={(e) => setColors({ ...colors, accent: e.target.value })}
                        className="w-full h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveColors} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Cores
              </Button>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Habilitar/Desabilitar Funcionalidades</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Upload de Áudio</p>
                      <p className="text-sm text-muted-foreground">Permitir upload e transcrição de áudios de ligações</p>
                    </div>
                    <Switch
                      checked={features.audioUpload}
                      onCheckedChange={(checked) => setFeatures({ ...features, audioUpload: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Análise por IA</p>
                      <p className="text-sm text-muted-foreground">Habilitar análise automática de conversas com IA</p>
                    </div>
                    <Switch
                      checked={features.aiAnalysis}
                      onCheckedChange={(checked) => setFeatures({ ...features, aiAnalysis: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Exportação de Dados</p>
                      <p className="text-sm text-muted-foreground">Permitir exportação de relatórios em Excel/CSV</p>
                    </div>
                    <Switch
                      checked={features.dataExport}
                      onCheckedChange={(checked) => setFeatures({ ...features, dataExport: checked })}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveFeatures} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Funcionalidades
              </Button>
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Itens do Menu Lateral</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Dashboard</p>
                      <p className="text-sm text-muted-foreground">Visão geral e métricas</p>
                    </div>
                    <Switch
                      checked={menu.dashboard}
                      onCheckedChange={(checked) => setMenu({ ...menu, dashboard: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">SDRs</p>
                      <p className="text-sm text-muted-foreground">Gerenciamento de vendedores</p>
                    </div>
                    <Switch
                      checked={menu.sdrs}
                      onCheckedChange={(checked) => setMenu({ ...menu, sdrs: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Avaliações</p>
                      <p className="text-sm text-muted-foreground">Criar e visualizar avaliações</p>
                    </div>
                    <Switch
                      checked={menu.evaluations}
                      onCheckedChange={(checked) => setMenu({ ...menu, evaluations: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Exportar</p>
                      <p className="text-sm text-muted-foreground">Exportar dados e relatórios</p>
                    </div>
                    <Switch
                      checked={menu.export}
                      onCheckedChange={(checked) => setMenu({ ...menu, export: checked })}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveMenu} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Menu
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </MainLayout>
  );
}
  const saveConfig = useSaveKommoConfig();
  const [subdomain, setSubdomain] = useState('');
  const [longLivedToken, setLongLivedToken] = useState('');

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />;

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Kommo CRM
            {config?.is_connected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta da Kommo para importar conversas de prospecção automaticamente.
          </p>
        </div>
      </div>

      {config?.is_connected ? (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-medium text-green-500">✓ Conectado ao subdomínio: {config.subdomain}</p>
            {config.last_sync_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sincronização: {new Date(config.last_sync_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm font-medium mb-2">Como conectar:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Na Kommo, vá em <strong>Configurações → Integrações</strong></li>
              <li>Abra sua <strong>integração privada</strong></li>
              <li>Na aba <strong>"Chaves e escopos"</strong>, clique em <strong>"Gerar token de longa duração"</strong></li>
              <li>Copie o token gerado e cole abaixo</li>
            </ol>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Subdomínio da conta</Label>
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="suaempresa (de suaempresa.kommo.com)"
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">Apenas o nome antes de .kommo.com</p>
            </div>
            <div className="space-y-2">
              <Label>Token de longa duração</Label>
              <Input
                type="password"
                value={longLivedToken}
                onChange={(e) => setLongLivedToken(e.target.value)}
                placeholder="Cole o token gerado na Kommo"
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">
                Este token não expira e permite acesso à API da Kommo sem fluxo OAuth.
              </p>
            </div>
          </div>
          <Button
            onClick={() => saveConfig.mutate({ subdomain, long_lived_token: longLivedToken })}
            disabled={!subdomain || !longLivedToken || saveConfig.isPending}
            className="w-full"
          >
            {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Conectar Kommo
          </Button>
        </div>
      )}
    </div>
  );
}
