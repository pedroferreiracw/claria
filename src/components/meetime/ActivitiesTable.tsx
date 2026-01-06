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
import { ChevronLeft, ChevronRight, Phone, Mail, Search, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MeetimeActivity } from "@/hooks/useMeetime";

interface SDR {
  id: string;
  name: string;
}

interface ActivitiesTableProps {
  activities: MeetimeActivity[];
  sdrs: SDR[];
  pageSize?: number;
}

export function ActivitiesTable({ activities, sdrs, pageSize = 10 }: ActivitiesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(activities.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedActivities = activities.slice(startIndex, startIndex + pageSize);

  const sdrMap = useMemo(() => {
    return new Map(sdrs.map((s) => [s.id, s.name]));
  }, [sdrs]);

  const getSdrName = (sdrId: string | null) => {
    if (!sdrId) return "-";
    return sdrMap.get(sdrId) || "-";
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "CALL":
        return <Phone className="h-4 w-4" />;
      case "E_MAIL":
        return <Mail className="h-4 w-4" />;
      case "SEARCH":
        return <Search className="h-4 w-4" />;
      case "SOCIAL_POINT":
        return <Share2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case "CALL":
        return "Ligação";
      case "E_MAIL":
        return "E-mail";
      case "SEARCH":
        return "Pesquisa";
      case "SOCIAL_POINT":
        return "Social";
      default:
        return type || "-";
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "FINISHED":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Concluída</Badge>;
      case "IGNORED":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Ignorada</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Agendada</Badge>;
      default:
        return <Badge variant="outline">{status || "-"}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma atividade encontrada
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedActivities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getTypeIcon(activity.type)}
                  <span>{getTypeLabel(activity.type)}</span>
                </div>
              </TableCell>
              <TableCell>{getSdrName(activity.sdr_id)}</TableCell>
              <TableCell>
                {activity.execution_date
                  ? format(new Date(activity.execution_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })
                  : "-"}
              </TableCell>
              <TableCell>{formatDuration(activity.call_duration_seconds)}</TableCell>
              <TableCell>{getStatusBadge(activity.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, activities.length)} de{" "}
            {activities.length}
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
