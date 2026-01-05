import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Calendar, DollarSign, User, Layers, AlertCircle } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  value: number | null;
  currency: string | null;
  status: string | null;
  stage_name: string | null;
  organization_name?: string | null;
  person_name?: string | null;
  expected_close_date?: string | null;
  add_time?: string | null;
  won_time?: string | null;
  lost_time?: string | null;
  lost_reason?: string | null;
  pipeline_name?: string | null;
  sdr_id?: string | null;
}

interface DealDetailsDrawerProps {
  deal: Deal | null;
  sdrName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDetailsDrawer({ deal, sdrName, open, onOpenChange }: DealDetailsDrawerProps) {
  if (!deal) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: currency || 'BRL' });
  };

  const statusConfig = {
    won: { label: 'Ganho', className: 'bg-green-500/20 text-green-500' },
    lost: { label: 'Perdido', className: 'bg-red-500/20 text-red-500' },
    open: { label: 'Em Aberto', className: 'bg-yellow-500/20 text-yellow-500' },
  };

  const status = statusConfig[deal.status as keyof typeof statusConfig] || statusConfig.open;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle className="text-xl">{deal.title}</DrawerTitle>
                <DrawerDescription className="mt-1">
                  {deal.pipeline_name && `Pipeline: ${deal.pipeline_name}`}
                </DrawerDescription>
              </div>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-6">
            {/* Value Section */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Valor do Negócio</span>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(deal.value, deal.currency)}
              </p>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Organização</span>
                </div>
                <p className="font-medium">{deal.organization_name || '-'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Contato</span>
                </div>
                <p className="font-medium">{deal.person_name || '-'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">SDR Responsável</span>
                </div>
                <p className="font-medium">{sdrName}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Etapa</span>
                </div>
                <p className="font-medium">{deal.stage_name || '-'}</p>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datas
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p>{formatDate(deal.add_time)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fechamento Previsto</p>
                  <p>{deal.expected_close_date ? format(new Date(deal.expected_close_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
                {deal.status === 'won' && deal.won_time && (
                  <div>
                    <p className="text-muted-foreground">Ganho em</p>
                    <p className="text-green-500">{formatDate(deal.won_time)}</p>
                  </div>
                )}
                {deal.status === 'lost' && deal.lost_time && (
                  <div>
                    <p className="text-muted-foreground">Perdido em</p>
                    <p className="text-red-500">{formatDate(deal.lost_time)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lost Reason */}
            {deal.status === 'lost' && deal.lost_reason && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    Motivo da Perda
                  </h4>
                  <p className="text-sm bg-red-500/10 p-3 rounded-lg">{deal.lost_reason}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
