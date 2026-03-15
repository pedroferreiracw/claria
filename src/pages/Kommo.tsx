import { MainLayout } from '@/components/layout/MainLayout';
import { useKommoConversations, useSyncKommo, useKommoConfig } from '@/hooks/useKommo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, RefreshCw, Loader2, AlertCircle, MessageCircle, Timer, Plug
} from 'lucide-react';
import { format } from 'date-fns';

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

  const totalConversations = conversations.length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;
  const avgResponseTime = conversations.reduce((s, c) => s + (c.avg_response_time_seconds || 0), 0) / (totalConversations || 1);

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
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending || !config?.is_connected}
              variant="outline"
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar Agora
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalConversations}</p>
                  <p className="text-xs text-muted-foreground">Conversas sincronizadas</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{activeConversations}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
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
        )}

        {config?.is_connected && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold mb-2">Sincronização Automática</h3>
            <p className="text-sm text-muted-foreground">
              As conversas são sincronizadas automaticamente a cada 15 minutos via pg_cron. 
              As análises de IA são executadas automaticamente 7 minutos após cada sincronização.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Sync: a cada 30min
              </Badge>
              <Badge variant="outline" className="text-xs">
                IA: a cada 30min (offset 15min)
              </Badge>
            </div>
          </div>
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
