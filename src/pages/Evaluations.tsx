import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScoreBadge, ScoreBar } from '@/components/ui/score-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  ClipboardCheck, 
  Phone, 
  MessageCircle, 
  Eye,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  FileAudio,
  X
} from 'lucide-react';
import { ProspectionType, ProspectionResult, Scores, Evaluation, calculateFinalScore, getScoreColor } from '@/types';
import { useAIAnalysis, AIAnalysisResult } from '@/hooks/useAIAnalysis';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const scoreLabels: Record<keyof Scores, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  spin: 'Investigação SPIN',
  bant: 'Investigação BANT',
  dores: 'Identificação de Dores',
  geracaoValor: 'Geração de Valor',
  conducaoAgendamento: 'Condução p/ Agendamento',
  contornoObjecoes: 'Contorno de Objeções',
};

export default function EvaluationsPage() {
  const { sdrs, evaluations, addEvaluation } = useApp();
  const { isAnalyzing, analyzeProspection, resetAnalysis } = useAIAnalysis();
  const { isTranscribing, transcribeAudio, resetTranscription } = useAudioTranscription();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState<Evaluation | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'review'>('input');
  
  const [sdrId, setSdrId] = useState('');
  const [prospectionType, setProspectionType] = useState<ProspectionType | ''>('');
  const [conversationText, setConversationText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

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
    
    // If it's a call and we have an audio file, transcribe first
    if (prospectionType === 'Ligação' && audioFile && !conversationText.trim()) {
      const transcription = await transcribeAudio(audioFile);
      if (!transcription) {
        return; // Error already shown by hook
      }
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
      setConversationText(''); // Clear text when audio is uploaded
    }
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDialogOpen(false);
  };

  const getSDRName = (sdrId: string) => {
    return sdrs.find(s => s.id === sdrId)?.name || 'Desconhecido';
  };

  const resultLabels: Record<ProspectionResult, { label: string; color: string }> = {
    prosseguiu: { label: 'Prosseguiu', color: 'bg-success/20 text-success' },
    recusou: { label: 'Recusou', color: 'bg-destructive/20 text-destructive' },
    perdeu_interesse: { label: 'Perdeu Interesse', color: 'bg-warning/20 text-warning' },
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Avaliações</h1>
              <p className="text-muted-foreground">Análise automatizada com IA</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Sparkles className="h-4 w-4 mr-2" />
                Nova Avaliação com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Avaliação Automatizada
                </DialogTitle>
              </DialogHeader>

              {currentStep === 'input' && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SDR</Label>
                      <Select value={sdrId} onValueChange={setSdrId}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Selecione o SDR" />
                        </SelectTrigger>
                        <SelectContent>
                          {sdrs.map((sdr) => (
                            <SelectItem key={sdr.id} value={sdr.id}>
                              {sdr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Prospecção</Label>
                      <Select value={prospectionType} onValueChange={(v) => setProspectionType(v as ProspectionType)}>
                        <SelectTrigger className="bg-secondary border-border">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={removeAudioFile}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        A IA irá transcrever o áudio automaticamente e analisar a ligação.
                      </p>
                    </div>
                  )}

                  {/* Text Input - always shown for WhatsApp, optional for Ligação */}
                  <div className="space-y-2">
                    <Label>
                      {prospectionType === 'Ligação' && audioFile 
                        ? 'Transcrição (opcional - será gerada automaticamente)'
                        : prospectionType === 'Ligação'
                        ? 'Transcrição (ou faça upload do áudio acima)'
                        : 'Conversa'}
                    </Label>
                    <Textarea
                      value={conversationText}
                      onChange={(e) => {
                        setConversationText(e.target.value);
                        if (e.target.value.trim()) {
                          setAudioFile(null); // Clear audio if user types text
                        }
                      }}
                      placeholder={
                        prospectionType === 'Ligação'
                          ? 'Cole a transcrição da ligação ou faça upload do áudio acima...'
                          : 'Cole aqui o texto da conversa do WhatsApp...'
                      }
                      className="bg-secondary border-border min-h-[200px]"
                      disabled={isTranscribing}
                    />
                    <p className="text-xs text-muted-foreground">
                      A IA irá analisar a conversa e gerar automaticamente as notas, objeções e feedback.
                    </p>
                  </div>

                  <Button 
                    onClick={handleAnalyze} 
                    variant="accent" 
                    className="w-full"
                    disabled={isAnalyzing || isTranscribing}
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Transcrevendo áudio...
                      </>
                    ) : isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {prospectionType === 'Ligação' && audioFile 
                          ? 'Transcrever e Analisar'
                          : 'Analisar Prospecção'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {currentStep === 'review' && analysisResult && (
                <div className="space-y-6 pt-4">
                  {/* Score Summary */}
                  <div className="flex items-center justify-center p-6 rounded-xl bg-secondary/50">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Nota Final</p>
                      <ScoreBadge score={calculateFinalScore(analysisResult.scores)} size="xl" showLabel />
                      <div className={cn(
                        "mt-3 px-3 py-1 rounded-full text-sm font-medium",
                        resultLabels[analysisResult.result].color
                      )}>
                        {resultLabels[analysisResult.result].label}
                      </div>
                    </div>
                  </div>

                  {/* Scores Grid */}
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

                  {/* Objections */}
                  {analysisResult.objections.length > 0 && (
                    <div className="space-y-2">
                      <Label>Objeções Identificadas ({analysisResult.objections.length})</Label>
                      <div className="space-y-2">
                        {analysisResult.objections.map((obj, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-secondary/30 text-sm">
                            <p className="font-medium">{obj.description}</p>
                            <p className="text-muted-foreground mt-1">Resposta: {obj.sdrResponse}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              obj.wasEffective ? "text-success" : "text-destructive"
                            )}>
                              {obj.wasEffective ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span className="text-xs">{obj.wasEffective ? 'Efetivo' : 'Não Efetivo'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Feedback Preview */}
                  <div className="space-y-2">
                    <Label>Feedback da IA</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-xs font-medium text-success mb-2">Pontos Fortes</p>
                        <ul className="text-xs space-y-1">
                          {analysisResult.aiFeedback.pontosFortes.slice(0, 3).map((p, i) => (
                            <li key={i}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs font-medium text-destructive mb-2">A Melhorar</p>
                        <ul className="text-xs space-y-1">
                          {analysisResult.aiFeedback.pontosFracos.slice(0, 3).map((p, i) => (
                            <li key={i}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setCurrentStep('input')} className="flex-1">
                      Voltar
                    </Button>
                    <Button variant="accent" onClick={handleSave} className="flex-1">
                      Salvar Avaliação
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Evaluations List */}
        <div className="grid gap-4">
          {evaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma avaliação registrada ainda.</p>
              <p className="text-sm">Clique em "Nova Avaliação com IA" para começar.</p>
            </div>
          ) : (
            evaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="glass-card rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <ScoreBadge score={evaluation.finalScore} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getSDRName(evaluation.sdrId)}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {evaluation.type === 'Ligação' ? (
                        <Phone className="h-3 w-3" />
                      ) : (
                        <MessageCircle className="h-3 w-3" />
                      )}
                      <span>{evaluation.type}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(evaluation.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    resultLabels[evaluation.result].color
                  )}>
                    {resultLabels[evaluation.result].label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingEvaluation(evaluation)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Evaluation Dialog */}
      <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
        <DialogContent className="glass-card border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingEvaluation && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Avaliação</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{getSDRName(viewingEvaluation.sdrId)}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {viewingEvaluation.type === 'Ligação' ? (
                        <Phone className="h-3 w-3" />
                      ) : (
                        <MessageCircle className="h-3 w-3" />
                      )}
                      <span>{viewingEvaluation.type}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(viewingEvaluation.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge score={viewingEvaluation.finalScore} size="lg" showLabel />
                </div>

                <Tabs defaultValue="scores" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-secondary">
                    <TabsTrigger value="scores">Notas</TabsTrigger>
                    <TabsTrigger value="conversation">Conversa</TabsTrigger>
                    <TabsTrigger value="objections">Objeções</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback IA</TabsTrigger>
                  </TabsList>

                  <TabsContent value="scores" className="space-y-4 mt-4">
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
                        <div key={idx} className="p-3 rounded-lg bg-secondary/30">
                          <p className="font-medium">{obj.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Resposta: {obj.sdrResponse}
                          </p>
                          <div className={cn(
                            "flex items-center gap-1 mt-2",
                            obj.wasEffective ? "text-success" : "text-destructive"
                          )}>
                            {obj.wasEffective ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            <span className="text-sm">{obj.wasEffective ? 'Contorno Efetivo' : 'Contorno Não Efetivo'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="feedback" className="mt-4 space-y-4">
                    {viewingEvaluation.aiFeedback ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                            <p className="font-medium text-success mb-2">Pontos Fortes</p>
                            <ul className="text-sm space-y-1">
                              {viewingEvaluation.aiFeedback.pontosFortes.map((p, i) => (
                                <li key={i}>✓ {p}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="font-medium text-destructive mb-2">A Melhorar</p>
                            <ul className="text-sm space-y-1">
                              {viewingEvaluation.aiFeedback.pontosFracos.map((p, i) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Recomendações SPIN</Label>
                          <ul className="text-sm space-y-1 p-3 rounded-lg bg-secondary/30">
                            {viewingEvaluation.aiFeedback.recomendacoesSpin.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
