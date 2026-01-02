import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Star, 
  User, 
  Calendar, 
  Search,
  Plus,
  Trash2,
  MessageSquare,
  Award
} from 'lucide-react';
import { useBestPractices, useAddBestPractice, useDeleteBestPractice } from '@/hooks/useBestPractices';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getScoreColor } from '@/types';

const categoryLabels: Record<string, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  spin: 'SPIN',
  bant: 'BANT',
  dores: 'Dores',
  geracaoValor: 'Geração de Valor',
  conducaoAgendamento: 'Condução p/ Agendamento',
  contornoObjecoes: 'Contorno de Objeções',
};

export default function BestPracticesPage() {
  const { data: practices = [], isLoading } = useBestPractices();
  const { sdrs, evaluations } = useApp();
  const addPractice = useAddBestPractice();
  const deletePractice = useDeleteBestPractice();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('');

  // High score evaluations that can be added to library
  const highScoreEvaluations = useMemo(() => {
    return evaluations.filter(e => e.finalScore >= 85);
  }, [evaluations]);

  const filteredPractices = useMemo(() => {
    return practices.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [practices, searchTerm, selectedCategory]);

  const getSdr = (sdrId: string) => sdrs.find(s => s.id === sdrId);

  const handleAddPractice = () => {
    if (!selectedEvaluation) return;
    
    const evaluation = evaluations.find(e => e.id === selectedEvaluation);
    if (!evaluation) return;

    // Find the highest scoring category
    const bestCategory = Object.entries(evaluation.scores).reduce((best, [key, value]) => {
      return value > best.value ? { key, value } : best;
    }, { key: 'spin', value: 0 });

    addPractice.mutate({
      evaluationId: evaluation.id,
      sdrId: evaluation.sdrId,
      title: `Avaliação de alta performance - ${format(evaluation.date, 'dd/MM/yyyy')}`,
      description: evaluation.conversationText?.substring(0, 200) || 'Sem transcrição disponível',
      category: bestCategory.key,
      highlightText: evaluation.conversationText?.substring(0, 500),
      finalScore: evaluation.finalScore,
      isFeatured: evaluation.finalScore >= 95,
    });

    setSelectedEvaluation('');
    setIsAddDialogOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-accent" />
              Biblioteca de Melhores Práticas
            </h1>
            <p className="text-muted-foreground">
              Exemplos de prospecções de alta pontuação para referência e treinamento
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-accent">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar à Biblioteca
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Prática à Biblioteca</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione uma avaliação com nota alta para adicionar como referência:
                </p>
                <Select value={selectedEvaluation} onValueChange={setSelectedEvaluation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    {highScoreEvaluations.map((evaluation) => {
                      const sdr = getSdr(evaluation.sdrId);
                      return (
                        <SelectItem key={evaluation.id} value={evaluation.id}>
                          {sdr?.name} - {format(evaluation.date, 'dd/MM/yyyy')} - Nota: {evaluation.finalScore}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full gradient-accent" 
                  onClick={handleAddPractice}
                  disabled={!selectedEvaluation || addPractice.isPending}
                >
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar práticas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Featured Section */}
        {practices.some(p => p.isFeatured) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Destaques
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practices.filter(p => p.isFeatured).map((practice) => {
                const sdr = getSdr(practice.sdrId);
                return (
                  <Card key={practice.id} className="glass-card border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-bl-full" />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge className={`${getScoreColor(practice.finalScore)} bg-opacity-20`}>
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {practice.finalScore}
                        </Badge>
                        <Badge variant="outline">{categoryLabels[practice.category]}</Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{practice.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {practice.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{sdr?.name}</span>
                        <Calendar className="h-3 w-3 ml-2" />
                        <span>{format(practice.createdAt, 'dd/MM/yyyy')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Practices */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {selectedCategory === 'all' ? 'Todas as Práticas' : categoryLabels[selectedCategory]}
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredPractices.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma prática encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Adicione avaliações com nota 85+ à biblioteca
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPractices.filter(p => !p.isFeatured).map((practice) => {
                const sdr = getSdr(practice.sdrId);
                return (
                  <Card key={practice.id} className="glass-card hover:border-accent/30 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getScoreColor(practice.finalScore)} bg-opacity-20`}>
                              {practice.finalScore}
                            </Badge>
                            <Badge variant="outline">{categoryLabels[practice.category]}</Badge>
                          </div>
                          <h3 className="font-medium">{practice.title}</h3>
                          {practice.highlightText && (
                            <div className="bg-secondary/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                                <ScrollArea className="max-h-32">
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {practice.highlightText}
                                  </p>
                                </ScrollArea>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{sdr?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(practice.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deletePractice.mutate(practice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
