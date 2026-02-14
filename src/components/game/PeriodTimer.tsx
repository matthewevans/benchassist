import { PlayIcon, PauseIcon, RotateCcwIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';

interface PeriodTimerProps {
  timer: UsePeriodTimerResult;
}

export function PeriodTimer({ timer }: PeriodTimerProps) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* Time display + controls */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Period {timer.periodIndex + 1}
            </p>
            <p className={cn(
              "text-2xl font-mono font-bold tabular-nums",
              timer.isOvertime && "text-destructive",
            )}>
              {timer.formattedElapsed}
              <span className="text-base font-normal text-muted-foreground">
                {' '}/ {timer.formattedDuration}
              </span>
            </p>
          </div>
          <div className="flex gap-1">
            {timer.isRunning ? (
              <Button variant="outline" size="icon" onClick={timer.pause} aria-label="Pause timer">
                <PauseIcon className="size-4" />
              </Button>
            ) : (
              <Button variant="default" size="icon" onClick={timer.play} aria-label="Start timer">
                <PlayIcon className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={timer.reset} aria-label="Reset timer">
              <RotateCcwIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar with substitution markers */}
        <div className="relative w-full h-2.5">
          {/* Background track */}
          <div className="absolute inset-0 bg-secondary rounded-full" />
          {/* Fill */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
              timer.isOvertime ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${timer.progress * 100}%` }}
          />
          {/* Substitution markers */}
          {timer.markers.map((marker, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/50 rounded-full"
              style={{ left: `${marker.progress * 100}%` }}
            />
          ))}
        </div>

        {/* Next sub time hint */}
        {timer.markers.length > 0 && !timer.isOvertime && (() => {
          const nextMarker = timer.markers.find((m) => timer.elapsedMs < m.timeMs);
          if (!nextMarker) return null;
          const remainingMs = nextMarker.timeMs - timer.elapsedMs;
          const remainingMin = Math.ceil(remainingMs / 60000);
          return (
            <p className="text-xs text-muted-foreground">
              Next sub in ~{remainingMin} min
            </p>
          );
        })()}
      </CardContent>
    </Card>
  );
}
