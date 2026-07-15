import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users, LayoutGrid, Table } from 'lucide-react';
import { Squad, SDR, Scores } from '@/types';
import { SQUADS } from '@/config/squads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SDRPerformanceCard } from '@/components/sdr/SDRPerformanceCard';
import { SDRDetailDrawer } from '@/components/sdr/SDRDetailDrawer';

export default function SDRsPage() {
  const { sdrs, evaluations, addSDR, updateSDR, deleteSDR } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSDR, setEditingSDR] = useState<SDR | null>(null);
  const [selectedSDR, setSelectedSDR] = useState<SDR | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [formData, setFormData] = useState({
    name: '',
    squad: '' as Squad | '',
    role: '',
  });

  // Calculate team average scores
  const teamAverageScores = useMemo(() => {
    if (evaluations.length === 0) return undefined;
    
    const scoreKeys: (keyof Scores)[] = ['abertura', 'rapport', 'bant', 'dores', 'geracaoValor', 'conducaoAgendamento', 'gatilhoCompromisso', 'contornoObjecoes', 'comunicacaoOratoria'];
    const avgScores: Partial<Scores> = {};
    
    scoreKeys.forEach(key => {
      avgScores[key] = Math.round(
        evaluations.reduce((sum, e) => sum + (e.scores[key] || 0), 0) / evaluations.length
      );
    });
    
    return avgScores as Scores;
  }, [evaluations]);

  // Rank SDRs by average score
  const rankedSDRs = useMemo(() => {
    return sdrs.map(sdr => {
      const sdrEvals = evaluations.filter(e => e.sdrId === sdr.id);
      const avgScore = sdrEvals.length > 0
        ? Math.round(sdrEvals.reduce((sum, e) => sum + e.finalScore, 0) / sdrEvals.length)
        : 0;
      return { sdr, avgScore, evaluations: sdrEvals };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [sdrs, evaluations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.squad || !formData.role) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingSDR) {
      updateSDR(editingSDR.id, formData as Partial<SDR>);
      toast.success('SDR atualizado com sucesso!');
    } else {
      addSDR(formData as Omit<SDR, 'id' | 'createdAt'>);
      toast.success('SDR cadastrado com sucesso!');
    }

    setFormData({ name: '', squad: '', role: '' });
    setEditingSDR(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (sdr: SDR) => {
    setEditingSDR(sdr);
    setFormData({ name: sdr.name, squad: sdr.squad, role: sdr.role });
    setIsDialogOpen(true);
  };

  const squadCounts = useMemo(
    () =>
      SQUADS.reduce<Record<Squad, number>>((acc, sq) => {
        acc[sq.name] = sdrs.filter((s) => s.squad === sq.name).length;
        return acc;
      }, {} as Record<Squad, number>),
    [sdrs]
  );

  const stats = useMemo(() => {
    const total = sdrs.length;
    const avgScore = rankedSDRs.length > 0
      ? Math.round(rankedSDRs.reduce((sum, r) => sum + r.avgScore, 0) / rankedSDRs.length)
      : 0;
    const totalEvals = evaluations.length;
    const successRate = totalEvals > 0
      ? Math.round((evaluations.filter(e => e.result === 'prosseguiu').length / totalEvals) * 100)
      : 0;
    return { total, avgScore, totalEvals, successRate };
  }, [sdrs, rankedSDRs, evaluations]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SDRs</h1>
              <p className="text-muted-foreground">Gerencie sua equipe de pré-vendas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('cards')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('table')}>
                <Table className="h-4 w-4" />
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" onClick={() => { setEditingSDR(null); setFormData({ name: '', squad: '', role: '' }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo SDR
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border/50">
                <DialogHeader>
                  <DialogTitle>{editingSDR ? 'Editar SDR' : 'Cadastrar Novo SDR'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="squad">Squad</Label>
                    <Select value={formData.squad} onValueChange={(value) => setFormData({ ...formData, squad: value as Squad })}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o squad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Águia"><span className="flex items-center gap-2"><Bird className="h-4 w-4" /> Águia</span></SelectItem>
                        <SelectItem value="Lobo"><span className="flex items-center gap-2"><Dog className="h-4 w-4" /> Lobo</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SDR Júnior">SDR Júnior</SelectItem>
                        <SelectItem value="SDR Pleno">SDR Pleno</SelectItem>
                        <SelectItem value="SDR Sênior">SDR Sênior</SelectItem>
                        <SelectItem value="Líder de Squad">Líder de Squad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" variant="accent" className="flex-1">{editingSDR ? 'Salvar' : 'Cadastrar'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total SDRs</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center"><Bird className="h-6 w-6 text-amber-400" /></div><div><p className="text-2xl font-bold">{squadCounts['Águia']}</p><p className="text-sm text-muted-foreground">Squad Águia</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center"><Dog className="h-6 w-6 text-blue-400" /></div><div><p className="text-2xl font-bold">{squadCounts['Lobo']}</p><p className="text-sm text-muted-foreground">Squad Lobo</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center"><span className="text-green-500 font-bold">{stats.successRate}%</span></div><div><p className="text-2xl font-bold">{stats.avgScore}</p><p className="text-sm text-muted-foreground">Nota Média</p></div></CardContent></Card>
        </div>

        {/* SDR Cards */}
        <div className={cn(viewMode === 'cards' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3")}>
          {rankedSDRs.map(({ sdr, evaluations: sdrEvals }, index) => (
            <SDRPerformanceCard
              key={sdr.id}
              sdr={sdr}
              evaluations={sdrEvals}
              rank={index + 1}
              onClick={() => setSelectedSDR(sdr)}
            />
          ))}
        </div>

        {/* Detail Drawer */}
        <SDRDetailDrawer
          sdr={selectedSDR}
          evaluations={selectedSDR ? evaluations.filter(e => e.sdrId === selectedSDR.id) : []}
          teamAverageScores={teamAverageScores}
          open={!!selectedSDR}
          onClose={() => setSelectedSDR(null)}
        />
      </div>
    </MainLayout>
  );
}
