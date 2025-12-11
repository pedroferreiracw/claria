import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PhaseScore {
  phase: string;
  score: number;
  description?: string;
}

interface PhaseScoresTableProps {
  data: PhaseScore[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-destructive';
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-destructive';
}

export function PhaseScoresTable({ data }: PhaseScoresTableProps) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_60px_1fr] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Fase</span>
        <span className="text-center">Média</span>
        <span>Progresso</span>
      </div>
      
      <div className="space-y-1">
        {data.map((item, index) => (
          <div 
            key={index}
            className="grid grid-cols-[1fr_60px_1fr] gap-4 items-center px-3 py-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className={`w-1 h-6 rounded-full ${getScoreColor(item.score)}`} />
              <span className="text-sm font-medium text-foreground">{item.phase}</span>
              {item.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <span className={`text-sm font-bold text-center ${getScoreTextColor(item.score)}`}>
              {item.score}
            </span>
            
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getScoreColor(item.score)}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center pt-3">
        Clique em uma linha para ver detalhes
      </p>
    </div>
  );
}
