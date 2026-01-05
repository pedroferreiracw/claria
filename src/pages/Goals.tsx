import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Target, Plus, Calendar, Users, User, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useGoals, useAddGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useApp } from '@/contexts/AppContext';
import { Goal, MetricType, GoalStatus } from '@/types/goals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const metricTypeLabels: Record<MetricType, string> = {
  score: 'Nota Média',
  evaluations: 'Quantidade de Avaliações',
  conversions: 'Taxa de Conversão (%)',
  custom: 'Personalizado',
};

const statusConfig: Record<GoalStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Ativa', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  completed: { label: 'Concluída', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const { sdrs } = useApp();
  const addGoal = useAddGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    metricType: 'score' as MetricType,
    sdrId: '',
    squad: '',
    endDate: '',
  });

  const filteredGoals = useMemo(() => {
    if (selectedFilter === 'all') return goals;
    return goals.filter(g => g.status === selectedFilter);
  }, [goals, selectedFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addGoal.mutate({
      title: formData.title,
      description: formData.description || undefined,
      targetValue: parseFloat(formData.targetValue),
      metricType: formData.metricType,
      sdrId: formData.sdrId || undefined,
      squad: formData.squad || undefined,
      startDate: new Date(),
      endDate: new Date(formData.endDate),
      status: 'active',
    });

    setFormData({
      title: '',
      description: '',
      targetValue: '',
      metricType: 'score',
      sdrId: '',
      squad: '',
      endDate: '',
    });
    setIsDialogOpen(false);
  };

  const handleComplete = (goal: Goal) => {
    updateGoal.mutate({
      id: goal.id,
      data: { status: 'completed' },
    });
  };

  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  const getSdr = (sdrId?: string) => {
    if (!sdrId) return null;
    return sdrs.find(s => s.id === sdrId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-accent" />
              Metas e OKRs
            </h1>
            <p className="text-muted-foreground">Defina e acompanhe metas individuais e do time</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-accent">
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Aumentar nota média para 85"
                    required
                  />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da meta"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Métrica</Label>
                    <Select
                      value={formData.metricType}
                      onValueChange={(v) => setFormData({ ...formData, metricType: v as MetricType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(metricTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Alvo</Label>
                    <Input
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                      placeholder="Ex: 85"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SDR (opcional)</Label>
                    <Select
                      value={formData.sdrId || "none"}
                      onValueChange={(v) => setFormData({ ...formData, sdrId: v === "none" ? "" : v, squad: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (meta geral)</SelectItem>
                        {sdrs.map((sdr) => (
                          <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Squad (opcional)</Label>
                    <Select
                      value={formData.squad || "none"}
                      onValueChange={(v) => setFormData({ ...formData, squad: v === "none" ? "" : v, sdrId: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="Águia">Águia</SelectItem>
                        <SelectItem value="Lobo">Lobo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Data Limite</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gradient-accent" disabled={addGoal.isPending}>
                  {addGoal.isPending ? 'Criando...' : 'Criar Meta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
            >
              {filter === 'all' ? 'Todas' : filter === 'active' ? 'Ativas' : 'Concluídas'}
            </Button>
          ))}
        </div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando metas...</div>
        ) : filteredGoals.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma meta encontrada</p>
              <p className="text-sm text-muted-foreground">Crie sua primeira meta clicando no botão acima</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map((goal) => {
              const sdr = getSdr(goal.sdrId);
              const status = statusConfig[goal.status];
              const StatusIcon = status.icon;
              const progress = getProgressPercentage(goal);

              return (
                <Card key={goal.id} className="glass-card hover:border-accent/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        )}
                      </div>
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Target info */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>{metricTypeLabels[goal.metricType]}</span>
                      </div>
                      {sdr && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{sdr.name}</span>
                        </div>
                      )}
                      {goal.squad && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{goal.squad}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">
                          {goal.currentValue} / {goal.targetValue}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-right text-xs text-muted-foreground">
                        {progress.toFixed(0)}%
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Prazo: {format(goal.endDate, "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>

                    {/* Actions */}
                    {goal.status === 'active' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleComplete(goal)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteGoal.mutate(goal.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
