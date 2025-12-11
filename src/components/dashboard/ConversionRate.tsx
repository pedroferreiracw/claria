interface ConversionRateProps {
  rate: number;
  label?: string;
}

export function ConversionRate({ rate, label = 'Taxa de Conversão' }: ConversionRateProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-foreground">{rate}%</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      
      <div className="relative">
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
