import { CloserScores, CLOSER_SCORE_LABELS, CLOSER_SCORE_WEIGHTS, CLOSER_SCORE_CATEGORIES, CLOSER_CATEGORY_LABELS, getCloserScoreColor, getCloserScoreBgColor } from '@/types/closer';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CloserScoresGridProps {
  scores: CloserScores;
}

export function CloserScoresGrid({ scores }: CloserScoresGridProps) {
  return (
    <div className="space-y-6">
      {Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {CLOSER_CATEGORY_LABELS[category]}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keys.map((key) => {
              const score = scores[key];
              const label = CLOSER_SCORE_LABELS[key];
              const weight = CLOSER_SCORE_WEIGHTS[key];

              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-help",
                        getCloserScoreBgColor(score)
                      )}
                    >
                      <span className="text-sm font-medium truncate pr-2">{label}</span>
                      <span className={cn("text-lg font-bold", getCloserScoreColor(score))}>
                        {score}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Peso: {weight}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
