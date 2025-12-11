import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SDR } from '@/types';

interface DashboardFiltersProps {
  sdrs: SDR[];
  selectedSdr: string;
  onSdrChange: (sdrId: string) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function DashboardFilters({ 
  sdrs, 
  selectedSdr, 
  onSdrChange, 
  dateRange, 
  onDateRangeChange 
}: DashboardFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            {format(dateRange.from, "dd MMM", { locale: ptBR })} - {format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setIsCalendarOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      <Select value={selectedSdr} onValueChange={onSdrChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os SDRs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os SDRs</SelectItem>
          {sdrs.map((sdr) => (
            <SelectItem key={sdr.id} value={sdr.id}>
              {sdr.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
