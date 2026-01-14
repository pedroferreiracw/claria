import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarIcon, Filter, X, LayoutGrid, List } from 'lucide-react';
import { SDR } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export interface EvaluationFiltersState {
  closerId: string;
  result: string;
  searchQuery: string;
  dateRange: DateRange | undefined;
}

interface EvaluationFiltersProps {
  closers: SDR[];
  filters: EvaluationFiltersState;
  onFiltersChange: (filters: EvaluationFiltersState) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function EvaluationFilters({ 
  closers, 
  filters, 
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: EvaluationFiltersProps) {
  const hasActiveFilters = 
    filters.closerId !== 'all' || 
    filters.result !== 'all' || 
    filters.searchQuery.trim() !== '' ||
    filters.dateRange?.from;

  const clearFilters = () => {
    onFiltersChange({
      closerId: 'all',
      result: 'all',
      searchQuery: '',
      dateRange: undefined,
    });
  };

  const activeFilterCount = [
    filters.closerId !== 'all',
    filters.result !== 'all',
    filters.searchQuery.trim() !== '',
    filters.dateRange?.from,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na transcrição..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Closer Select */}
        <Select 
          value={filters.closerId} 
          onValueChange={(value) => onFiltersChange({ ...filters, closerId: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os closers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os closers</SelectItem>
            {closers.map((closer) => (
              <SelectItem key={closer.id} value={closer.id}>
                {closer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result Filter */}
        <Select 
          value={filters.result} 
          onValueChange={(value) => onFiltersChange({ ...filters, result: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="fechou">Fechou</SelectItem>
            <SelectItem value="nao_fechou">Não Fechou</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !filters.dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "dd/MM", { locale: ptBR })} -{" "}
                    {format(filters.dateRange.to, "dd/MM", { locale: ptBR })}
                  </>
                ) : (
                  format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                "Período"
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

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpar
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
