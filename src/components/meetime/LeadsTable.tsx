import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LeadDetailsDrawer } from "./LeadDetailsDrawer";
import type { MeetimeLead } from "@/hooks/useMeetime";

interface SDR {
  id: string;
  name: string;
}

interface LeadsTableProps {
  leads: MeetimeLead[];
  sdrs: SDR[];
  pageSize?: number;
}

export function LeadsTable({ leads, sdrs, pageSize = 10 }: LeadsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<MeetimeLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const totalPages = Math.ceil(leads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLeads = leads.slice(startIndex, startIndex + pageSize);

  const sdrMap = useMemo(() => {
    return new Map(sdrs.map((s) => [s.id, s.name]));
  }, [sdrs]);

  const getSdrName = (sdrId: string | null) => {
    if (!sdrId) return "-";
    return sdrMap.get(sdrId) || "-";
  };

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

  const handleRowClick = (lead: MeetimeLead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum lead encontrado
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Cadência</TableHead>
            <TableHead>Fit Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedLeads.map((lead) => (
            <TableRow
              key={lead.id}
              onClick={() => handleRowClick(lead)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{lead.name || "-"}</TableCell>
              <TableCell>{lead.company || "-"}</TableCell>
              <TableCell>{getSdrName(lead.sdr_id)}</TableCell>
              <TableCell>{lead.cadence_name || "-"}</TableCell>
              <TableCell>
                {lead.fit_score !== null ? (
                  <Badge variant="outline">{lead.fit_score}</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{getStatusBadge(lead.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, leads.length)} de{" "}
            {leads.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <LeadDetailsDrawer
        lead={selectedLead}
        sdrName={selectedLead ? getSdrName(selectedLead.sdr_id) : "-"}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
