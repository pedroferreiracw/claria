import { cn } from '@/lib/utils';

interface ObjectionData {
  objection: string;
  count: number;
  effectiveness: number;
}

interface ObjectionsHeatmapProps {
  data: ObjectionData[];
}

export function ObjectionsHeatmap({ data }: ObjectionsHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.count));

  const getIntensity = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return 'bg-destructive/80';
    if (ratio > 0.6) return 'bg-destructive/60';
    if (ratio > 0.4) return 'bg-warning/60';
    if (ratio > 0.2) return 'bg-warning/40';
    return 'bg-success/40';
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div 
          key={index}
          className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm",
            getIntensity(item.count)
          )}>
            {item.count}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.objection}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div 
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${item.effectiveness}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{item.effectiveness}% eficácia</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
