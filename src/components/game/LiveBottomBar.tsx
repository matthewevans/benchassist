import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
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
      <div className="relative h-0.5 bg-secondary/80">
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
            className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-foreground/30"
            style={{ left: `${marker.progress * 100}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 max-w-5xl mx-auto">
        {/* Left: Timer + controls */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'font-mono font-bold tabular-nums text-ios-callout',
              timer.isOvertime && 'text-destructive',
            )}
          >
            {timer.formattedElapsed}
          </span>
          <span className="text-ios-caption2 text-muted-foreground hidden sm:inline ml-0.5">
            / {timer.formattedDuration}
          </span>
          {timer.isRunning ? (
            <Button
              variant="plain"
              size="icon"
              className="size-11"
              onClick={timer.pause}
              aria-label="Pause timer"
            >
              <PauseIcon className="size-[18px]" />
            </Button>
          ) : (
            <Button
              variant="plain"
              size="icon"
              className="size-11"
              onClick={timer.play}
              aria-label="Start timer"
            >
              <PlayIcon className="size-[18px]" />
            </Button>
          )}
          <Button
            variant="plain"
            size="icon"
            className="size-11"
            onClick={timer.reset}
            aria-label="Reset timer"
          >
            <RotateCcwIcon className="size-4" />
          </Button>
        </div>

        {/* Center: swap mode indicator OR next sub hint */}
        <div className="flex-1 min-w-0 text-center">
          {swapPlayerName ? (
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium text-primary truncate text-ios-subheadline">
                Swapping {swapPlayerName}
              </span>
              <Button
                variant="secondary"
                size="capsule"
                className="shrink-0"
                onClick={onCancelSwap}
                aria-label="Cancel swap"
              >
                <XIcon className="size-3 mr-1" />
                Cancel
              </Button>
            </div>
          ) : nextSubMin != null && !timer.isOvertime ? (
            <span className="text-muted-foreground whitespace-nowrap text-ios-caption1">
              Sub ~{nextSubMin}m
            </span>
          ) : null}
        </div>

        {/* Right: Navigation buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-full"
            onClick={onRetreat}
            disabled={isFirstRotation}
            aria-label="Previous rotation"
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
          {isLastRotation ? (
            <Button
              variant="destructive"
              className="h-11 px-5 text-ios-subheadline font-semibold rounded-full"
              onClick={onAdvance}
              aria-label="End Game"
            >
              End Game
            </Button>
          ) : (
            <Button
              className="h-11 px-5 text-ios-subheadline font-semibold rounded-full"
              onClick={onAdvance}
              aria-label={isCrossingPeriod ? 'Next period' : 'Next'}
            >
              Next
              {isCrossingPeriod ? (
                <ChevronsRightIcon className="size-4 ml-0.5" />
              ) : (
                <ChevronRightIcon className="size-4 ml-0.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
