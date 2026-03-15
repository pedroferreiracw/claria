import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useKommoConversations, useKommoMessages, useSyncKommo, useKommoConfig, useKommoAnalyses, useKommoAnalysisForConversation } from '@/hooks/useKommo';
import { useSDRs } from '@/hooks/useSDRs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, RefreshCw, Loader2, Search, Clock, User, Phone, 
  Brain, ChevronRight, AlertCircle, MessageCircle, Timer, 
  TrendingUp, Trophy, BarChart3, Target, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KommoConversation, KommoMessage, KommoAnalysis } from '@/hooks/useKommo';

function formatResponseTime(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`;
}

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon?: any }) {
  const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';
  const bgColor = value >= 80 ? 'bg-green-400' : value >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className={cn("font-bold", color)}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", bgColor)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Overview Tab ───
function OverviewTab({ conversations, analyses, sdrs }: { conversations: KommoConversation[]; analyses: KommoAnalysis[]; sdrs: any[] }) {
  const totalConversations = conversations.length;
  const analyzedCount = analyses.length;
  const avgScore = analyses.length > 0 
    ? Math.round(analyses.reduce((s, a) => s + a.final_score, 0) / analyses.length) 
    : 0;
  const avgResponseTime = conversations.reduce((s, c) => s + (c.avg_response_time_seconds || 0), 0) / (totalConversations || 1);

  // SDR ranking by avg score
  const sdrRanking = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[]; count: number; avgTime: number[] }>();
    for (const a of analyses) {
      if (!a.sdr_id) continue;
      const sdr = sdrs.find(s => s.id === a.sdr_id);
      if (!sdr) continue;
      if (!map.has(a.sdr_id)) map.set(a.sdr_id, { name: sdr.name, scores: [], count: 0, avgTime: [] });
      const entry = map.get(a.sdr_id)!;
      entry.scores.push(a.final_score);
      entry.count++;
    }
    // Add response time data
    for (const c of conversations) {
      if (!c.sdr_id || !c.avg_response_time_seconds) continue;
      const entry = map.get(c.sdr_id);
      if (entry) entry.avgTime.push(c.avg_response_time_seconds);
    }
    return Array.from(map.entries())
      .map(([id, d]) => ({
        id,
        name: d.name,
        avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
        count: d.count,
        avgTime: d.avgTime.length > 0 ? Math.round(d.avgTime.reduce((a, b) => a + b, 0) / d.avgTime.length) : null,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [analyses, sdrs, conversations]);

  // Top objections
  const topObjections = useMemo(() => {
    const objMap = new Map<string, number>();
    for (const a of analyses) {
      if (!a.objections) continue;
      for (const obj of a.objections as any[]) {
        const desc = obj.description || obj;
        if (typeof desc === 'string') {
          objMap.set(desc, (objMap.get(desc) || 0) + 1);
        }
      }
    }
    return Array.from(objMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [analyses]);

  // Score distribution by criteria
  const avgCriteria = useMemo(() => {
    if (analyses.length === 0) return null;
    const criteria = { abertura: 0, rapport: 0, spin: 0, bant: 0, dores: 0, geracaoValor: 0, conducaoAgendamento: 0, contornoObjecoes: 0 };
    for (const a of analyses) {
      if (!a.scores) continue;
      for (const k of Object.keys(criteria)) {
        (criteria as any)[k] += (a.scores as any)[k] || 0;
      }
    }
    for (const k of Object.keys(criteria)) {
      (criteria as any)[k] = Math.round((criteria as any)[k] / analyses.length);
    }
    return criteria;
  }, [analyses]);

  const resultDistribution = useMemo(() => {
    const dist = { prosseguiu: 0, recusou: 0, perdeu_interesse: 0 };
    for (const a of analyses) {
      if (a.result && a.result in dist) (dist as any)[a.result]++;
    }
    return dist;
  }, [analyses]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversas</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analyzedCount}</p>
              <p className="text-xs text-muted-foreground">Analisadas</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className={cn("text-2xl font-bold", avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400')}>
                {avgScore}
              </p>
              <p className="text-xs text-muted-foreground">Score Médio</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Timer className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatResponseTime(Math.round(avgResponseTime))}</p>
              <p className="text-xs text-muted-foreground">Tempo Resposta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SDR Ranking */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-400" /> Ranking de SDRs
          </h3>
          {sdrRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma análise disponível ainda.</p>
          ) : (
            <div className="space-y-3">
              {sdrRanking.map((sdr, i) => (
                <div key={sdr.id} className="flex items-center gap-3">
                  <span className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                    i === 0 ? "bg-yellow-500/20 text-yellow-400" : 
                    i === 1 ? "bg-gray-400/20 text-gray-300" : 
                    i === 2 ? "bg-amber-700/20 text-amber-600" : "bg-secondary text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sdr.name}</p>
                    <p className="text-xs text-muted-foreground">{sdr.count} análises • {sdr.avgTime ? formatResponseTime(sdr.avgTime) : '—'}</p>
                  </div>
                  <span className={cn(
                    "text-lg font-bold",
                    sdr.avgScore >= 80 ? 'text-green-400' : sdr.avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {sdr.avgScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Criteria Averages */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" /> Scores por Critério
          </h3>
          {avgCriteria ? (
            <div className="space-y-3">
              <ScoreBar label="Abertura" value={avgCriteria.abertura} icon={Zap} />
              <ScoreBar label="Rapport" value={avgCriteria.rapport} icon={User} />
              <ScoreBar label="SPIN" value={avgCriteria.spin} icon={Search} />
              <ScoreBar label="BANT" value={avgCriteria.bant} icon={Target} />
              <ScoreBar label="Dores" value={avgCriteria.dores} icon={AlertCircle} />
              <ScoreBar label="Geração de Valor" value={avgCriteria.geracaoValor} icon={TrendingUp} />
              <ScoreBar label="Agendamento" value={avgCriteria.conducaoAgendamento} icon={Clock} />
              <ScoreBar label="Objeções" value={avgCriteria.contornoObjecoes} icon={Shield} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma análise disponível.</p>
          )}
        </div>

        {/* Result Distribution */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Resultados</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-400 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-400" /> Prosseguiu
              </span>
              <span className="font-bold">{resultDistribution.prosseguiu}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-400 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" /> Recusou
              </span>
              <span className="font-bold">{resultDistribution.recusou}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-400 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" /> Perdeu Interesse
              </span>
              <span className="font-bold">{resultDistribution.perdeu_interesse}</span>
            </div>
          </div>
        </div>

        {/* Top Objections */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-accent" /> Objeções Mais Frequentes
          </h3>
          {topObjections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma objeção identificada.</p>
          ) : (
            <div className="space-y-3">
              {topObjections.map(([obj, count], i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant="secondary" className="shrink-0 mt-0.5">{count}x</Badge>
                  <p className="text-sm">{obj}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Conversations Tab ───
function ConversationsTab({ 
  conversations, sdrs, onSelectConversation 
}: { 
  conversations: KommoConversation[]; 
  sdrs: any[];
  onSelectConversation: (c: KommoConversation) => void;
}) {
  const [sdrFilter, setSdrFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = conversations.filter(c => {
    if (sdrFilter !== 'all' && c.sdr_id !== sdrFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!(c.lead_name?.toLowerCase().includes(term) || c.lead_phone?.includes(term))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
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
            {sdrs.map(sdr => (
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

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
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
                  {conv.ai_analysis_id ? (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                      <Brain className="h-3 w-3 mr-1" /> Analisada
                    </Badge>
                  ) : conv.messages_count >= 5 ? (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                      Pendente
                    </Badge>
                  ) : null}
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
  );
}

// ─── SDR Reports Tab ───
function SDRReportsTab({ analyses, sdrs, conversations }: { analyses: KommoAnalysis[]; sdrs: any[]; conversations: KommoConversation[] }) {
  const [selectedSdr, setSelectedSdr] = useState('all');

  const sdrAnalyses = selectedSdr === 'all' ? analyses : analyses.filter(a => a.sdr_id === selectedSdr);
  const sdrConversations = selectedSdr === 'all' ? conversations : conversations.filter(c => c.sdr_id === selectedSdr);

  const avgScore = sdrAnalyses.length > 0
    ? Math.round(sdrAnalyses.reduce((s, a) => s + a.final_score, 0) / sdrAnalyses.length)
    : 0;

  const avgCriteria = useMemo(() => {
    if (sdrAnalyses.length === 0) return null;
    const criteria: Record<string, number> = { abertura: 0, rapport: 0, spin: 0, bant: 0, dores: 0, geracaoValor: 0, conducaoAgendamento: 0, contornoObjecoes: 0 };
    for (const a of sdrAnalyses) {
      if (!a.scores) continue;
      for (const k of Object.keys(criteria)) {
        criteria[k] += (a.scores as any)[k] || 0;
      }
    }
    for (const k of Object.keys(criteria)) {
      criteria[k] = Math.round(criteria[k] / sdrAnalyses.length);
    }
    return criteria;
  }, [sdrAnalyses]);

  // Aggregate strengths and weaknesses
  const aggregatedFeedback = useMemo(() => {
    const strengths = new Map<string, number>();
    const weaknesses = new Map<string, number>();
    for (const a of sdrAnalyses) {
      if (!a.ai_feedback) continue;
      const fb = a.ai_feedback as any;
      for (const s of (fb.pontosFortes || [])) {
        strengths.set(s, (strengths.get(s) || 0) + 1);
      }
      for (const w of (fb.pontosFracos || [])) {
        weaknesses.set(w, (weaknesses.get(w) || 0) + 1);
      }
    }
    return {
      strengths: Array.from(strengths.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      weaknesses: Array.from(weaknesses.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [sdrAnalyses]);

  const avgTime = sdrConversations.reduce((s, c) => s + (c.avg_response_time_seconds || 0), 0) / (sdrConversations.length || 1);

  return (
    <div className="space-y-6">
      <Select value={selectedSdr} onValueChange={setSelectedSdr}>
        <SelectTrigger className="w-[250px] bg-secondary">
          <SelectValue placeholder="Selecionar SDR" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os SDRs</SelectItem>
          {sdrs.map(sdr => (
            <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sdrAnalyses.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhuma análise disponível</p>
          <p className="text-sm text-muted-foreground">As análises aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <p className={cn("text-3xl font-bold", avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400')}>
                {avgScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Score Médio</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{sdrAnalyses.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Análises</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{sdrConversations.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Conversas</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{formatResponseTime(Math.round(avgTime))}</p>
              <p className="text-xs text-muted-foreground mt-1">Tempo Resposta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Criteria Breakdown */}
            {avgCriteria && (
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Desempenho por Critério</h3>
                <div className="space-y-3">
                  <ScoreBar label="Abertura" value={avgCriteria.abertura} icon={Zap} />
                  <ScoreBar label="Rapport" value={avgCriteria.rapport} icon={User} />
                  <ScoreBar label="SPIN" value={avgCriteria.spin} icon={Search} />
                  <ScoreBar label="BANT" value={avgCriteria.bant} icon={Target} />
                  <ScoreBar label="Dores" value={avgCriteria.dores} icon={AlertCircle} />
                  <ScoreBar label="Geração de Valor" value={avgCriteria.geracaoValor} icon={TrendingUp} />
                  <ScoreBar label="Agendamento" value={avgCriteria.conducaoAgendamento} icon={Clock} />
                  <ScoreBar label="Objeções" value={avgCriteria.contornoObjecoes} icon={Shield} />
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-3">✦ Pontos Fortes Recorrentes</h3>
                {aggregatedFeedback.strengths.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ul className="space-y-2">
                    {aggregatedFeedback.strengths.map(([s, count], i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">{count}x</Badge>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-3">⚠ Pontos Fracos Recorrentes</h3>
                {aggregatedFeedback.weaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ul className="space-y-2">
                    {aggregatedFeedback.weaknesses.map(([w, count], i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">{count}x</Badge>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Conversation Detail with Analysis ───
function ConversationDrawer({ 
  conversation, onClose 
}: { 
  conversation: KommoConversation | null; 
  onClose: () => void;
}) {
  const { data: messages = [], isLoading: messagesLoading } = useKommoMessages(conversation?.id || null);
  const { data: analysis } = useKommoAnalysisForConversation(conversation?.id || null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (!conversation) return null;

  return (
    <Sheet open={!!conversation} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p>{conversation.lead_name || 'Sem nome'}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {conversation.lead_phone} • {conversation.messages_count} mensagens
                {conversation.avg_response_time_seconds && (
                  <> • Resposta: {formatResponseTime(conversation.avg_response_time_seconds)}</>
                )}
              </p>
            </div>
          </SheetTitle>
          {analysis && (
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" variant={!showAnalysis ? 'default' : 'outline'} 
                onClick={() => setShowAnalysis(false)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
              </Button>
              <Button 
                size="sm" variant={showAnalysis ? 'default' : 'outline'}
                onClick={() => setShowAnalysis(true)}
              >
                <Brain className="h-3.5 w-3.5 mr-1" /> Análise IA
              </Button>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {showAnalysis && analysis ? (
            <div className="space-y-4">
              {/* Score */}
              <div className="text-center py-4">
                <p className={cn(
                  "text-5xl font-bold",
                  analysis.final_score >= 80 ? 'text-green-400' : analysis.final_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {analysis.final_score}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Score Final</p>
                {analysis.result && (
                  <Badge className="mt-2" variant={
                    analysis.result === 'prosseguiu' ? 'default' : 'secondary'
                  }>
                    {analysis.result === 'prosseguiu' ? '✓ Prosseguiu' : 
                     analysis.result === 'recusou' ? '✗ Recusou' : '— Perdeu Interesse'}
                  </Badge>
                )}
              </div>

              {/* Criteria */}
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-sm">Critérios</h4>
                {analysis.scores && Object.entries(analysis.scores).map(([key, val]) => (
                  <ScoreBar key={key} label={
                    key === 'abertura' ? 'Abertura' :
                    key === 'rapport' ? 'Rapport' :
                    key === 'spin' ? 'SPIN' :
                    key === 'bant' ? 'BANT' :
                    key === 'dores' ? 'Dores' :
                    key === 'geracaoValor' ? 'Geração de Valor' :
                    key === 'conducaoAgendamento' ? 'Agendamento' :
                    key === 'contornoObjecoes' ? 'Objeções' : key
                  } value={val as number} />
                ))}
              </div>

              {/* Feedback */}
              {analysis.ai_feedback && (
                <div className="space-y-3">
                  {(analysis.ai_feedback as any).pontosFortes?.length > 0 && (
                    <div className="glass-card rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-green-400 mb-2">Pontos Fortes</h4>
                      <ul className="space-y-1">
                        {(analysis.ai_feedback as any).pontosFortes.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(analysis.ai_feedback as any).pontosFracos?.length > 0 && (
                    <div className="glass-card rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-red-400 mb-2">Pontos Fracos</h4>
                      <ul className="space-y-1">
                        {(analysis.ai_feedback as any).pontosFracos.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : messagesLoading ? (
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
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ───
export default function KommoPage() {
  const [selectedConversation, setSelectedConversation] = useState<KommoConversation | null>(null);
  const { data: config } = useKommoConfig();
  const { data: conversations = [], isLoading } = useKommoConversations();
  const { data: analyses = [] } = useKommoAnalyses();
  const { data: sdrs = [] } = useSDRs();
  const syncMutation = useSyncKommo();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <Brain className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Central de Inteligência Comercial</h1>
              <p className="text-muted-foreground">Análise automatizada de prospecções via Kommo</p>
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
              size="sm"
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="conversations" className="gap-1.5">
                <MessageSquare className="h-4 w-4" /> Conversas
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5">
                <TrendingUp className="h-4 w-4" /> Relatórios SDR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab conversations={conversations} analyses={analyses} sdrs={sdrs} />
            </TabsContent>
            <TabsContent value="conversations">
              <ConversationsTab conversations={conversations} sdrs={sdrs} onSelectConversation={setSelectedConversation} />
            </TabsContent>
            <TabsContent value="reports">
              <SDRReportsTab analyses={analyses} sdrs={sdrs} conversations={conversations} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ConversationDrawer 
        conversation={selectedConversation} 
        onClose={() => setSelectedConversation(null)} 
      />
    </MainLayout>
  );
}
