import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Brain, FileText, Video, Loader2, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useClosers } from '@/hooks/useClosers';
import { useCloserEvaluations, useAddCloserEvaluation } from '@/hooks/useCloserEvaluations';
import { useCloserAnalysis } from '@/hooks/useCloserAnalysis';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { CloserScoresGrid } from '@/components/closer/CloserScoresGrid';
import { CloserFeedbackPanel } from '@/components/closer/CloserFeedbackPanel';
import { CloserEvaluation, calculateCloserFinalScore, getCloserScoreColor, getCloserScoreBgColor } from '@/types/closer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CloserEvaluations() {
  const { data: closers = [] } = useClosers();
  const { data: evaluations = [], isLoading: loadingEvaluations } = useCloserEvaluations();
  const addEvaluation = useAddCloserEvaluation();
  const { isAnalyzing, analysisResult, error: analysisError, analyzeCloserMeeting, resetAnalysis } = useCloserAnalysis();
  const { isTranscribing, transcribeAudio } = useAudioTranscription();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCloserId, setSelectedCloserId] = useState<string>('');
  const [transcription, setTranscription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [viewingEvaluation, setViewingEvaluation] = useState<CloserEvaluation | null>(null);

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
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {step === 'input' ? 'Nova Avaliação de Closer' : 'Revisar Análise'}
                </DialogTitle>
              </DialogHeader>

              {step === 'input' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Closer *</Label>
                    <Select value={selectedCloserId} onValueChange={setSelectedCloserId}>
                      <SelectTrigger>
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
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Upload de Áudio (opcional)</Label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
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
                      rows={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 100 caracteres para análise
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      disabled={!selectedCloserId || (transcription.length < 100 && !audioFile) || isAnalyzing || isTranscribing}
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

                  {analysisError && (
                    <p className="text-sm text-destructive">{analysisError}</p>
                  )}
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

                    <Tabs defaultValue="scores">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="scores">Scores</TabsTrigger>
                        <TabsTrigger value="objections">Objeções</TabsTrigger>
                        <TabsTrigger value="feedback">Feedback IA</TabsTrigger>
                      </TabsList>

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

        {/* Evaluations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Avaliações Recentes
            </CardTitle>
            <CardDescription>
              Histórico de avaliações de reuniões de fechamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvaluations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação realizada ainda.</p>
                <p className="text-sm">Clique em "Nova Avaliação" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {evaluations.map((evaluation) => (
                  <Card
                    key={evaluation.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setViewingEvaluation(evaluation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{getCloserName(evaluation.closerId)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(evaluation.date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center font-bold",
                            getCloserScoreBgColor(evaluation.finalScore)
                          )}
                        >
                          {evaluation.finalScore}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {getResultBadge(evaluation.result)}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Evaluation Dialog */}
        <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Avaliação - {viewingEvaluation && getCloserName(viewingEvaluation.closerId)}
              </DialogTitle>
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

                  <Tabs defaultValue="scores">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="transcription">Transcrição</TabsTrigger>
                      <TabsTrigger value="objections">Objeções</TabsTrigger>
                      <TabsTrigger value="feedback">Feedback IA</TabsTrigger>
                    </TabsList>

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
