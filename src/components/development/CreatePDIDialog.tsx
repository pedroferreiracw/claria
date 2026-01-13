import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SDR } from '@/types';
import { PDIPriority, PDIStatus } from '@/types/goals';
import { useAddDevelopmentPlan } from '@/hooks/useDevelopmentPlans';

interface CreatePDIDialogProps {
  sdrs: SDR[];
}

const areaOptions = [
  { value: 'abertura', label: 'Abertura' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'spin', label: 'SPIN' },
  { value: 'bant', label: 'BANT' },
  { value: 'dores', label: 'Dores' },
  { value: 'geracaoValor', label: 'Geração de Valor' },
  { value: 'conducaoAgendamento', label: 'Condução p/ Agendamento' },
  { value: 'contornoObjecoes', label: 'Contorno de Objeções' },
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'escuta_ativa', label: 'Escuta Ativa' },
  { value: 'organizacao', label: 'Organização' },
  { value: 'outro', label: 'Outro' },
];

const priorityOptions: { value: PDIPriority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export function CreatePDIDialog({ sdrs }: CreatePDIDialogProps) {
  const [open, setOpen] = useState(false);
  const [sdrId, setSdrId] = useState('');
  const [weakArea, setWeakArea] = useState('');
  const [priority, setPriority] = useState<PDIPriority>('medium');
  const [recommendation, setRecommendation] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  
  const addPlan = useAddDevelopmentPlan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sdrId || !weakArea || !recommendation) {
      return;
    }

    await addPlan.mutateAsync({
      sdrId,
      weakArea,
      priority,
      recommendation,
      status: 'pending' as PDIStatus,
      dueDate,
    });

    // Reset form
    setSdrId('');
    setWeakArea('');
    setPriority('medium');
    setRecommendation('');
    setDueDate(undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-accent">
          <Plus className="h-4 w-4 mr-2" />
          Criar Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Plano de Desenvolvimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>SDR</Label>
            <Select value={sdrId} onValueChange={setSdrId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o SDR" />
              </SelectTrigger>
              <SelectContent>
                {sdrs.map((sdr) => (
                  <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área de Melhoria</Label>
            <Select value={weakArea} onValueChange={setWeakArea}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((area) => (
                  <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as PDIPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recomendação</Label>
            <Textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Descreva a ação recomendada para melhoria..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Limite (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addPlan.isPending || !sdrId || !weakArea || !recommendation}>
              {addPlan.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Plano
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
