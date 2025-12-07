import { cn } from '@/lib/utils';
import { getScoreColor, getScoreBgColor } from '@/types';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({ score, size = 'md', showLabel = false, className }: ScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const bgColorClass = getScoreBgColor(score);
  
  const getLabel = () => {
    if (score === 100) return 'Perfeito';
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    return 'Precisa Melhorar';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div 
        className={cn(
          "rounded-full flex items-center justify-center font-bold",
          bgColorClass,
          sizeClasses[size],
          score === 100 && "animate-glow"
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", colorClass)}>
          {getLabel()}
        </span>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  className?: string;
}

export function ScoreBar({ label, score, className }: ScoreBarProps) {
  const bgColorClass = getScoreBgColor(score);
  
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", getScoreColor(score))}>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", bgColorClass)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
