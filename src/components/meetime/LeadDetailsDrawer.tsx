import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Building2, Mail, Phone, Target, Calendar } from "lucide-react";
import type { MeetimeLead } from "@/hooks/useMeetime";

interface LeadDetailsDrawerProps {
  lead: MeetimeLead | null;
  sdrName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDrawer({
  lead,
  sdrName,
  open,
  onOpenChange,
}: LeadDetailsDrawerProps) {
  if (!lead) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ganho</Badge>;
      case "lost":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Perdido</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Ativo</Badge>;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {lead.name || "Lead sem nome"}
            </DrawerTitle>
            <DrawerDescription className="flex items-center gap-2">
              {getStatusBadge(lead.status)}
              {lead.cadence_name && (
                <Badge variant="outline">{lead.cadence_name}</Badge>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {lead.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{lead.company}</p>
                </div>
              </div>
            )}

            {lead.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{lead.phone}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">SDR Responsável</p>
                <p className="font-medium">{sdrName}</p>
              </div>
            </div>

            {lead.fit_score !== null && (
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fit Score</p>
                  <p className="font-medium">{lead.fit_score}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Última Sincronização</p>
                <p className="font-medium">
                  {format(new Date(lead.synced_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Fechar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
