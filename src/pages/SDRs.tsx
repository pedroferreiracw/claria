import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScoreBadge } from '@/components/ui/score-badge';
import { Plus, Users, Pencil, Trash2, Bird, Dog } from 'lucide-react';
import { Squad, SDR } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SDRsPage() {
  const { sdrs, evaluations, addSDR, updateSDR, deleteSDR } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSDR, setEditingSDR] = useState<SDR | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    squad: '' as Squad | '',
    role: '',
  });

  const getSDRScore = (sdrId: string) => {
    const sdrEvals = evaluations.filter(e => e.sdrId === sdrId);
    if (sdrEvals.length === 0) return 0;
    return Math.round(sdrEvals.reduce((sum, e) => sum + e.finalScore, 0) / sdrEvals.length);
  };

  const getEvaluationCount = (sdrId: string) => {
    return evaluations.filter(e => e.sdrId === sdrId).length;
  };

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
    setFormData({
      name: sdr.name,
      squad: sdr.squad,
      role: sdr.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteSDR(id);
    toast.success('SDR removido com sucesso!');
  };

  const squadCounts = {
    Águia: sdrs.filter(s => s.squad === 'Águia').length,
    Lobo: sdrs.filter(s => s.squad === 'Lobo').length,
  };

  return (
    <MainLayout>
      <div className="space-y-8">
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" onClick={() => {
                setEditingSDR(null);
                setFormData({ name: '', squad: '', role: '' });
              }}>
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
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="squad">Squad</Label>
                  <Select
                    value={formData.squad}
                    onValueChange={(value) => setFormData({ ...formData, squad: value as Squad })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione o squad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Águia">
                        <span className="flex items-center gap-2">
                          <Bird className="h-4 w-4" /> Águia
                        </span>
                      </SelectItem>
                      <SelectItem value="Lobo">
                        <span className="flex items-center gap-2">
                          <Dog className="h-4 w-4" /> Lobo
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
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
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="accent" className="flex-1">
                    {editingSDR ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Squad Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bird className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{squadCounts['Águia']}</p>
              <p className="text-sm text-muted-foreground">Squad Águia</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Dog className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{squadCounts['Lobo']}</p>
              <p className="text-sm text-muted-foreground">Squad Lobo</p>
            </div>
          </div>
        </div>

        {/* SDR Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sdrs.map((sdr) => {
            const score = getSDRScore(sdr.id);
            const evalCount = getEvaluationCount(sdr.id);
            
            return (
              <div 
                key={sdr.id}
                className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent/40 to-primary/40 flex items-center justify-center">
                      <span className="text-lg font-bold">{sdr.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{sdr.name}</h3>
                      <p className="text-sm text-muted-foreground">{sdr.role}</p>
                    </div>
                  </div>
                  <ScoreBadge score={score} size="sm" />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    sdr.squad === 'Águia' 
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-blue-500/20 text-blue-400"
                  )}>
                    {sdr.squad === 'Águia' ? <Bird className="inline h-3 w-3 mr-1" /> : <Dog className="inline h-3 w-3 mr-1" />}
                    {sdr.squad}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {evalCount} avaliações
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(sdr)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(sdr.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
