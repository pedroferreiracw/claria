import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScoreBadge, ScoreBar } from '@/components/ui/score-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Phone, 
  MessageCircle, 
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  FileAudio,
  FileText,
  FileImage,
  X,
  BarChart3,
  Target,
  TrendingUp,
  FileWarning,
  Brain
} from 'lucide-react';
import { ProspectionType, ProspectionResult, Scores, Evaluation, calculateFinalScore, getScoreColor, getScoreBgColor } from '@/types';
import { useAIAnalysis, AIAnalysisResult } from '@/hooks/useAIAnalysis';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useEvaluations, useDeleteEvaluation } from '@/hooks/useEvaluations';
import { useSDRs } from '@/hooks/useSDRs';
import { useAddDevelopmentPlan } from '@/hooks/useDevelopmentPlans';
import { SDREvaluationFilters, SDREvaluationFiltersState } from '@/components/sdr/SDREvaluationFilters';
import { SDREvaluationCard } from '@/components/sdr/SDREvaluationCard';
import { SDRRadarChart } from '@/components/sdr/SDRRadarChart';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const scoreLabels: Record<keyof Scores, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  bant: 'Aplicação do BANT',
  dores: 'Identificação de Dores',
  geracaoValor: 'Geração de Valor',
  conducaoAgendamento: 'Condução p/ Agendamento',
  gatilhoCompromisso: 'Gatilho de Compromisso',
  contornoObjecoes: 'Contorno de Objeções',
  comunicacaoOratoria: 'Comunicação e Oratória',
};

