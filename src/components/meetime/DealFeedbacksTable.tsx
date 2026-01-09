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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MeetimeDealFeedback } from "@/hooks/useMeetime";

interface SDR {
  id: string;
  name: string;
}

interface DealFeedbacksTableProps {
  feedbacks: MeetimeDealFeedback[];
  sdrs: SDR[];
  pageSize?: number;
}

export function DealFeedbacksTable({ feedbacks, sdrs, pageSize = 10 }: DealFeedbacksTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(feedbacks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFeedbacks = feedbacks.slice(startIndex, startIndex + pageSize);

  const sdrMap = useMemo(() => {
    return new Map(sdrs.map((s) => [s.id, s.name]));
  }, [sdrs]);

  const getSdrName = (sdrId: string | null) => {
    if (!sdrId) return "-";
    return sdrMap.get(sdrId) || "-";
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case "QUALIFIED":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Qualificado</Badge>;
      case "UNQUALIFIED":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Não Qualificado</Badge>;
      case "NO_CONTACT":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">No-show</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">{result || "-"}</Badge>;
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma oportunidade encontrada
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data da Reunião</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedFeedbacks.map((feedback) => (
            <TableRow key={feedback.id}>
              <TableCell>
                {feedback.meeting_date
                  ? format(new Date(feedback.meeting_date), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : "-"}
              </TableCell>
              <TableCell>{getSdrName(feedback.sdr_id)}</TableCell>
              <TableCell>{getResultBadge(feedback.result)}</TableCell>
              <TableCell className="max-w-xs truncate">
                {feedback.notes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, feedbacks.length)} de{" "}
            {feedbacks.length}
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
    </div>
  );
}
