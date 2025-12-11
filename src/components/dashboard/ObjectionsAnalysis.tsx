interface ObjectionsAnalysisProps {
  resolved: number;
  unresolved: number;
}

export function ObjectionsAnalysis({ resolved, unresolved }: ObjectionsAnalysisProps) {
  const total = resolved + unresolved;
  const resolvedPercent = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const unresolvedPercent = 100 - resolvedPercent;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Resolvidas</span>
          <span className="font-bold text-green-500">{resolved}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Não Resolvidas</span>
          <span className="font-bold text-destructive">{unresolved}</span>
        </div>
      </div>
      
      <div className="h-4 rounded-full overflow-hidden flex bg-muted/30">
        <div 
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${resolvedPercent}%` }}
        />
        <div 
          className="h-full bg-destructive transition-all duration-500"
          style={{ width: `${unresolvedPercent}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{resolvedPercent}%</span>
        <span>{unresolvedPercent}%</span>
      </div>
      
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Taxa de Resolução</span>
          <span className="text-2xl font-bold text-green-500">{resolvedPercent}%</span>
        </div>
      </div>
    </div>
  );
}
