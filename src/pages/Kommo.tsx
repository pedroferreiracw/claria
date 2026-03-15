import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useKommoConversations, useSyncKommo, useKommoConfig } from '@/hooks/useKommo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, RefreshCw, Loader2, AlertCircle, MessageCircle, Timer, Plug,
  CheckCircle2, XCircle, Search, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatResponseTime(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`;
}

export default function KommoPage() {
  const { data: config } = useKommoConfig();
  const { data: conversations = [], isLoading } = useKommoConversations();
  const syncMutation = useSyncKommo();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const totalConversations = conversations.length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;
  const withMessages = conversations.filter(c => c.messages_count > 0).length;
  const avgResponseTime = conversations.reduce((s, c) => s + (c.avg_response_time_seconds || 0), 0) / (totalConversations || 1);

  const runDiagnostic = async () => {
    setDiagnosing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-kommo', {
        body: { mode: 'diagnose' },
      });
      if (error) throw error;
      setDiagResult(data);
      toast.success('Diagnóstico concluído');
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data?.messages_synced !== undefined) {
          toast.success(`Sync: ${data.leads_synced} leads, ${data.messages_synced} mensagens`);
        }
      }
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <Plug className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kommo</h1>
              <p className="text-muted-foreground">Integração e sincronização de conversas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                Sync: {format(new Date(config.last_sync_at), "dd/MM HH:mm")}
              </span>
            )}
            <Button
              onClick={runDiagnostic}
              disabled={diagnosing || !config?.is_connected}
              variant="outline"
              size="sm"
            >
              {diagnosing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Diagnosticar
            </Button>
            <Button 
              onClick={handleSync} 
              disabled={syncMutation.isPending || !config?.is_connected}
              variant="outline"
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
          </div>
        </div>

        {!config?.is_connected && (
          <div className="glass-card rounded-xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Kommo não conectada</p>
                <p className="text-sm text-muted-foreground">Configure em Configurações → Integrações.</p>
              </div>
            </div>
          </div>
        )}

        {config?.is_connected && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalConversations}</p>
                    <p className="text-xs text-muted-foreground">Leads sincronizados</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{withMessages}</p>
                    <p className="text-xs text-muted-foreground">Com mensagens</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{activeConversations}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatResponseTime(Math.round(avgResponseTime))}</p>
                    <p className="text-xs text-muted-foreground">Tempo médio resposta</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Results */}
            {diagResult?.results && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Resultado do Diagnóstico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CRM Token */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Token CRM</p>
                        <p className="text-xs text-muted-foreground">
                          {diagResult.results.talks?.count ?? 0} talks encontrados
                        </p>
                      </div>
                    </div>

                    {/* Contact Chats API */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {diagResult.results.contact_chats?.status === 200 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">Contact Chats API</p>
                        <p className="text-xs text-muted-foreground">
                          {diagResult.results.contact_chats?.status === 400
                            ? 'Requer canal de chat vinculado'
                            : `HTTP ${diagResult.results.contact_chats?.status || 'N/A'}`}
                        </p>
                      </div>
                    </div>

                    {/* Amojo Chat History */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {diagResult.results.amojo_status === 'SUCCESS' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">Amojo Chat History</p>
                        <p className="text-xs text-muted-foreground">
                          {diagResult.results.amojo_status === 'NO_CHAT_MAPPING' && 'Chat não mapeado (404)'}
                          {diagResult.results.amojo_status === 'INVALID_SIGNATURE' && 'Assinatura inválida (401)'}
                          {diagResult.results.amojo_status === 'FORBIDDEN_CHANNEL' && 'Canal não autorizado (403)'}
                          {diagResult.results.amojo_status === 'SUCCESS' && 'Funcionando ✓'}
                          {!['NO_CHAT_MAPPING', 'INVALID_SIGNATURE', 'FORBIDDEN_CHANNEL', 'SUCCESS'].includes(diagResult.results.amojo_status) && 
                            (diagResult.results.amojo_status || 'N/A')}
                        </p>
                      </div>
                    </div>

                    {/* Notes API */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {(diagResult.results.notes?.count || 0) > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">Notes API</p>
                        <p className="text-xs text-muted-foreground">
                          {diagResult.results.notes?.count ?? 0} notas encontradas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Talk origins */}
                  {diagResult.results.talks?.samples && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm mb-2">Canais detectados (origens)</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(diagResult.results.talks.samples.map((t: any) => t.origin))].map((origin: any) => (
                          <Badge key={origin} variant="outline" className="text-xs">
                            {origin}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Auto-sync info */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-2">Sincronização Automática</h3>
              <p className="text-sm text-muted-foreground">
                Os leads são sincronizados automaticamente a cada 15 minutos via pg_cron. 
                As análises de IA são executadas automaticamente 7 minutos após cada sincronização.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" /> Sync: a cada 15min
                </Badge>
                <Badge variant="outline" className="text-xs">
                  IA: a cada 15min (offset 7min)
                </Badge>
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
