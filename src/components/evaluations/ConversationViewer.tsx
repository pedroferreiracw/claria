import { useEffect, useRef, useState } from 'react';
import { ConversationTurn } from '@/types';
import { cn } from '@/lib/utils';

export interface HighlightTarget {
  turnRef?: number;
  charStart?: number;
  charEnd?: number;
  quote?: string;
  key?: number; // muda para forçar re-highlight
}

interface Props {
  timeline?: ConversationTurn[];
  fallbackText?: string;
  highlight?: HighlightTarget | null;
}

export function ConversationViewer({ timeline, fallbackText, highlight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (!highlight) return;
    setPulseKey((k) => k + 1);
    // scroll after DOM render
    setTimeout(() => {
      const root = containerRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>('[data-highlight="active"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [highlight?.turnRef, highlight?.charStart, highlight?.charEnd, highlight?.key, highlight?.quote]);

  // Modo timeline estruturada
  if (timeline && timeline.length > 0) {
    return (
      <div ref={containerRef} className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
        {timeline.map((turn) => {
          const isActive = highlight?.turnRef === turn.turnIndex;
          const isSDR = /sdr|vend|comerc/i.test(turn.speaker);
          return (
            <div
              key={turn.turnIndex}
              data-turn={turn.turnIndex}
              data-highlight={isActive ? 'active' : undefined}
              className={cn(
                'rounded-lg border p-3 text-sm transition-colors',
                isSDR ? 'bg-primary/5 border-primary/20 ml-6' : 'bg-muted/40 mr-6',
                isActive && 'ring-2 ring-primary animate-pulse'
              )}
              style={isActive ? { animationIterationCount: 2, animationDuration: '0.8s' } : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                  #{turn.turnIndex} · {turn.speaker}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
            </div>
          );
        })}
        {/* força re-render do pulse */}
        <span className="hidden" data-pulse={pulseKey} />
      </div>
    );
  }

  // Fallback: texto cru com destaque por char offset OU por quote
  const text = fallbackText || '';
  let before = text;
  let match = '';
  let after = '';
  if (highlight) {
    if (
      typeof highlight.charStart === 'number' &&
      typeof highlight.charEnd === 'number' &&
      highlight.charEnd > highlight.charStart
    ) {
      before = text.slice(0, highlight.charStart);
      match = text.slice(highlight.charStart, highlight.charEnd);
      after = text.slice(highlight.charEnd);
    } else if (highlight.quote) {
      const idx = text.toLowerCase().indexOf(highlight.quote.toLowerCase());
      if (idx >= 0) {
        before = text.slice(0, idx);
        match = text.slice(idx, idx + highlight.quote.length);
        after = text.slice(idx + highlight.quote.length);
      }
    }
  }

  return (
    <div ref={containerRef} className="max-h-[420px] overflow-y-auto rounded-lg bg-secondary/30 p-3 text-sm whitespace-pre-wrap">
      {match ? (
        <>
          {before}
          <mark
            data-highlight="active"
            className="bg-primary/30 text-foreground rounded px-0.5 animate-pulse"
            style={{ animationIterationCount: 2, animationDuration: '0.8s' }}
          >
            {match}
          </mark>
          {after}
        </>
      ) : (
        text || <span className="text-muted-foreground">Sem texto disponível.</span>
      )}
      <span className="hidden" data-pulse={pulseKey} />
    </div>
  );
}
