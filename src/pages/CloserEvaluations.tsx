import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Brain, FileText, Video, Loader2, CheckCircle, XCircle, Clock, Eye, TrendingUp, Target, BarChart3, FileWarning } from 'lucide-react';
import { useClosers } from '@/hooks/useClosers';
import { useCloserEvaluations, useAddCloserEvaluation, useDeleteCloserEvaluation } from '@/hooks/useCloserEvaluations';
import { useCloserAnalysis } from '@/hooks/useCloserAnalysis';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useAddDevelopmentPlan } from '@/hooks/useDevelopmentPlans';
import { CloserScoresGrid } from '@/components/closer/CloserScoresGrid';
import { CloserFeedbackPanel } from '@/components/closer/CloserFeedbackPanel';
import { CloserRadarChart } from '@/components/closer/CloserRadarChart';
import { EvaluationFilters, EvaluationFiltersState } from '@/components/closer/EvaluationFilters';
import { EvaluationCard } from '@/components/closer/EvaluationCard';
import { CloserEvaluation, calculateCloserFinalScore, getCloserScoreColor, getCloserScoreBgColor, CLOSER_SCORE_CATEGORIES, CLOSER_CATEGORY_LABELS } from '@/types/closer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CloserEvaluations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { data: closers = [] } = useClosers();
  const { data: evaluations = [], isLoading: loadingEvaluations } = useCloserEvaluations();
  const addEvaluation = useAddCloserEvaluation();
  const deleteEvaluation = useDeleteCloserEvaluation();
  const addDevelopmentPlan = useAddDevelopmentPlan();
  const { isAnalyzing, analysisResult, error: analysisError, analyzeCloserMeeting, resetAnalysis } = useCloserAnalysis();
  const { isTranscribing, transcribeAudio } = useAudioTranscription();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCloserId, setSelectedCloserId] = useState<string>('');
  const [transcription, setTranscription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [viewingEvaluation, setViewingEvaluation] = useState<CloserEvaluation | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters state
  const [filters, setFilters] = useState<EvaluationFiltersState>({
    closerId: searchParams.get('closer') || 'all',
    result: 'all',
    searchQuery: '',
    dateRange: undefined,
  });

  // Update filters from URL params
  useEffect(() => {
    const closerFromUrl = searchParams.get('closer');
    if (closerFromUrl && closerFromUrl !== filters.closerId) {
      setFilters(f => ({ ...f, closerId: closerFromUrl }));
    }
  }, [searchParams]);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      // Closer filter
      if (filters.closerId !== 'all' && e.closerId !== filters.closerId) return false;
      
      // Result filter
      if (filters.result !== 'all' && e.result !== filters.result) return false;
      
      // Date range filter
      if (filters.dateRange?.from) {
        const evalDate = new Date(e.date);
        if (evalDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && evalDate > filters.dateRange.to) return false;
      }
      
      // Search filter (in transcription)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const inTranscription = e.transcription?.toLowerCase().includes(query);
        const closerName = closers.find(c => c.id === e.closerId)?.name?.toLowerCase() || '';
        const inCloserName = closerName.includes(query);
        if (!inTranscription && !inCloserName) return false;
      }
      
      return true;
    });
  }, [evaluations, filters, closers]);

  // Stats for header
  const stats = useMemo(() => {
    const total = filteredEvaluations.length;
    const avgScore = total > 0
      ? Math.round(filteredEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / total)
      : 0;
    const successes = filteredEvaluations.filter(e => e.result === 'fechou').length;
    const closingRate = total > 0 ? Math.round((successes / total) * 100) : 0;
    
    return { total, avgScore, closingRate, successes };
  }, [filteredEvaluations]);

  // Team average scores for radar comparison
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

  const handleAnalyze = async () => {
    let textToAnalyze = transcription;

    // If there's an audio file, transcribe it first
    if (audioFile && !transcription) {
      const result = await transcribeAudio(audioFile);
      if (result) {
        textToAnalyze = result;
        setTranscription(result);
      } else {
        return;
      }
    }

    if (!textToAnalyze.trim()) {
      return;
    }

    const result = await analyzeCloserMeeting(textToAnalyze);
    if (result) {
      setStep('review');
    }
  };

  const handleSave = () => {
    if (!analysisResult || !selectedCloserId) return;

    const finalScore = calculateCloserFinalScore(analysisResult.scores);

    addEvaluation.mutate({
      closerId: selectedCloserId,
      date: new Date(),
      videoUrl: videoUrl || undefined,
      transcription,
      scores: analysisResult.scores,
      finalScore,
      result: analysisResult.result,
      objections: analysisResult.objections,
      aiFeedback: analysisResult.feedback,
    });

    // Check for weak areas and suggest PDI
    const categoryScores = Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => {
      const avg = Math.round(keys.reduce((sum, key) => sum + (analysisResult.scores[key] || 0), 0) / keys.length);
      return { category, label: CLOSER_CATEGORY_LABELS[category], score: avg };
    });

    const weakAreas = categoryScores.filter(c => c.score < 60);
    if (weakAreas.length > 0) {
      toast.info(
        `Área fraca identificada: ${weakAreas[0].label}. Considere criar um PDI para melhoria.`,
        {
          duration: 5000,
          action: {
            label: 'Criar PDI',
            onClick: () => navigate('/development'),
          },
        }
      );
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setSelectedCloserId('');
    setTranscription('');
    setVideoUrl('');
    setAudioFile(null);
    setStep('input');
    resetAnalysis();
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo: 25MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleDeleteEvaluation = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta avaliação?')) {
      deleteEvaluation.mutate(id);
    }
  };

  const handleCreatePDIFromEvaluation = (evaluation: CloserEvaluation) => {
    const categoryScores = Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => {
      const avg = Math.round(keys.reduce((sum, key) => sum + (evaluation.scores[key] || 0), 0) / keys.length);
      return { category, label: CLOSER_CATEGORY_LABELS[category], score: avg };
    });

    const weakest = categoryScores.reduce((a, b) => a.score < b.score ? a : b);
    const recommendations = evaluation.aiFeedback?.pontosFracos?.slice(0, 2).join('. ') || 
      `Melhorar performance na categoria ${weakest.label}`;

    addDevelopmentPlan.mutate({
      sdrId: evaluation.closerId,
      evaluationId: evaluation.id,
      weakArea: weakest.label,
      recommendation: recommendations,
      priority: weakest.score < 50 ? 'high' : 'medium',
      status: 'pending',
    });
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'fechou':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Fechou</Badge>;
      case 'nao_fechou':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Não Fechou</Badge>;
      case 'follow_up':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Follow-up</Badge>;
      default:
        return null;
    }
  };

  const getCloserName = (closerId: string) => {
    const closer = closers.find((c) => c.id === closerId);
    return closer?.name || 'Desconhecido';
  };

  const getCloser = (closerId: string) => {
    return closers.find((c) => c.id === closerId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Avaliações de Closers</h1>
            <p className="text-muted-foreground">Analise reuniões de fechamento com IA</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {step === 'input' ? 'Nova Avaliação de Closer' : 'Revisar Análise'}
                </DialogTitle>
              </DialogHeader>

              {step === 'input' ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 pb-4">
                      <div className="space-y-2">
                        <Label>Closer *</Label>
                        <Select value={selectedCloserId} onValueChange={setSelectedCloserId}>
                          <SelectTrigger className={cn(!selectedCloserId && "border-muted-foreground/30")}>
                            <SelectValue placeholder="Selecione o closer" />
                          </SelectTrigger>
                          <SelectContent>
                            {closers.map((closer) => (
                              <SelectItem key={closer.id} value={closer.id}>
                                {closer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>URL do Vídeo (opcional)</Label>
                        <Input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload de Áudio (opcional)</Label>
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioChange}
                        />
                        {audioFile && (
                          <p className="text-sm text-muted-foreground">
                            Arquivo: {audioFile.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Transcrição da Reunião *</Label>
                        <Textarea
                          value={transcription}
                          onChange={(e) => setTranscription(e.target.value)}
                          placeholder="Cole aqui a transcrição da reunião ou faça upload do áudio acima..."
                          rows={8}
                        />
                        <p className="text-xs text-muted-foreground">
                          Mínimo de 100 caracteres para análise
                        </p>
                      </div>

                      {analysisError && (
                        <p className="text-sm text-destructive">{analysisError}</p>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Fixed Footer */}
                  <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      disabled={!selectedCloserId || (transcription.length < 100 && !audioFile) || isAnalyzing || isTranscribing}
                      className="min-w-[180px]"
                    >
                      {isAnalyzing || isTranscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isTranscribing ? 'Transcrevendo...' : 'Analisando...'}
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          Analisar com IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : analysisResult ? (
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-6 pr-4">
                    {/* Final Score */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold",
                            getCloserScoreBgColor(calculateCloserFinalScore(analysisResult.scores))
                          )}
                        >
                          {calculateCloserFinalScore(analysisResult.scores)}
                        </div>
                        <div>
                          <p className="text-lg font-semibold">Nota Final</p>
                          <p className="text-sm text-muted-foreground">
                            Média ponderada dos 30 critérios
                          </p>
                        </div>
                      </div>
                      {getResultBadge(analysisResult.result)}
                    </div>

                    <Tabs defaultValue="radar">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="radar">Radar</TabsTrigger>
                        <TabsTrigger value="scores">Scores</TabsTrigger>
                        <TabsTrigger value="objections">Objeções</TabsTrigger>
                        <TabsTrigger value="feedback">Feedback IA</TabsTrigger>
                      </TabsList>

                      <TabsContent value="radar" className="mt-4">
                        <Card>
                          <CardContent className="pt-6">
                            <CloserRadarChart 
                              scores={analysisResult.scores} 
                              teamAverageScores={teamAverageScores}
                              showTeamAverage={!!teamAverageScores}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="scores" className="mt-4">
                        <CloserScoresGrid scores={analysisResult.scores} />
                      </TabsContent>

                      <TabsContent value="objections" className="mt-4">
                        {analysisResult.objections.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            Nenhuma objeção identificada
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {analysisResult.objections.map((obj, index) => (
                              <div key={index} className="p-4 rounded-lg border space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium">"{obj.description}"</p>
                                  <Badge variant={obj.wasEffective ? 'default' : 'destructive'}>
                                    {obj.wasEffective ? 'Contornada' : 'Não contornada'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Resposta: </span>
                                  {obj.closerResponse}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="feedback" className="mt-4">
                        <CloserFeedbackPanel feedback={analysisResult.feedback} />
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setStep('input')}>
                        Voltar
                      </Button>
                      <Button onClick={handleSave} disabled={addEvaluation.isPending}>
                        {addEvaluation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Avaliação'
                        )}
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className={cn("text-2xl font-bold", getCloserScoreColor(stats.avgScore))}>
                    {stats.avgScore}
                  </p>
                  <p className="text-xs text-muted-foreground">Nota Média</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{stats.closingRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Fechamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.successes}</p>
                  <p className="text-xs text-muted-foreground">Negócios Fechados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <EvaluationFilters
              closers={closers}
              filters={filters}
              onFiltersChange={setFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </CardContent>
        </Card>

        {/* Evaluations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Avaliações
              <Badge variant="secondary" className="ml-2">
                {filteredEvaluations.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {filters.closerId !== 'all' 
                ? `Avaliações de ${getCloserName(filters.closerId)}`
                : 'Histórico de avaliações de reuniões de fechamento'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvaluations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação encontrada.</p>
                <p className="text-sm">
                  {evaluations.length > 0 
                    ? 'Tente ajustar os filtros.'
                    : 'Clique em "Nova Avaliação" para começar.'
                  }
                </p>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-2"
              )}>
                {filteredEvaluations.map((evaluation) => (
                  <EvaluationCard
                    key={evaluation.id}
                    evaluation={evaluation}
                    closer={getCloser(evaluation.closerId)}
                    onView={() => setViewingEvaluation(evaluation)}
                    onDelete={() => handleDeleteEvaluation(evaluation.id)}
                    onCreatePDI={() => handleCreatePDIFromEvaluation(evaluation)}
                    variant={viewMode}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Evaluation Dialog */}
        <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  Avaliação - {viewingEvaluation && getCloserName(viewingEvaluation.closerId)}
                </DialogTitle>
                {viewingEvaluation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreatePDIFromEvaluation(viewingEvaluation)}
                  >
                    <FileWarning className="h-4 w-4 mr-2" />
                    Criar PDI
                  </Button>
                )}
              </div>
            </DialogHeader>
            {viewingEvaluation && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-6 pr-4">
                  {/* Final Score */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold",
                          getCloserScoreBgColor(viewingEvaluation.finalScore)
                        )}
                      >
                        {viewingEvaluation.finalScore}
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Nota Final</p>
                        <p className="text-sm text-muted-foreground">
                          {format(viewingEvaluation.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {getResultBadge(viewingEvaluation.result)}
                  </div>

                  <Tabs defaultValue="radar">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="radar">Radar</TabsTrigger>
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="transcription">Transcrição</TabsTrigger>
                      <TabsTrigger value="objections">Objeções</TabsTrigger>
                      <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    </TabsList>

                    <TabsContent value="radar" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <CloserRadarChart 
                            scores={viewingEvaluation.scores}
                            teamAverageScores={teamAverageScores}
                            showTeamAverage={!!teamAverageScores}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="scores" className="mt-4">
                      <CloserScoresGrid scores={viewingEvaluation.scores} />
                    </TabsContent>

                    <TabsContent value="transcription" className="mt-4">
                      {viewingEvaluation.transcription ? (
                        <div className="p-4 rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm">
                            {viewingEvaluation.transcription}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Transcrição não disponível
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="objections" className="mt-4">
                      {viewingEvaluation.objections.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma objeção identificada
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {viewingEvaluation.objections.map((obj, index) => (
                            <div key={index} className="p-4 rounded-lg border space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium">"{obj.description}"</p>
                                <Badge variant={obj.wasEffective ? 'default' : 'destructive'}>
                                  {obj.wasEffective ? 'Contornada' : 'Não contornada'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Resposta: </span>
                                {obj.closerResponse}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-4">
                      {viewingEvaluation.aiFeedback ? (
                        <CloserFeedbackPanel feedback={viewingEvaluation.aiFeedback} />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Feedback não disponível
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
