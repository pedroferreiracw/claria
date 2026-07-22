import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Lightbulb,
  Target,
  Flag,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useDevelopmentPlans, useUpdateDevelopmentPlan } from '@/hooks/useDevelopmentPlans';
import { useApp } from '@/contexts/AppContext';
import { DevelopmentPlan, PDIPriority, PDIStatus } from '@/types/goals';
import { format } from 'date-fns';
import { CreatePDIDialog } from '@/components/development/CreatePDIDialog';

const priorityConfig: Record<PDIPriority, { label: string; color: string; icon: React.ElementType }> = {
  high: { label: 'Alta', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
  medium: { label: 'Média', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  low: { label: 'Baixa', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Lightbulb },
};

const statusConfig: Record<PDIStatus, { label: string }> = {
  pending: { label: 'Pendente' },
  in_progress: { label: 'Em Progresso' },
  completed: { label: 'Concluído' },
};

export default function DevelopmentPage() {
  const { data: plans = [], isLoading } = useDevelopmentPlans();
  const { sdrs } = useApp();
  const updatePlan = useUpdateDevelopmentPlan();
  const navigate = useNavigate();

  const [selectedSdr, setSelectedSdr] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<string>('pending');

  const filteredPlans = useMemo(() => {
    let result = plans;
    if (selectedSdr !== 'all') result = result.filter(p => p.sdrId === selectedSdr);
    if (selectedTab !== 'all') result = result.filter(p => p.status === selectedTab);
    return result;
  }, [plans, selectedSdr, selectedTab]);

  const getSdr = (sdrId: string) => sdrs.find(s => s.id === sdrId);

  const handleStatusChange = (plan: DevelopmentPlan, newStatus: PDIStatus) =>
    updatePlan.mutate({ id: plan.id, data: { status: newStatus } });

  const handleViewInConversation = (plan: DevelopmentPlan) => {
    if (!plan.evaluationId) return;
    const params = new URLSearchParams();
    params.set('openEval', plan.evaluationId);
    if (plan.pdi?.evidence?.turnRef !== undefined) params.set('turnRef', String(plan.pdi.evidence.turnRef));
    if (plan.pdi?.evidence?.quote) params.set('quote', plan.pdi.evidence.quote);
    navigate(`/evaluations?${params.toString()}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-accent" />
              Plano de Desenvolvimento Individual
            </h1>
            <p className="text-muted-foreground">PDI rápido e executável — pensado para feedbacks de 10-15 min</p>
          </div>
          <CreatePDIDialog sdrs={sdrs} />
        </div>

        <div className="flex gap-4 items-center">
          <Select value={selectedSdr} onValueChange={setSelectedSdr}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por SDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os SDRs</SelectItem>
              {sdrs.map(sdr => (
                <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="in_progress">Em Progresso</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
          </TabsList>

          {(['pending', 'in_progress', 'completed'] as PDIStatus[]).map(status => (
            <TabsContent key={status} value={status} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredPlans.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum plano {statusConfig[status].label.toLowerCase()} encontrado
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ao finalizar uma avaliação, o PDI é gerado automaticamente.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPlans.map(plan => (
                    <PDICard
                      key={plan.id}
                      plan={plan}
                      sdrName={getSdr(plan.sdrId)?.name || 'SDR'}
                      onStatusChange={handleStatusChange}
                      onViewInConversation={handleViewInConversation}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}

interface PDICardProps {
  plan: DevelopmentPlan;
  sdrName: string;
  onStatusChange: (plan: DevelopmentPlan, s: PDIStatus) => void;
  onViewInConversation: (plan: DevelopmentPlan) => void;
}

function PDICard({ plan, sdrName, onStatusChange, onViewInConversation }: PDICardProps) {
  const priority = priorityConfig[plan.priority];
  const PriorityIcon = priority.icon;
  const pdi = plan.pdi;

  return (
    <Card className="glass-card">
      <CardContent className="pt-4 space-y-4">
        {/* Header: SDR + prioridade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{sdrName}</span>
          </div>
          <Badge className={priority.color}>
            <PriorityIcon className="h-3 w-3 mr-1" />
            {priority.label}
          </Badge>
        </div>

        {pdi ? (
          <>
            {/* 1. Objetivo principal */}
            <Section icon={<Target className="h-4 w-4 text-accent" />} label="Objetivo principal">
              <p className="text-sm font-semibold text-foreground">{pdi.objective}</p>
            </Section>

            {/* 2. O que aconteceu */}
            <Section icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} label="O que aconteceu">
              <p className="text-sm text-foreground/90 leading-snug line-clamp-3">{pdi.whatHappened}</p>
            </Section>

            {/* 3. Evidência */}
            {pdi.evidence?.quote && (
              <Section icon={<Eye className="h-4 w-4 text-blue-400" />} label="Evidência">
                <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-2 line-clamp-2">
                  "{pdi.evidence.quote}"
                </p>
                {plan.evaluationId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs mt-1"
                    onClick={() => onViewInConversation(plan)}
                  >
                    <Eye className="h-3 w-3 mr-1" /> Ver na conversa
                  </Button>
                )}
              </Section>
            )}

            {/* 4. Plano de ação */}
            {pdi.actions?.length > 0 && (
              <Section icon={<Lightbulb className="h-4 w-4 text-accent" />} label="Plano de ação">
                <ul className="space-y-1">
                  {pdi.actions.slice(0, 3).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                      <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 5. Meta */}
            <Section icon={<Flag className="h-4 w-4 text-green-500" />} label="Meta">
              <p className="text-sm text-foreground/90">{pdi.goal}</p>
            </Section>

            {/* 6. Critério de conclusão */}
            <Section icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} label="Critério de conclusão">
              <p className="text-sm text-foreground/90">{pdi.successCriteria}</p>
            </Section>
          </>
        ) : (
          // Fallback para PDIs antigos sem estrutura nova
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Área: <span className="font-medium text-foreground">{plan.weakArea}</span></div>
            <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-sm">{plan.recommendation}</p>
            </div>
          </div>
        )}

        {/* Footer: ações */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {plan.dueDate ? (
            <span className="text-xs text-muted-foreground">
              Prazo: {format(plan.dueDate, 'dd/MM/yyyy')}
            </span>
          ) : <span />}
          <div className="flex gap-2">
            {plan.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange(plan, 'in_progress')}>
                Iniciar
              </Button>
            )}
            {plan.status === 'in_progress' && (
              <Button size="sm" className="gradient-accent" onClick={() => onStatusChange(plan, 'completed')}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
              </Button>
            )}
            {plan.status === 'completed' && plan.completedAt && (
              <span className="text-xs text-green-400">
                Concluído em {format(plan.completedAt, 'dd/MM/yyyy')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
