import { FeedbackItem, feedbackTitle, feedbackEvidence, journeyStageLabels } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';
import { HighlightTarget } from './ConversationViewer';

interface Props {
  items: FeedbackItem[];
  variant: 'positive' | 'negative';
  onViewInConversation?: (target: HighlightTarget) => void;
  compact?: boolean;
}

export function FeedbackList({ items, variant, onViewInConversation, compact }: Props) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground">Nada a listar.</p>;
  }
  return (
    <ul className={cn('space-y-2', compact && 'space-y-1')}>
      {items.map((item, i) => {
        const title = feedbackTitle(item);
        const ev = feedbackEvidence(item);
        return (
          <li
            key={i}
            className={cn(
              'rounded-md border p-2 text-sm space-y-1',
              variant === 'positive'
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-red-500/5 border-red-500/20'
            )}
          >
            <div className="flex items-start gap-2">
              <span className={cn(variant === 'positive' ? 'text-green-500' : 'text-red-500')}>
                {variant === 'positive' ? '✓' : '•'}
              </span>
              <p className="flex-1 leading-snug">{title}</p>
            </div>
            {ev && (ev.quote || ev.stage) && (
              <div className="ml-5 space-y-1">
                {ev.stage && (
                  <Badge variant="outline" className="text-[10px]">
                    {journeyStageLabels[ev.stage] ?? ev.stage}
                  </Badge>
                )}
                {ev.quote && (
                  <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-2">
                    "{ev.quote}"
                  </p>
                )}
                {ev.justificativa && (
                  <p className="text-[11px] text-muted-foreground">{ev.justificativa}</p>
                )}
                {onViewInConversation && (ev.quote || typeof ev.turnRef === 'number') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() =>
                      onViewInConversation({
                        turnRef: ev.turnRef,
                        charStart: ev.charStart,
                        charEnd: ev.charEnd,
                        quote: ev.quote,
                        key: Date.now(),
                      })
                    }
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver na conversa
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
