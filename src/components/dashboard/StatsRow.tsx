import { CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface StatsRowProps {
  successes: number;
  total: number;
  failures: number;
}

export function StatsRow({ successes, total, failures }: StatsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/10">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-green-500">{successes}</p>
          <p className="text-xs text-muted-foreground">Sucessos</p>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border" />
      
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border" />
      
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="text-2xl font-bold text-destructive">{failures}</p>
          <p className="text-xs text-muted-foreground">Falhas</p>
        </div>
      </div>
    </div>
  );
}
