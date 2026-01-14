import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, LayoutGrid, Table as TableIcon, Search, SlidersHorizontal } from 'lucide-react';
import { useClosers, useAddCloser, useUpdateCloser, useDeleteCloser } from '@/hooks/useClosers';
import { useCloserEvaluations } from '@/hooks/useCloserEvaluations';
import { useUserRole } from '@/hooks/useUserRole';
import { SDR, Squad } from '@/types';
import { toast } from 'sonner';
import { CloserPerformanceCard } from '@/components/closer/CloserPerformanceCard';
import { CloserDetailDrawer } from '@/components/closer/CloserDetailDrawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Trash2 } from 'lucide-react';

type ViewMode = 'cards' | 'table';
type SortBy = 'name' | 'score' | 'rate' | 'evaluations';

export default function Closers() {
  const { data: closers = [], isLoading } = useClosers();
  const { data: evaluations = [] } = useCloserEvaluations();
  const addCloser = useAddCloser();
  const updateCloser = useUpdateCloser();
  const deleteCloser = useDeleteCloser();
  const { isAdmin } = useUserRole();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCloser, setEditingCloser] = useState<SDR | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    squad: 'Águia' as Squad,
    role: '',
  });

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [selectedCloser, setSelectedCloser] = useState<SDR | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate stats for each closer
  const closerStats = useMemo(() => {
    return closers.map(closer => {
      const closerEvals = evaluations.filter(e => e.closerId === closer.id);
      const avgScore = closerEvals.length > 0
        ? Math.round(closerEvals.reduce((sum, e) => sum + e.finalScore, 0) / closerEvals.length)
        : 0;
      const successes = closerEvals.filter(e => e.result === 'fechou').length;
      const closingRate = closerEvals.length > 0 
        ? Math.round((successes / closerEvals.length) * 100) 
        : 0;
      
      return {
        closer,
        evaluations: closerEvals,
        avgScore,
        closingRate,
        totalEvaluations: closerEvals.length,
      };
    });
  }, [closers, evaluations]);

  // Sort and filter closers
  const sortedClosers = useMemo(() => {
    let filtered = closerStats.filter(item =>
      item.closer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.closer.name.localeCompare(b.closer.name);
        case 'score':
          return b.avgScore - a.avgScore;
        case 'rate':
          return b.closingRate - a.closingRate;
        case 'evaluations':
          return b.totalEvaluations - a.totalEvaluations;
        default:
          return 0;
      }
    });

    return filtered;
  }, [closerStats, searchQuery, sortBy]);

  // Team average scores for comparison
  const teamAverageScores = useMemo(() => {
    if (evaluations.length === 0) return undefined;
    
    const firstEval = evaluations[0];
    if (!firstEval.scores) return undefined;

    const scoreKeys = Object.keys(firstEval.scores);
    const avgScores: any = {};
    
    scoreKeys.forEach(key => {
      avgScores[key] = Math.round(
        evaluations.reduce((sum, e) => sum + (e.scores[key as keyof typeof e.scores] || 0), 0) / evaluations.length
      );
    });
    
    return avgScores;
  }, [evaluations]);

  const handleSubmit = () => {
    if (!formData.name || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingCloser) {
      updateCloser.mutate({ id: editingCloser.id, data: formData });
    } else {
      addCloser.mutate(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (closer: SDR) => {
    setEditingCloser(closer);
    setFormData({
      name: closer.name,
      squad: closer.squad,
      role: closer.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este closer?')) {
      deleteCloser.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingCloser(null);
    setFormData({ name: '', squad: 'Águia', role: '' });
  };

  const handleCloserClick = (closer: SDR) => {
    setSelectedCloser(closer);
    setDrawerOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Closers</h1>
            <p className="text-muted-foreground">Gerencie a equipe de closers e acompanhe a performance</p>
          </div>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Closer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCloser ? 'Editar Closer' : 'Novo Closer'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="squad">Squad *</Label>
                    <Select
                      value={formData.squad}
                      onValueChange={(value: Squad) => setFormData({ ...formData, squad: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Águia">Águia</SelectItem>
                        <SelectItem value="Lobo">Lobo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo *</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Ex: Closer Sênior"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingCloser ? 'Salvar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar closer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Maior Nota</SelectItem>
                  <SelectItem value="rate">Taxa de Fechamento</SelectItem>
                  <SelectItem value="evaluations">Mais Avaliações</SelectItem>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

              <Badge variant="secondary" className="ml-auto">
                {sortedClosers.length} closers
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : closers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum closer cadastrado ainda.</p>
              <p className="text-sm">Clique em "Adicionar Closer" para começar.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedClosers.map((item, index) => (
              <CloserPerformanceCard
                key={item.closer.id}
                closer={item.closer}
                evaluations={item.evaluations}
                rank={index + 1}
                onClick={() => handleCloserClick(item.closer)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipe de Closers ({closers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Nota Média</TableHead>
                    <TableHead className="text-right">Fechamento</TableHead>
                    <TableHead className="text-right">Avaliações</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClosers.map((item) => (
                    <TableRow 
                      key={item.closer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCloserClick(item.closer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={item.closer.avatarUrl} />
                            <AvatarFallback>{getInitials(item.closer.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{item.closer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.closer.squad === 'Águia' ? 'default' : 'secondary'}>
                          {item.closer.squad}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.closer.role}</TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={
                          item.avgScore >= 80 ? 'text-green-500' :
                          item.avgScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                        }>
                          {item.avgScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.closingRate}%</TableCell>
                      <TableCell className="text-right">{item.totalEvaluations}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item.closer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.closer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Closer Detail Drawer */}
      <CloserDetailDrawer
        closer={selectedCloser}
        evaluations={selectedCloser ? evaluations.filter(e => e.closerId === selectedCloser.id) : []}
        teamAverageScores={teamAverageScores}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </MainLayout>
  );
}
