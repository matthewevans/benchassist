import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';

interface LiveBottomBarProps {
  timer: UsePeriodTimerResult;
  onAdvance: () => void;
  onRetreat: () => void;
  isFirstRotation: boolean;
  isLastRotation: boolean;
  isCrossingPeriod: boolean;
  swapPlayerName: string | null;
  onCancelSwap: () => void;
}

export function LiveBottomBar({
  timer,
  onAdvance,
  onRetreat,
  isFirstRotation,
  isLastRotation,
  isCrossingPeriod,
  swapPlayerName,
  onCancelSwap,
}: LiveBottomBarProps) {
  const nextMarker = timer.markers.find((m) => timer.elapsedMs < m.timeMs);
  const nextSubMin = nextMarker ? Math.ceil((nextMarker.timeMs - timer.elapsedMs) / 60000) : null;

  const advanceLabel = isLastRotation ? 'End Game' : isCrossingPeriod ? 'Next Period' : 'Next';

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50',
        'bottom-[calc(49px+env(safe-area-inset-bottom))] lg:bottom-0',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-t border-border/50',
        'lg:pb-[env(safe-area-inset-bottom)]',
        'animate-in slide-in-from-bottom duration-300',
      )}
    >
      {/* Progress strip along top edge */}
      <div className="relative h-1 bg-secondary">
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-all duration-1000',
            timer.isOvertime ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${timer.progress * 100}%` }}
        />
        {timer.markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
            style={{ left: `${marker.progress * 100}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        {/* Left: Timer + controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span
            className={cn(
              'font-mono font-bold tabular-nums text-base sm:text-lg',
              timer.isOvertime && 'text-destructive',
            )}
          >
            {timer.formattedElapsed}
          </span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            / {timer.formattedDuration}
          </span>
          {timer.isRunning ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={timer.pause}
              aria-label="Pause timer"
            >
              <PauseIcon className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={timer.play}
              aria-label="Start timer"
            >
              <PlayIcon className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={timer.reset}
            aria-label="Reset timer"
          >
            <RotateCcwIcon className="size-4" />
          </Button>
        </div>

        {/* Center: swap mode indicator OR next sub hint */}
        <div className="flex-1 min-w-0 text-center text-sm">
          {swapPlayerName ? (
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium text-primary truncate">Swapping {swapPlayerName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs shrink-0"
                onClick={onCancelSwap}
                aria-label="Cancel swap"
              >
                <XIcon className="size-3 mr-1" />
                Cancel
              </Button>
            </div>
          ) : nextSubMin != null && !timer.isOvertime ? (
            <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">
              Next sub ~{nextSubMin} min
            </span>
          ) : null}
        </div>

        {/* Right: Navigation buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="lg"
            className="px-3"
            onClick={onRetreat}
            disabled={isFirstRotation}
            aria-label="Previous rotation"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          {isLastRotation ? (
            <Button
              variant="destructive"
              size="lg"
              className="px-4 sm:px-6"
              onClick={onAdvance}
              aria-label="End Game"
            >
              End Game
            </Button>
          ) : (
            <Button
              size="lg"
              className="px-3 sm:px-6"
              onClick={onAdvance}
              aria-label={advanceLabel}
            >
              <span className="hidden sm:inline">{advanceLabel}</span>
              <ChevronRightIcon className="size-4 sm:ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
