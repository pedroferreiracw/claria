import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, CalendarIcon, Grid3X3, List, Phone, MessageCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { SDR, ProspectionType } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface SDREvaluationFiltersState {
  sdrId: string;
  type: ProspectionType | 'all';
  result: 'prosseguiu' | 'recusou' | 'perdeu_interesse' | 'all';
  searchQuery: string;
  dateRange: DateRange | undefined;
}

interface SDREvaluationFiltersProps {
  sdrs: SDR[];
  filters: SDREvaluationFiltersState;
  onFiltersChange: (filters: SDREvaluationFiltersState) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function SDREvaluationFilters({
  sdrs,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: SDREvaluationFiltersProps) {
  const clearFilters = () => {
    onFiltersChange({
      sdrId: 'all',
      type: 'all',
      result: 'all',
      searchQuery: '',
      dateRange: undefined,
    });
  };

  const activeFiltersCount = [
    filters.sdrId !== 'all',
    filters.type !== 'all',
    filters.result !== 'all',
    filters.searchQuery.trim() !== '',
    filters.dateRange?.from !== undefined,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na conversa..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* SDR Select */}
      <Select
        value={filters.sdrId}
        onValueChange={(value) => onFiltersChange({ ...filters, sdrId: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos SDRs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos SDRs</SelectItem>
          {sdrs.map((sdr) => (
            <SelectItem key={sdr.id} value={sdr.id}>
              {sdr.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Select */}
      <Select
        value={filters.type}
        onValueChange={(value) => onFiltersChange({ ...filters, type: value as ProspectionType | 'all' })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Tipos</SelectItem>
          <SelectItem value="Ligação">
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              Ligação
            </div>
          </SelectItem>
          <SelectItem value="WhatsApp">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Result Select */}
      <Select
        value={filters.result}
        onValueChange={(value) => onFiltersChange({ ...filters, result: value as typeof filters.result })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Resultado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Resultados</SelectItem>
          <SelectItem value="prosseguiu">Prosseguiu</SelectItem>
          <SelectItem value="recusou">Recusou</SelectItem>
          <SelectItem value="perdeu_interesse">Perdeu Interesse</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('w-[200px] justify-start text-left font-normal', !filters.dateRange && 'text-muted-foreground')}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange?.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, 'dd/MM', { locale: ptBR })} -{' '}
                  {format(filters.dateRange.to, 'dd/MM', { locale: ptBR })}
                </>
              ) : (
                format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              'Período'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.dateRange?.from}
            selected={filters.dateRange}
            onSelect={(range) => onFiltersChange({ ...filters, dateRange: range })}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {activeFiltersCount}
          </Badge>
        </Button>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 ml-auto border rounded-lg p-1">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
