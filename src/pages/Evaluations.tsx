import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { ScoreBadge, ScoreBar } from '@/components/ui/score-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  ClipboardCheck, 
  Phone, 
  MessageCircle, 
  Calendar,
  Eye,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ProspectionType, ProspectionResult, Scores, Evaluation, Objection, calculateFinalScore, getScoreColor } from '@/types';
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

const initialScores: Scores = {
  abertura: 50,
  rapport: 50,
  spin: 50,
  bant: 50,
  dores: 50,
  geracaoValor: 50,
  conducaoAgendamento: 50,
  contornoObjecoes: 50,
};

export default function EvaluationsPage() {
  const { sdrs, evaluations, addEvaluation } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState<Evaluation | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    sdrId: '',
    type: '' as ProspectionType | '',
    date: new Date().toISOString().split('T')[0],
    conversationText: '',
    questionsAsked: '',
    leadResponses: '',
    result: '' as ProspectionResult | '',
    objections: [] as Objection[],
    scores: { ...initialScores },
  });

  const [newObjection, setNewObjection] = useState({
    description: '',
    sdrResponse: '',
    wasEffective: true,
  });

  const handleAddObjection = () => {
    if (!newObjection.description) return;
    
    const objection: Objection = {
      id: String(Date.now()),
      ...newObjection,
    };
    
    setFormData({
      ...formData,
      objections: [...formData.objections, objection],
    });
    
    setNewObjection({
      description: '',
      sdrResponse: '',
      wasEffective: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.sdrId || !formData.type || !formData.result) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const finalScore = calculateFinalScore(formData.scores);

    const evaluation: Omit<Evaluation, 'id' | 'createdAt'> = {
      sdrId: formData.sdrId,
      type: formData.type as ProspectionType,
      date: new Date(formData.date),
      conversationText: formData.conversationText,
      questionsAsked: formData.questionsAsked.split('\n').filter(Boolean),
      leadResponses: formData.leadResponses.split('\n').filter(Boolean),
      result: formData.result as ProspectionResult,
      objections: formData.objections,
      scores: formData.scores,
      finalScore,
      aiFeedback: generateMockAIFeedback(formData.scores, formData.objections),
    };

    addEvaluation(evaluation);
    toast.success('Avaliação registrada com sucesso!');
    
    setFormData({
      sdrId: '',
      type: '',
      date: new Date().toISOString().split('T')[0],
      conversationText: '',
      questionsAsked: '',
      leadResponses: '',
      result: '',
      objections: [],
      scores: { ...initialScores },
    });
    setCurrentStep(1);
    setIsDialogOpen(false);
  };

  const generateMockAIFeedback = (scores: Scores, objections: Objection[]) => {
    return {
      pontosFortes: [
        scores.rapport >= 70 ? 'Excelente construção de rapport com o lead' : null,
        scores.spin >= 70 ? 'Boa aplicação da metodologia SPIN' : null,
        scores.conducaoAgendamento >= 70 ? 'Ótima condução para agendamento' : null,
      ].filter(Boolean) as string[],
      pontosFracos: [
        scores.dores < 60 ? 'Precisa aprofundar na identificação de dores' : null,
        scores.bant < 60 ? 'Qualificação BANT pode ser melhorada' : null,
        scores.abertura < 60 ? 'A abertura precisa ser mais impactante' : null,
      ].filter(Boolean) as string[],
      recomendacoesSpin: [
        'Fazer mais perguntas de Situação antes de avançar',
        'Explorar melhor as Implicações dos problemas identificados',
      ],
      recomendacoesBant: [
        'Confirmar orçamento disponível mais cedo na conversa',
        'Identificar o decisor final no início',
      ],
      recomendacoesProcesso: [
        'Utilizar mais gatilhos de urgência',
        'Apresentar cases de sucesso relevantes',
      ],
      analiseObjecoes: objections.map(obj => ({
        objection: obj.description,
        wasEffective: obj.wasEffective,
        melhorContorno: obj.wasEffective 
          ? 'Abordagem foi eficaz, manter estratégia'
          : 'Tentar abordagem mais consultiva',
        respostaIdeal: `Para "${obj.description}": Reconhecer a preocupação e apresentar valor específico`,
      })),
    };
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
              <p className="text-muted-foreground">Registre e analise prospecções</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="h-4 w-4 mr-2" />
                Nova Avaliação
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Avaliação de Prospecção</DialogTitle>
              </DialogHeader>

              {/* Steps */}
              <div className="flex items-center gap-2 my-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      currentStep >= step 
                        ? "gradient-accent text-accent-foreground" 
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {step}
                    </div>
                    {step < 3 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                    )}
                  </div>
                ))}
              </div>

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SDR</Label>
                      <Select
                        value={formData.sdrId}
                        onValueChange={(value) => setFormData({ ...formData, sdrId: value })}
                      >
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
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as ProspectionType })}
                      >
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

                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Conversa / Transcrição</Label>
                    <Textarea
                      value={formData.conversationText}
                      onChange={(e) => setFormData({ ...formData, conversationText: e.target.value })}
                      placeholder="Cole aqui o texto da conversa ou transcrição..."
                      className="bg-secondary border-border min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Perguntas Feitas (uma por linha)</Label>
                      <Textarea
                        value={formData.questionsAsked}
                        onChange={(e) => setFormData({ ...formData, questionsAsked: e.target.value })}
                        placeholder="Pergunta 1&#10;Pergunta 2..."
                        className="bg-secondary border-border min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Respostas do Lead</Label>
                      <Textarea
                        value={formData.leadResponses}
                        onChange={(e) => setFormData({ ...formData, leadResponses: e.target.value })}
                        placeholder="Resposta 1&#10;Resposta 2..."
                        className="bg-secondary border-border min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Resultado</Label>
                    <Select
                      value={formData.result}
                      onValueChange={(value) => setFormData({ ...formData, result: value as ProspectionResult })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prosseguiu">Prosseguiu para Reunião</SelectItem>
                        <SelectItem value="recusou">Recusou</SelectItem>
                        <SelectItem value="perdeu_interesse">Perdeu Interesse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Objections */}
                  <div className="space-y-3">
                    <Label>Objeções Recebidas</Label>
                    {formData.objections.map((obj, idx) => (
                      <div key={obj.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                        <p className="font-medium">{obj.description}</p>
                        <p className="text-muted-foreground mt-1">Resposta: {obj.sdrResponse}</p>
                        <span className={cn(
                          "text-xs",
                          obj.wasEffective ? "text-success" : "text-destructive"
                        )}>
                          {obj.wasEffective ? '✓ Efetivo' : '✗ Não Efetivo'}
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 gap-2 p-3 rounded-lg border border-dashed border-border">
                      <Input
                        value={newObjection.description}
                        onChange={(e) => setNewObjection({ ...newObjection, description: e.target.value })}
                        placeholder="Descrição da objeção..."
                        className="bg-secondary border-border"
                      />
                      <Input
                        value={newObjection.sdrResponse}
                        onChange={(e) => setNewObjection({ ...newObjection, sdrResponse: e.target.value })}
                        placeholder="Como o SDR respondeu..."
                        className="bg-secondary border-border"
                      />
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newObjection.wasEffective}
                            onChange={(e) => setNewObjection({ ...newObjection, wasEffective: e.target.checked })}
                            className="rounded"
                          />
                          Contorno foi efetivo
                        </label>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddObjection}>
                          Adicionar Objeção
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => setCurrentStep(2)} variant="accent" className="w-full">
                    Próximo: Pontuação
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Avalie cada critério de 0 a 100
                  </p>
                  
                  {(Object.keys(formData.scores) as Array<keyof Scores>).map((key) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>{scoreLabels[key]}</Label>
                        <span className={cn("font-bold", getScoreColor(formData.scores[key]))}>
                          {formData.scores[key]}
                        </span>
                      </div>
                      <Slider
                        value={[formData.scores[key]]}
                        onValueChange={([value]) => setFormData({
                          ...formData,
                          scores: { ...formData.scores, [key]: value }
                        })}
                        max={100}
                        step={1}
                        className="py-2"
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-center p-4 rounded-lg bg-secondary/50">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Nota Final Calculada</p>
                      <ScoreBadge score={calculateFinalScore(formData.scores)} size="xl" showLabel />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={() => setCurrentStep(3)} variant="accent" className="flex-1">
                      Próximo: Confirmar
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SDR</span>
                      <span className="font-medium">{getSDRName(formData.sdrId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-medium">{formData.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resultado</span>
                      <span className="font-medium">{formData.result}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Objeções</span>
                      <span className="font-medium">{formData.objections.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center p-6 rounded-lg gradient-card">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Nota Final</p>
                      <ScoreBadge score={calculateFinalScore(formData.scores)} size="xl" showLabel />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <p className="text-sm">O feedback com IA será gerado automaticamente ao salvar.</p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setCurrentStep(2)} variant="outline" className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={handleSubmit} variant="accent" className="flex-1">
                      Salvar Avaliação
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Evaluations List */}
        <div className="space-y-4">
          {evaluations.map((evaluation) => (
            <div 
              key={evaluation.id}
              className="glass-card rounded-xl p-6 hover:scale-[1.01] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={evaluation.finalScore} size="md" />
                  <div>
                    <h3 className="font-semibold">{getSDRName(evaluation.sdrId)}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {evaluation.type === 'Ligação' ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Ligação
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(evaluation.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    resultLabels[evaluation.result].color
                  )}>
                    {resultLabels[evaluation.result].label}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewingEvaluation(evaluation)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Ver Detalhes
                  </Button>
                </div>
              </div>

              {/* Score bars preview */}
              <div className="mt-4 grid grid-cols-4 gap-4">
                {['abertura', 'rapport', 'spin', 'bant'].map((key) => (
                  <ScoreBar 
                    key={key}
                    label={scoreLabels[key as keyof Scores]}
                    score={evaluation.scores[key as keyof Scores]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* View Evaluation Dialog */}
        <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
          <DialogContent className="glass-card border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
            {viewingEvaluation && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <ScoreBadge score={viewingEvaluation.finalScore} size="md" />
                    <div>
                      <span>Avaliação de {getSDRName(viewingEvaluation.sdrId)}</span>
                      <p className="text-sm font-normal text-muted-foreground">
                        {format(new Date(viewingEvaluation.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="scores" className="mt-4">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="scores">Pontuação</TabsTrigger>
                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback IA</TabsTrigger>
                  </TabsList>

                  <TabsContent value="scores" className="space-y-4 mt-4">
                    {Object.entries(viewingEvaluation.scores).map(([key, value]) => (
                      <ScoreBar 
                        key={key}
                        label={scoreLabels[key as keyof Scores]}
                        score={value}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    {viewingEvaluation.conversationText && (
                      <div className="space-y-2">
                        <Label>Conversa</Label>
                        <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                          {viewingEvaluation.conversationText}
                        </div>
                      </div>
                    )}

                    {viewingEvaluation.objections.length > 0 && (
                      <div className="space-y-2">
                        <Label>Objeções</Label>
                        {viewingEvaluation.objections.map((obj) => (
                          <div key={obj.id} className="p-3 rounded-lg bg-secondary/50">
                            <p className="font-medium text-sm">{obj.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Resposta: {obj.sdrResponse}
                            </p>
                            <span className={cn(
                              "text-xs",
                              obj.wasEffective ? "text-success" : "text-destructive"
                            )}>
                              {obj.wasEffective ? '✓ Efetivo' : '✗ Não Efetivo'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="feedback" className="space-y-4 mt-4">
                    {viewingEvaluation.aiFeedback ? (
                      <>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-success" /> Pontos Fortes
                          </Label>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {viewingEvaluation.aiFeedback.pontosFortes.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-warning" /> Pontos de Melhoria
                          </Label>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {viewingEvaluation.aiFeedback.pontosFracos.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <Label>Recomendações SPIN</Label>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {viewingEvaluation.aiFeedback.recomendacoesSpin.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <Label>Recomendações BANT</Label>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {viewingEvaluation.aiFeedback.recomendacoesBant.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        {viewingEvaluation.aiFeedback.analiseObjecoes.length > 0 && (
                          <div className="space-y-2">
                            <Label>Análise de Objeções</Label>
                            {viewingEvaluation.aiFeedback.analiseObjecoes.map((obj, i) => (
                              <div key={i} className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
                                <p className="font-medium">{obj.objection}</p>
                                <p className="text-muted-foreground">{obj.melhorContorno}</p>
                                <p className="text-accent">{obj.respostaIdeal}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Feedback não disponível
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
