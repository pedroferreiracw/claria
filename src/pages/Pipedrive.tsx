import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePipedrive } from '@/hooks/usePipedrive';
import { useSDRs } from '@/hooks/useSDRs';
import { SDR } from '@/types';
import { Plug, RefreshCw, Check, X, ExternalLink, TrendingUp, DollarSign, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function PipedrivePage() {
  const { config, deals, isLoading, saveConfig, syncDeals } = usePipedrive();
  const sdrsQuery = useSDRs();
  const sdrs: SDR[] = sdrsQuery.data || [];
  
  const [apiToken, setApiToken] = useState('');
  const [domain, setDomain] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveConfig = async () => {
    if (!apiToken || !domain) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSaving(true);
    try {
      await saveConfig({ apiToken, domain });
      toast.success('Configuração salva com sucesso!');
      setApiToken('');
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-pipedrive');
      if (error) throw error;
      await syncDeals();
      toast.success('Sincronização concluída!');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar com Pipedrive');
    } finally {
      setIsSyncing(false);
    }
  };

  const wonDeals = deals.filter(d => d.status === 'won');
  const lostDeals = deals.filter(d => d.status === 'lost');
  const openDeals = deals.filter(d => d.status === 'open');
  const totalValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  const getSdrName = (sdrId: string | null) => {
    if (!sdrId) return '-';
    const sdr = sdrs.find(s => s.id === sdrId);
    return sdr?.name || '-';
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integração Pipedrive</h1>
          <p className="text-muted-foreground">Conecte e sincronize dados do seu CRM</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Configuração
              </CardTitle>
              <CardDescription>
                {config?.is_connected ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <X className="h-3 w-3 mr-1" />
                    Não conectado
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config?.is_connected ? (
                <>
                  <div className="space-y-2">
                    <Label>Domínio</Label>
                    <p className="text-sm text-muted-foreground">{config.domain}</p>
                  </div>
                  {config.last_sync_at && (
                    <div className="space-y-2">
                      <Label>Última Sincronização</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(config.last_sync_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                  <Button onClick={handleSync} disabled={isSyncing} className="w-full">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio Pipedrive</Label>
                    <Input
                      id="domain"
                      placeholder="suaempresa"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: suaempresa.pipedrive.com → digite "suaempresa"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiToken">API Token</Label>
                    <Input
                      id="apiToken"
                      type="password"
                      placeholder="Seu token da API"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                    <a
                      href="https://pipedrive.readme.io/docs/how-to-find-the-api-token"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      Como obter o token? <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
                    {isSaving ? 'Salvando...' : 'Conectar'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Negócios Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{wonDeals.length}</p>
              <p className="text-sm text-muted-foreground">deals fechados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-accent" />
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-sm text-muted-foreground">em negócios ganhos</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-500">{wonDeals.length}</p>
              <p className="text-sm text-green-500/80">Ganhos</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-yellow-500">{openDeals.length}</p>
              <p className="text-sm text-yellow-500/80">Em Aberto</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-red-500">{lostDeals.length}</p>
              <p className="text-sm text-red-500/80">Perdidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Últimos Negócios
            </CardTitle>
            <CardDescription>Negócios sincronizados do Pipedrive</CardDescription>
          </CardHeader>
          <CardContent>
            {deals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>SDR</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.slice(0, 10).map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>{getSdrName(deal.sdr_id)}</TableCell>
                      <TableCell>{deal.stage_name || '-'}</TableCell>
                      <TableCell>
                        {deal.value
                          ? deal.value.toLocaleString('pt-BR', { style: 'currency', currency: deal.currency || 'BRL' })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            deal.status === 'won'
                              ? 'default'
                              : deal.status === 'lost'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={
                            deal.status === 'won'
                              ? 'bg-green-500/20 text-green-500'
                              : deal.status === 'lost'
                              ? 'bg-red-500/20 text-red-500'
                              : ''
                          }
                        >
                          {deal.status === 'won' ? 'Ganho' : deal.status === 'lost' ? 'Perdido' : 'Aberto'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {config?.is_connected
                  ? 'Nenhum negócio sincronizado ainda. Clique em "Sincronizar Agora".'
                  : 'Conecte sua conta Pipedrive para ver os negócios.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
