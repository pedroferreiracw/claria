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
import type { MeetimeMeeting } from "@/hooks/useMeetime";

interface SDR {
  id: string;
  name: string;
}

interface MeetingsTableProps {
  meetings: MeetimeMeeting[];
  sdrs: SDR[];
  pageSize?: number;
}

export function MeetingsTable({ meetings, sdrs, pageSize = 10 }: MeetingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(meetings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMeetings = meetings.slice(startIndex, startIndex + pageSize);

  const sdrMap = useMemo(() => {
    return new Map(sdrs.map((s) => [s.id, s.name]));
  }, [sdrs]);

  const getSdrName = (sdrId: string | null) => {
    if (!sdrId) return "-";
    return sdrMap.get(sdrId) || "-";
  };

  const getStatusBadge = (status: string, noShow: boolean) => {
    if (noShow) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">No-show</Badge>;
    }
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Realizada</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Cancelada</Badge>;
      case "scheduled":
      default:
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Agendada</Badge>;
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum agendamento encontrado
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedMeetings.map((meeting) => (
            <TableRow key={meeting.id}>
              <TableCell>
                {meeting.scheduled_at
                  ? format(new Date(meeting.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : "-"}
              </TableCell>
              <TableCell>{getSdrName(meeting.sdr_id)}</TableCell>
              <TableCell>{getStatusBadge(meeting.status, meeting.no_show)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, meetings.length)} de{" "}
            {meetings.length}
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
