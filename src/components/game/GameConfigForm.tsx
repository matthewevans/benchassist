import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { generateId } from '@/utils/id.ts';
import { POSITION_LABELS } from '@/types/domain.ts';
import type { GameConfig, FormationSlot, Position } from '@/types/domain.ts';
import { deriveSubPositions } from '@/utils/positions.ts';

interface GameConfigFormProps {
  teamId: string;
  initialConfig?: GameConfig;
  onSave: (config: GameConfig) => void;
  onCancel: () => void;
}

export function GameConfigForm({ teamId, initialConfig, onSave, onCancel }: GameConfigFormProps) {
  const [name, setName] = useState(initialConfig?.name ?? '');
  const [fieldSize, setFieldSize] = useState(initialConfig?.fieldSize ?? 7);
  const [periods, setPeriods] = useState(initialConfig?.periods ?? 2);
  const [periodDuration, setPeriodDuration] = useState(initialConfig?.periodDurationMinutes ?? 30);
  const [rotationsPerPeriod, setRotationsPerPeriod] = useState(
    initialConfig?.rotationsPerPeriod ?? 2,
  );
  const [noConsecutiveBench, setNoConsecutiveBench] = useState(
    initialConfig?.noConsecutiveBench ?? true,
  );
  const [maxConsecutiveBench, setMaxConsecutiveBench] = useState(
    initialConfig?.maxConsecutiveBench ?? 1,
  );
  const [enforceMinPlayTime, setEnforceMinPlayTime] = useState(
    initialConfig?.enforceMinPlayTime ?? true,
  );
  const [minPlayPercentage, setMinPlayPercentage] = useState(
    initialConfig?.minPlayPercentage ?? 50,
  );
  const [useGoalie, setUseGoalie] = useState(initialConfig?.useGoalie ?? true);
  const [goaliePlayFullPeriod, setGoaliePlayFullPeriod] = useState(
    initialConfig?.goaliePlayFullPeriod ?? true,
  );
  const [goalieRestAfterPeriod, setGoalieRestAfterPeriod] = useState(
    initialConfig?.goalieRestAfterPeriod ?? true,
  );
  const [balancePriority, setBalancePriority] = useState<GameConfig['balancePriority']>(
    initialConfig?.balancePriority ?? 'balanced',
  );
  const [usePositions, setUsePositions] = useState(initialConfig?.usePositions ?? false);
  const [formation, setFormation] = useState<FormationSlot[]>(initialConfig?.formation ?? []);

  const [rulesOpen, setRulesOpen] = useState(!!initialConfig);

  const fieldPlayerSlots = fieldSize - (useGoalie ? 1 : 0);
  const formationTotal = formation.reduce((sum, s) => sum + s.count, 0);
  const derivedPositions = usePositions ? deriveSubPositions(formation) : [];

  function updateFormationSlot(position: Position, count: number) {
    setFormation((prev) => {
      const filtered = prev.filter((s) => s.position !== position);
      return count > 0 ? [...filtered, { position, count }] : filtered;
    });
  }

  function handleSave() {
    if (!name.trim()) return;

    const config: GameConfig = {
      id: initialConfig?.id ?? generateId(),
      teamId,
      name: name.trim(),
      fieldSize,
      periods,
      periodDurationMinutes: periodDuration,
      rotationsPerPeriod,
      usePositions,
      formation: usePositions ? formation : [],
      useGoalie,
      noConsecutiveBench,
      maxConsecutiveBench,
      enforceMinPlayTime,
      minPlayPercentage,
      goaliePlayFullPeriod: useGoalie ? goaliePlayFullPeriod : false,
      goalieRestAfterPeriod: useGoalie ? goalieRestAfterPeriod : false,
      balancePriority,
      createdAt: initialConfig?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    onSave(config);
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="config-name">Configuration Name</Label>
        <Input
          id="config-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Regular Season 7v7"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="field-size">Field Size</Label>
          <Input
            id="field-size"
            type="number"
            min={3}
            max={15}
            value={fieldSize}
            onChange={(e) => setFieldSize(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="periods">Periods</Label>
          <Input
            id="periods"
            type="number"
            min={1}
            max={6}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-duration">Period Duration (min)</Label>
          <Input
            id="period-duration"
            type="number"
            min={5}
            max={90}
            value={periodDuration}
            onChange={(e) => setPeriodDuration(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rotations-per-period">Rotations / Period</Label>
          <Input
            id="rotations-per-period"
            type="number"
            min={1}
            max={6}
            value={rotationsPerPeriod}
            onChange={(e) => setRotationsPerPeriod(Number(e.target.value))}
          />
        </div>
      </div>

      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center justify-between w-full px-0 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Rules & Balance
            <ChevronDownIcon
              className={cn('h-4 w-4 transition-transform', rulesOpen && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">No consecutive benching</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent back-to-back bench rotations
                </p>
              </div>
              <Switch checked={noConsecutiveBench} onCheckedChange={setNoConsecutiveBench} />
            </div>
            {noConsecutiveBench && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="max-consecutive">Max consecutive bench rotations</Label>
                <Input
                  id="max-consecutive"
                  type="number"
                  min={1}
                  max={5}
                  value={maxConsecutiveBench}
                  onChange={(e) => setMaxConsecutiveBench(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Minimum play time</Label>
                <p className="text-xs text-muted-foreground">Every player plays at least this %</p>
              </div>
              <Switch checked={enforceMinPlayTime} onCheckedChange={setEnforceMinPlayTime} />
            </div>
            {enforceMinPlayTime && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="min-play">Minimum play percentage</Label>
                <Input
                  id="min-play"
                  type="number"
                  min={10}
                  max={100}
                  value={minPlayPercentage}
                  onChange={(e) => setMinPlayPercentage(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Uses goalkeeper</Label>
                <p className="text-xs text-muted-foreground">
                  Format includes a dedicated goalkeeper
                </p>
              </div>
              <Switch checked={useGoalie} onCheckedChange={setUseGoalie} />
            </div>

            {useGoalie && (
              <>
                <div className="flex items-center justify-between pl-4">
                  <div>
                    <Label className="text-sm">Goalie plays full period</Label>
                    <p className="text-xs text-muted-foreground">No mid-period goalie swaps</p>
                  </div>
                  <Switch
                    checked={goaliePlayFullPeriod}
                    onCheckedChange={setGoaliePlayFullPeriod}
                  />
                </div>

                <div className="flex items-center justify-between pl-4">
                  <div>
                    <Label className="text-sm">Goalie rests after period</Label>
                    <p className="text-xs text-muted-foreground">
                      Goalie must bench first rotation of next period
                    </p>
                  </div>
                  <Switch
                    checked={goalieRestAfterPeriod}
                    onCheckedChange={setGoalieRestAfterPeriod}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Use positions</Label>
                <p className="text-xs text-muted-foreground">
                  Assign field positions (DEF, MID, FWD)
                </p>
              </div>
              <Switch checked={usePositions} onCheckedChange={setUsePositions} />
            </div>

            {usePositions && (
              <div className="pl-4 space-y-3">
                {(['DEF', 'MID', 'FWD'] as const).map((pos) => {
                  const count = formation.find((s) => s.position === pos)?.count ?? 0;
                  return (
                    <div key={pos} className="flex items-center justify-between">
                      <Label className="text-sm">{POSITION_LABELS[pos]}s</Label>
                      <Input
                        type="number"
                        min={0}
                        max={fieldPlayerSlots}
                        value={count}
                        onChange={(e) => updateFormationSlot(pos, Number(e.target.value))}
                        className="w-20"
                      />
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Total: {formationTotal} / {fieldPlayerSlots} field players
                    {formationTotal !== fieldPlayerSlots && (
                      <span className="text-destructive ml-1">
                        ({formationTotal < fieldPlayerSlots ? 'need more' : 'too many'})
                      </span>
                    )}
                  </span>
                </div>
                {derivedPositions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {derivedPositions.map((pos, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {pos}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Balance Priority</Label>
              <Select
                value={balancePriority}
                onValueChange={(v) => setBalancePriority(v as GameConfig['balancePriority'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict (bench weaker players more)</SelectItem>
                  <SelectItem value="balanced">Balanced (moderate skill weighting)</SelectItem>
                  <SelectItem value="off">Off (equal play time for all)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          className="flex-1"
          disabled={!name.trim() || (usePositions && formationTotal !== fieldPlayerSlots)}
        >
          {initialConfig ? 'Save Changes' : 'Create Configuration'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
