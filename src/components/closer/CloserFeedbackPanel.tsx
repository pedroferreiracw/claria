import { CloserAIFeedback } from '@/types/closer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, Target, Presentation, MessageSquare } from 'lucide-react';

interface CloserFeedbackPanelProps {
  feedback: CloserAIFeedback;
}

export function CloserFeedbackPanel({ feedback }: CloserFeedbackPanelProps) {
  return (
    <div className="space-y-6">
      {/* Pontos Fortes e Fracos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.pontosFortes.map((ponto, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {ponto}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Pontos a Melhorar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.pontosFracos.map((ponto, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {ponto}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Recomendações SPIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.recomendacoesSpin.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Recomendações de Fechamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.recomendacoesFechamento.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Presentation className="h-4 w-4 text-purple-500" />
              Recomendações de Demonstração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.recomendacoesDemonstracao.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Objeções */}
      {feedback.analiseObjecoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Análise de Objeções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedback.analiseObjecoes.map((analise, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">"{analise.objection}"</p>
                    <Badge variant={analise.wasEffective ? 'default' : 'destructive'}>
                      {analise.wasEffective ? 'Efetivo' : 'Ineficaz'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Melhor contorno: </span>
                      {analise.melhorContorno}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Resposta ideal: </span>
                      {analise.respostaIdeal}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
