import { useMemo } from 'react';

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export function ScoreGauge({ score, label = 'Média SDR', size = 200 }: ScoreGaugeProps) {
  const { color, strokeDasharray, strokeDashoffset } = useMemo(() => {
    const circumference = 2 * Math.PI * 80; // radius = 80
    const offset = circumference - (score / 100) * circumference;
    
    let color = 'hsl(var(--destructive))';
    if (score >= 80) color = 'hsl(142, 76%, 36%)'; // green
    else if (score >= 60) color = 'hsl(48, 96%, 53%)'; // yellow
    
    return {
      color,
      strokeDasharray: circumference,
      strokeDashoffset: offset,
    };
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox="0 0 200 200"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground mt-1">/100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground mt-4">{label}</span>
    </div>
  );
}