export default function EvaluationsPage() {
  const { sdrs, addEvaluation } = useApp();
  const { data: sdrsFromHook = [] } = useSDRs();
  const { data: evaluationsFromHook = [], isLoading: loadingEvaluations } = useEvaluations();
  const deleteEvaluation = useDeleteEvaluation();
  const addDevelopmentPlan = useAddDevelopmentPlan();
  const { isAnalyzing, analyzeProspection, resetAnalysis } = useAIAnalysis();
  const { isTranscribing, transcribeAudio, resetTranscription } = useAudioTranscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState<Evaluation | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'review'>('input');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [sdrId, setSdrId] = useState('');
  const [prospectionType, setProspectionType] = useState<ProspectionType | ''>('');
  const [conversationText, setConversationText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Use hook data if available, otherwise fall back to context
  const allSDRs = sdrsFromHook.length > 0 ? sdrsFromHook : sdrs;
  const sdrOnly = allSDRs;
  const allEvaluations = evaluationsFromHook.length > 0 ? evaluationsFromHook : [];

  // Filters
  const [filters, setFilters] = useState<SDREvaluationFiltersState>({
    sdrId: searchParams.get('sdr') || 'all',
    type: 'all',
    result: 'all',
    searchQuery: '',
    dateRange: undefined,
  });

  useEffect(() => {
    const sdrFromUrl = searchParams.get('sdr');
    if (sdrFromUrl && sdrFromUrl !== filters.sdrId) {
      setFilters(f => ({ ...f, sdrId: sdrFromUrl }));
    }
  }, [searchParams]);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    return allEvaluations.filter(e => {
      if (filters.sdrId !== 'all' && e.sdrId !== filters.sdrId) return false;
      if (filters.type !== 'all' && e.type !== filters.type) return false;
      if (filters.result !== 'all' && e.result !== filters.result) return false;
      if (filters.dateRange?.from) {
        const evalDate = new Date(e.date);
        if (evalDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && evalDate > filters.dateRange.to) return false;
      }
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const inText = e.conversationText?.toLowerCase().includes(query);
        const sdrName = allSDRs.find(s => s.id === e.sdrId)?.name?.toLowerCase() || '';
        const inName = sdrName.includes(query);
        if (!inText && !inName) return false;
      }
      return true;
    });
  }, [allEvaluations, filters, allSDRs]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredEvaluations.length;
    const avgScore = total > 0
      ? Math.round(filteredEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / total)
      : 0;
    const successes = filteredEvaluations.filter(e => e.result === 'prosseguiu').length;
    const conversionRate = total > 0 ? Math.round((successes / total) * 100) : 0;
    const calls = filteredEvaluations.filter(e => e.type === 'Ligação').length;
    const whatsapp = filteredEvaluations.filter(e => e.type === 'WhatsApp').length;
    return { total, avgScore, conversionRate, successes, calls, whatsapp };
  }, [filteredEvaluations]);

  // Team average scores for radar
  const teamAverageScores = useMemo(() => {
    if (allEvaluations.length === 0) return undefined;
    const keys: (keyof Scores)[] = ['abertura', 'rapport', 'bant', 'dores', 'geracaoValor', 'conducaoAgendamento', 'gatilhoCompromisso', 'contornoObjecoes', 'comunicacaoOratoria'];
    const avg: Partial<Scores> = {};
    keys.forEach(key => {
      avg[key] = Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.scores[key] || 0), 0) / allEvaluations.length
      );
    });
    return avg as Scores;
  }, [allEvaluations]);

  const handleAnalyze = async () => {
    if (!sdrId) {
      toast.error('Selecione o SDR');
      return;
    }
    if (!prospectionType) {
      toast.error('Selecione o tipo de prospecção');
      return;
    }

    let textToAnalyze = conversationText;

    if (prospectionType === 'Ligação' && audioFile && !conversationText.trim()) {
      const transcription = await transcribeAudio(audioFile);
      if (!transcription) return;
      textToAnalyze = transcription;
      setConversationText(transcription);
    }

    if (!textToAnalyze.trim()) {
      toast.error(prospectionType === 'Ligação'
        ? 'Faça upload do áudio ou cole a transcrição'
        : 'Cole o texto da conversa');
      return;
    }

    const result = await analyzeProspection(textToAnalyze, prospectionType);
    if (result) {
      setAnalysisResult(result);
      setCurrentStep('review');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg', 'audio/flac'];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato inválido. Use MP3, WAV, M4A, WebM, OGG ou FLAC');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo: 25MB');
        return;
      }
      setAudioFile(file);
      setConversationText('');
    }
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = () => {
    if (!analysisResult) return;
    const finalScore = calculateFinalScore(analysisResult.scores);

    const evaluation: Omit<Evaluation, 'id' | 'createdAt'> = {
      sdrId,
      type: prospectionType as ProspectionType,
      date: new Date(),
      conversationText,
      questionsAsked: analysisResult.questionsAsked,
      leadResponses: analysisResult.leadResponses,
      result: analysisResult.result,
      objections: analysisResult.objections,
      scores: analysisResult.scores,
      finalScore,
      aiFeedback: analysisResult.aiFeedback,
    };

    addEvaluation(evaluation);

    // Check for weak areas and suggest PDI
    const scoreEntries = Object.entries(analysisResult.scores) as [keyof Scores, number][];
    const weakAreas = scoreEntries.filter(([, score]) => score < 60);
    if (weakAreas.length > 0) {
      const weakest = weakAreas.reduce((a, b) => a[1] < b[1] ? a : b);
      toast.info(
        `Área fraca identificada: ${scoreLabels[weakest[0]]}. Considere criar um PDI.`,
        {
          duration: 5000,
          action: {
            label: 'Criar PDI',
            onClick: () => navigate('/development'),
          },
        }
      );
    }

    toast.success('Avaliação salva com sucesso!');
    resetForm();
  };

  const resetForm = () => {
    setSdrId('');
    setProspectionType('');
    setConversationText('');
    setAnalysisResult(null);
    setAudioFile(null);
    setCurrentStep('input');
    resetAnalysis();
    resetTranscription();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsDialogOpen(false);
  };

  const getSDR = (sdrId: string) => allSDRs.find(s => s.id === sdrId);
  const getSDRName = (sdrId: string) => getSDR(sdrId)?.name || 'Desconhecido';

  const handleDeleteEvaluation = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta avaliação?')) {
      deleteEvaluation.mutate(id);
    }
  };

  const handleCreatePDIFromEvaluation = (evaluation: Evaluation) => {
    const scoreEntries = Object.entries(evaluation.scores) as [keyof Scores, number][];
    const weakest = scoreEntries.reduce((a, b) => a[1] < b[1] ? a : b);
    const recommendations = evaluation.aiFeedback?.pontosFracos?.slice(0, 2).join('. ') ||
      `Melhorar performance em ${scoreLabels[weakest[0]]}`;

    addDevelopmentPlan.mutate({
      sdrId: evaluation.sdrId,
      evaluationId: evaluation.id,
      weakArea: scoreLabels[weakest[0]],
      recommendation: recommendations,
      priority: weakest[1] < 50 ? 'high' : 'medium',
      status: 'pending',
    });
  };

  const resultLabels: Record<ProspectionResult, { label: string; color: string }> = {
    prosseguiu: { label: 'Prosseguiu', color: 'bg-green-500/20 text-green-500' },
    recusou: { label: 'Recusou', color: 'bg-red-500/20 text-red-500' },
    perdeu_interesse: { label: 'Perdeu Interesse', color: 'bg-yellow-500/20 text-yellow-500' },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Avaliações de SDRs</h1>
            <p className="text-muted-foreground">Análise automatizada de prospecções com IA</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Nova Avaliação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {currentStep === 'input' ? 'Nova Avaliação de SDR' : 'Revisar Análise'}
                </DialogTitle>
              </DialogHeader>

              {currentStep === 'input' ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SDR *</Label>
                          <Select value={sdrId} onValueChange={setSdrId}>
                            <SelectTrigger className={cn(!sdrId && "border-muted-foreground/30")}>
                              <SelectValue placeholder="Selecione o SDR" />
                            </SelectTrigger>
                            <SelectContent>
                              {sdrOnly.map((sdr) => (
                                <SelectItem key={sdr.id} value={sdr.id}>
                                  {sdr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Prospecção *</Label>
                          <Select value={prospectionType} onValueChange={(v) => setProspectionType(v as ProspectionType)}>
                            <SelectTrigger className={cn(!prospectionType && "border-muted-foreground/30")}>
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ligação">
                                <span className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" /> Ligação
                                </span>
                              </SelectItem>
                              <SelectItem value="WhatsApp">
                                <span className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4" /> WhatsApp
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Audio Upload for Ligação */}
                      {prospectionType === 'Ligação' && (
                        <div className="space-y-2">
                          <Label>Áudio da Ligação</Label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".mp3,.wav,.m4a,.webm,.ogg,.flac,audio/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          {!audioFile ? (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-colors"
                            >
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium">Clique para fazer upload</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                MP3, WAV, M4A, WebM, OGG, FLAC (máx 25MB)
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <FileAudio className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{audioFile.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(audioFile.size)}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={removeAudioFile} className="h-8 w-8">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text Input */}
                      <div className="space-y-2">
                        <Label>
                          {prospectionType === 'Ligação' && audioFile
                            ? 'Transcrição (opcional - será gerada automaticamente)'
                            : prospectionType === 'Ligação'
                            ? 'Transcrição (ou faça upload do áudio acima)'
                            : 'Conversa *'}
                        </Label>
                        <Textarea
                          value={conversationText}
                          onChange={(e) => {
                            setConversationText(e.target.value);
                            if (e.target.value.trim()) setAudioFile(null);
                          }}
                          placeholder={
                            prospectionType === 'Ligação'
                              ? 'Cole a transcrição da ligação ou faça upload do áudio acima...'
                              : 'Cole aqui o texto da conversa do WhatsApp...'
                          }
                          className="min-h-[200px]"
                          disabled={isTranscribing}
                        />
                        <p className="text-xs text-muted-foreground">
                          A IA irá analisar a conversa e gerar automaticamente as notas, objeções e feedback.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Fixed Footer */}
                  <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      disabled={!sdrId || !prospectionType || (!conversationText.trim() && !audioFile) || isAnalyzing || isTranscribing}
                      className="min-w-[180px]"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transcrevendo...
                        </>
                      ) : isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analisando com IA...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          {prospectionType === 'Ligação' && audioFile
                            ? 'Transcrever e Analisar'
                            : 'Analisar com IA'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : analysisResult ? (
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-6 pr-4">
                    {/* Score Summary */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold",
                          getScoreBgColor(calculateFinalScore(analysisResult.scores))
                        )}>
                          {calculateFinalScore(analysisResult.scores)}
                        </div>
                        <div>
                          <p className="text-lg font-semibold">Nota Final</p>
                          <p className="text-sm text-muted-foreground">Média das 8 categorias</p>
                        </div>
                      </div>
                      <Badge className={resultLabels[analysisResult.result].color}>
                        {resultLabels[analysisResult.result].label}
                      </Badge>
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
                            <SDRRadarChart
                              scores={analysisResult.scores}
                              teamAverageScores={teamAverageScores}
                              showTeamAverage={!!teamAverageScores}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="scores" className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          {(Object.keys(analysisResult.scores) as Array<keyof Scores>).map((key) => (
                            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <span className="text-sm">{scoreLabels[key]}</span>
                              <span className={cn("font-bold", getScoreColor(analysisResult.scores[key]))}>
                                {analysisResult.scores[key]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="objections" className="mt-4">
                        {analysisResult.objections.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">Nenhuma objeção identificada</p>
                        ) : (
                          <div className="space-y-3">
                            {analysisResult.objections.map((obj, idx) => (
                              <div key={idx} className="p-3 rounded-lg bg-secondary/30 text-sm">
                                <p className="font-medium">{obj.description}</p>
                                <p className="text-muted-foreground mt-1">Resposta: {obj.sdrResponse}</p>
                                <div className={cn(
                                  "flex items-center gap-1 mt-1",
                                  obj.wasEffective ? "text-green-500" : "text-red-500"
                                )}>
                                  {obj.wasEffective ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  <span className="text-xs">{obj.wasEffective ? 'Efetivo' : 'Não Efetivo'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="feedback" className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-xs font-medium text-green-500 mb-2">Pontos Fortes</p>
                            <ul className="text-xs space-y-1">
                              {analysisResult.aiFeedback.pontosFortes.slice(0, 3).map((p, i) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-medium text-red-500 mb-2">A Melhorar</p>
                            <ul className="text-xs space-y-1">
                              {analysisResult.aiFeedback.pontosFracos.slice(0, 3).map((p, i) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setCurrentStep('input')}>
                        Voltar
                      </Button>
                      <Button onClick={handleSave}>
                        Salvar Avaliação
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
                  <p className={cn("text-2xl font-bold", getScoreColor(stats.avgScore))}>
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
                  <p className="text-2xl font-bold text-green-500">{stats.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Conversão</p>
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
                  <p className="text-xs text-muted-foreground">Prosseguiram</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <SDREvaluationFilters
              sdrs={sdrOnly}
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
              <ClipboardCheck className="h-5 w-5" />
              Avaliações
              <Badge variant="secondary" className="ml-2">
                {filteredEvaluations.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {filters.sdrId !== 'all'
                ? `Avaliações de ${getSDRName(filters.sdrId)}`
                : 'Histórico de avaliações de prospecção'
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
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação encontrada.</p>
                <p className="text-sm">
                  {allEvaluations.length > 0
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
                  <SDREvaluationCard
                    key={evaluation.id}
                    evaluation={evaluation}
                    sdr={getSDR(evaluation.sdrId)}
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
                  Avaliação - {viewingEvaluation && getSDRName(viewingEvaluation.sdrId)}
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
                      <div className={cn(
                        "h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold",
                        getScoreBgColor(viewingEvaluation.finalScore)
                      )}>
                        {viewingEvaluation.finalScore}
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Nota Final</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(viewingEvaluation.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge className={resultLabels[viewingEvaluation.result].color}>
                      {resultLabels[viewingEvaluation.result].label}
                    </Badge>
                  </div>

                  <Tabs defaultValue="radar">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="radar">Radar</TabsTrigger>
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="conversation">Conversa</TabsTrigger>
                      <TabsTrigger value="objections">Objeções</TabsTrigger>
                      <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    </TabsList>

                    <TabsContent value="radar" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <SDRRadarChart
                            scores={viewingEvaluation.scores}
                            teamAverageScores={teamAverageScores}
                            showTeamAverage={!!teamAverageScores}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="scores" className="mt-4 space-y-4">
                      {(Object.keys(viewingEvaluation.scores) as Array<keyof Scores>).map((key) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{scoreLabels[key]}</span>
                            <span className={cn("font-bold", getScoreColor(viewingEvaluation.scores[key]))}>
                              {viewingEvaluation.scores[key]}
                            </span>
                          </div>
                          <ScoreBar label={scoreLabels[key]} score={viewingEvaluation.scores[key]} />
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="conversation" className="mt-4 space-y-4">
                      {viewingEvaluation.conversationText && (
                        <div className="space-y-2">
                          <Label>Texto da Conversa</Label>
                          <div className="p-3 rounded-lg bg-secondary/50 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                            {viewingEvaluation.conversationText}
                          </div>
                        </div>
                      )}
                      {viewingEvaluation.questionsAsked.length > 0 && (
                        <div className="space-y-2">
                          <Label>Perguntas do SDR</Label>
                          <ul className="space-y-1 text-sm">
                            {viewingEvaluation.questionsAsked.map((q, i) => (
                              <li key={i} className="p-2 rounded bg-secondary/30">• {q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {viewingEvaluation.leadResponses.length > 0 && (
                        <div className="space-y-2">
                          <Label>Respostas do Lead</Label>
                          <ul className="space-y-1 text-sm">
                            {viewingEvaluation.leadResponses.map((r, i) => (
                              <li key={i} className="p-2 rounded bg-secondary/30">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="objections" className="mt-4 space-y-3">
                      {viewingEvaluation.objections.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhuma objeção identificada.</p>
                      ) : (
                        viewingEvaluation.objections.map((obj, idx) => (
                          <div key={idx} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">"{obj.description}"</p>
                              <Badge variant={obj.wasEffective ? 'default' : 'destructive'}>
                                {obj.wasEffective ? 'Contornada' : 'Não contornada'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Resposta: </span>
                              {obj.sdrResponse}
                            </p>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-4 space-y-4">
                      {viewingEvaluation.aiFeedback ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="font-medium text-green-500 mb-2">Pontos Fortes</p>
                              <ul className="text-sm space-y-1">
                                {viewingEvaluation.aiFeedback.pontosFortes.map((p, i) => (
                                  <li key={i}>✓ {p}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="font-medium text-red-500 mb-2">A Melhorar</p>
                              <ul className="text-sm space-y-1">
                                {viewingEvaluation.aiFeedback.pontosFracos.map((p, i) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Recomendações de Comunicação</Label>
                            <ul className="text-sm space-y-1 p-3 rounded-lg bg-secondary/30">
                              {viewingEvaluation.aiFeedback.recomendacoesComunicacao?.map((r, i) => (
                                <li key={i}>• {r}</li>
                              )) || <li className="text-muted-foreground">Nenhuma recomendação</li>}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <Label>Recomendações BANT</Label>
                            <ul className="text-sm space-y-1 p-3 rounded-lg bg-secondary/30">
                              {viewingEvaluation.aiFeedback.recomendacoesBant.map((r, i) => (
                                <li key={i}>• {r}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <Label>Recomendações de Processo</Label>
                            <ul className="text-sm space-y-1 p-3 rounded-lg bg-secondary/30">
                              {viewingEvaluation.aiFeedback.recomendacoesProcesso.map((r, i) => (
                                <li key={i}>• {r}</li>
                              ))}
                            </ul>
                          </div>
                          {viewingEvaluation.aiFeedback.analiseObjecoes.length > 0 && (
                            <div className="space-y-2">
                              <Label>Análise de Objeções</Label>
                              {viewingEvaluation.aiFeedback.analiseObjecoes.map((a, i) => (
                                <div key={i} className="p-3 rounded-lg bg-secondary/30 text-sm space-y-1">
                                  <p className="font-medium">"{a.objection}"</p>
                                  <p className="text-muted-foreground">
                                    <span className="font-medium">Melhor contorno:</span> {a.melhorContorno}
                                  </p>
                                  <p className="text-primary">
                                    <span className="font-medium">Resposta ideal:</span> {a.respostaIdeal}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">Feedback da IA não disponível.</p>
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
