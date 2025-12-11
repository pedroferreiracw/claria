import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Objection {
  id: string;
  date: Date;
  sdrName: string;
  objection: string;
  response: string;
  resolved: boolean;
}

interface ObjectionsListProps {
  objections: Objection[];
  maxItems?: number;
}

export function ObjectionsList({ objections, maxItems = 5 }: ObjectionsListProps) {
  const displayedObjections = objections.slice(0, maxItems);

  if (displayedObjections.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Nenhuma objeção registrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedObjections.map((item) => (
        <div 
          key={item.id}
          className="p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(item.date, "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Badge variant="outline" className="text-xs">
                {item.sdrName}
              </Badge>
            </div>
            <Badge 
              variant={item.resolved ? "default" : "destructive"}
              className="text-xs"
            >
              {item.resolved ? 'Resolvida' : 'Não Resolvida'}
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-2">
            "{item.objection}"
          </p>
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            Resposta: {item.response}
          </p>
          
          <div className="flex items-center justify-end mt-2">
            <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver análise <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
