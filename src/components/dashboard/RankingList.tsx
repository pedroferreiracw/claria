import { cn } from '@/lib/utils';
import { ScoreBadge } from '@/components/ui/score-badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { SDR } from '@/types';

interface RankingItem {
  sdr: SDR;
  score: number;
  position: number;
}

interface RankingListProps {
  items: RankingItem[];
  className?: string;
}

const positionIcons = [
  { icon: Trophy, color: 'text-yellow-accent' },
  { icon: Medal, color: 'text-muted-foreground' },
  { icon: Award, color: 'text-orange-400' },
];

export function RankingList({ items, className }: RankingListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const PositionIcon = positionIcons[index]?.icon;
        const positionColor = positionIcons[index]?.color;
        
        return (
          <div 
            key={item.sdr.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg transition-all duration-200 hover:bg-secondary/50",
              index === 0 && "glass-card border border-yellow-accent/30"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8">
              {PositionIcon ? (
                <PositionIcon className={cn("h-6 w-6", positionColor)} />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">{item.position}</span>
              )}
            </div>
            
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center">
              <span className="text-sm font-semibold">{item.sdr.name.charAt(0)}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.sdr.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.sdr.squad} • {item.sdr.role}
              </p>
            </div>
            
            <ScoreBadge score={item.score} size="sm" />
          </div>
        );
      })}
    </div>
  );
}
