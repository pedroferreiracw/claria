import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useKommoConversations, useKommoMessages, useSyncKommo, useKommoConfig } from '@/hooks/useKommo';
import { useSDRs } from '@/hooks/useSDRs';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  MessageSquare, RefreshCw, Loader2, Search, Clock, User, Phone, 
  Brain, ChevronRight, AlertCircle, MessageCircle, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KommoConversation, KommoMessage } from '@/hooks/useKommo';

function formatResponseTime(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`;
}

export default function KommoPage() {
  const [selectedConversation, setSelectedConversation] = useState<KommoConversation | null>(null);
  const [sdrFilter, setSdrFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: config } = useKommoConfig();
  const { data: conversations = [], isLoading } = useKommoConversations({
    sdrId: sdrFilter !== 'all' ? sdrFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { data: messages = [], isLoading: messagesLoading } = useKommoMessages(selectedConversation?.id || null);
  const { data: sdrs = [] } = useSDRs();
  const syncMutation = useSyncKommo();
  const { analyzeProspection, isAnalyzing } = useAIAnalysis();

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (c.lead_name?.toLowerCase().includes(term) || c.lead_phone?.includes(term));
  });

  // Stats
  const totalConversations = filteredConversations.length;
  const avgResponseTime = filteredConversations.reduce((sum, c) => sum + (c.avg_response_time_seconds || 0), 0) / (totalConversations || 1);
  const activeConversations = filteredConversations.filter(c => c.status === 'active').length;
  const analyzedConversations = filteredConversations.filter(c => c.ai_analysis_id).length;

  const handleAnalyzeConversation = async () => {
    if (!selectedConversation || messages.length === 0) return;
    const conversationText = messages
      .map(m => `${m.sender_type === 'sdr' ? 'SDR' : 'Lead'} (${m.sender_name || ''}): ${m.content}`)
      .join('\n');
    await analyzeProspection(conversationText, 'WhatsApp');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kommo</h1>
              <p className="text-muted-foreground">Conversas de prospecção importadas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                Última sync: {format(new Date(config.last_sync_at), "dd/MM HH:mm")}
              </span>
            )}
            <Button 
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending || !config?.is_connected}
              variant="outline"
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Not connected warning */}
        {!config?.is_connected && (
          <div className="glass-card rounded-xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Kommo não conectada</p>
                <p className="text-sm text-muted-foreground">Configure a integração em Configurações → Integrações para começar a importar conversas.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalConversations}</p>
                <p className="text-xs text-muted-foreground">Conversas</p>
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
              <Brain className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{analyzedConversations}</p>
                <p className="text-xs text-muted-foreground">Analisadas por IA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <Select value={sdrFilter} onValueChange={setSdrFilter}>
            <SelectTrigger className="w-[180px] bg-secondary">
              <SelectValue placeholder="Filtrar por SDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os SDRs</SelectItem>
              {sdrs.filter(s => s.team_type === 'SDR').map(sdr => (
                <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-secondary">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="closed">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Sincronize com a Kommo para importar conversas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className="w-full glass-card rounded-xl p-4 hover:bg-secondary/50 transition-all text-left flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{conv.lead_name || 'Sem nome'}</p>
                    <Badge variant={conv.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {conv.status === 'active' ? 'Ativa' : 'Encerrada'}
                    </Badge>
                    {conv.ai_analysis_id && (
                      <Badge variant="outline" className="text-xs border-accent text-accent">
                        <Brain className="h-3 w-3 mr-1" /> Analisada
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {conv.lead_phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{conv.lead_phone}</span>
                    )}
                    {conv.sdr && (
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{conv.sdr.name}</span>
                    )}
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{conv.messages_count} msgs</span>
                    {conv.avg_response_time_seconds && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatResponseTime(conv.avg_response_time_seconds)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {conv.started_at && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conv.started_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation Detail Drawer */}
      <Sheet open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p>{selectedConversation?.lead_name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {selectedConversation?.lead_phone} • {selectedConversation?.messages_count} mensagens
                  {selectedConversation?.avg_response_time_seconds && (
                    <> • Resposta média: {formatResponseTime(selectedConversation.avg_response_time_seconds)}</>
                  )}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: KommoMessage) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[80%] rounded-xl p-3",
                      msg.sender_type === 'sdr'
                        ? "ml-auto bg-primary/20 text-foreground"
                        : "mr-auto bg-secondary text-foreground"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {msg.sender_name || (msg.sender_type === 'sdr' ? 'SDR' : 'Lead')}
                      {msg.response_time_seconds && msg.sender_type === 'sdr' && (
                        <span className="ml-2 text-accent">⏱ {formatResponseTime(msg.response_time_seconds)}</span>
                      )}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {format(new Date(msg.sent_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={handleAnalyzeConversation}
              disabled={isAnalyzing || messages.length === 0}
              className="w-full"
              variant="glow"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
              Analisar com IA
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
