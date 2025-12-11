interface BANTData {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

interface BANTAnalysisProps {
  data: BANTData;
}

const colors = {
  budget: 'bg-blue-500',
  authority: 'bg-purple-500',
  need: 'bg-orange-500',
  timeline: 'bg-cyan-500',
};

const labels = {
  budget: 'Budget',
  authority: 'Authority',
  need: 'Need',
  timeline: 'Timeline',
};

export function BANTAnalysis({ data }: BANTAnalysisProps) {
  const maxValue = 100;
  
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-around gap-2 h-40">
        {(Object.keys(data) as (keyof BANTData)[]).map((key) => {
          const value = data[key];
          const height = (value / maxValue) * 100;
          
          return (
            <div key={key} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-sm font-bold text-foreground">{value}</span>
              <div className="w-full h-32 bg-muted/20 rounded-t-lg relative overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${colors[key]}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{labels[key]}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-center gap-4 pt-2">
        {(Object.keys(data) as (keyof BANTData)[]).map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors[key]}`} />
            <span className="text-xs text-muted-foreground">{labels[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
