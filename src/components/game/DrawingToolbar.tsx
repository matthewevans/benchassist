import { MoveRightIcon, PenLineIcon, Trash2Icon, Undo2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { DrawingTool } from '@/hooks/useFieldDrawing.ts';

interface Props {
  activeTool: DrawingTool;
  canUndo: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onClear: () => void;
  onDone: () => void;
}

export function DrawingToolbar({
  activeTool,
  canUndo,
  onToolChange,
  onUndo,
  onClear,
  onDone,
}: Props) {
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
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 max-w-5xl mx-auto">
        {/* Tool toggle */}
        <div className="flex items-center rounded-lg bg-secondary/80 p-0.5">
          <button
            type="button"
            className={cn(
              'flex items-center justify-center size-10 rounded-md transition-colors',
              activeTool === 'pen'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground',
            )}
            onClick={() => onToolChange('pen')}
            aria-label="Pen tool"
            aria-pressed={activeTool === 'pen'}
          >
            <PenLineIcon className="size-[18px]" />
          </button>
          <button
            type="button"
            className={cn(
              'flex items-center justify-center size-10 rounded-md transition-colors',
              activeTool === 'arrow'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground',
            )}
            onClick={() => onToolChange('arrow')}
            aria-label="Arrow tool"
            aria-pressed={activeTool === 'arrow'}
          >
            <MoveRightIcon className="size-[18px]" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <Button
          variant="plain"
          size="icon"
          className="size-11"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo2Icon className="size-[18px]" />
        </Button>
        <Button
          variant="plain"
          size="icon"
          className="size-11"
          onClick={onClear}
          disabled={!canUndo}
          aria-label="Clear drawing"
        >
          <Trash2Icon className="size-[18px]" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          onClick={onDone}
          aria-label="Exit draw mode"
        >
          <XIcon className="size-[18px]" />
        </Button>
      </div>
    </div>
  );
}
