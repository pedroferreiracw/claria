import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DealDetailsDrawer } from './DealDetailsDrawer';
import { SDR } from '@/types';

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

interface DealsTableProps {
  deals: Deal[];
  sdrs: SDR[];
  pageSize?: number;
}

export function DealsTable({ deals, sdrs, pageSize = 15 }: DealsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalPages = Math.ceil(deals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDeals = deals.slice(startIndex, startIndex + pageSize);

  const getSdrName = (sdrId: string | null | undefined) => {
    if (!sdrId) return '-';
    const sdr = sdrs.find((s) => s.id === sdrId);
    return sdr?.name || '-';
  };

  const handleRowClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDrawerOpen(true);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (deals.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum negócio encontrado com os filtros aplicados.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Organização</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedDeals.map((deal) => (
            <TableRow
              key={deal.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(deal)}
            >
              <TableCell className="font-medium">{deal.title}</TableCell>
              <TableCell className="text-muted-foreground">{deal.organization_name || '-'}</TableCell>
              <TableCell>{getSdrName(deal.sdr_id)}</TableCell>
              <TableCell>{deal.stage_name || '-'}</TableCell>
              <TableCell>
                {deal.value
                  ? deal.value.toLocaleString('pt-BR', { style: 'currency', currency: deal.currency || 'BRL' })
                  : '-'}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    deal.status === 'won'
                      ? 'bg-green-500/20 text-green-500'
                      : deal.status === 'lost'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }
                >
                  {deal.status === 'won' ? 'Ganho' : deal.status === 'lost' ? 'Perdido' : 'Aberto'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, deals.length)} de {deals.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DealDetailsDrawer
        deal={selectedDeal}
        sdrName={getSdrName(selectedDeal?.sdr_id)}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
