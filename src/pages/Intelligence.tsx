import { MainLayout } from '@/components/layout/MainLayout';
import { Brain } from 'lucide-react';

export default function IntelligencePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inteligência Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Central de análise automatizada de prospecções do time de pré-vendas.
          </p>
        </div>

        <div className="glass-card rounded-xl p-12 text-center">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Em breve</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            As conversas de prospecção serão recebidas via webhook do n8n e analisadas automaticamente pela IA.
            Configure o webhook no n8n para enviar as mensagens do WhatsApp para esta central.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
