import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { generateId } from '@/utils/id.ts';
import { GAME_CONFIG_TEMPLATES } from '@/types/domain.ts';
import type { GameConfig, GameConfigTemplate } from '@/types/domain.ts';

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
  const [rotationsPerPeriod, setRotationsPerPeriod] = useState(initialConfig?.rotationsPerPeriod ?? 2);
  const [noConsecutiveBench, setNoConsecutiveBench] = useState(initialConfig?.noConsecutiveBench ?? true);
  const [maxConsecutiveBench, setMaxConsecutiveBench] = useState(initialConfig?.maxConsecutiveBench ?? 1);
  const [enforceMinPlayTime, setEnforceMinPlayTime] = useState(initialConfig?.enforceMinPlayTime ?? true);
  const [minPlayPercentage, setMinPlayPercentage] = useState(initialConfig?.minPlayPercentage ?? 50);
  const [goaliePlayFullPeriod, setGoaliePlayFullPeriod] = useState(initialConfig?.goaliePlayFullPeriod ?? true);
  const [goalieRestAfterPeriod, setGoalieRestAfterPeriod] = useState(initialConfig?.goalieRestAfterPeriod ?? true);
  const [balancePriority, setBalancePriority] = useState<GameConfig['balancePriority']>(initialConfig?.balancePriority ?? 'balanced');

  function applyTemplate(template: GameConfigTemplate) {
    setName(template.name);
    setFieldSize(template.fieldSize);
    setPeriods(template.periods);
    setPeriodDuration(template.periodDurationMinutes);
    setRotationsPerPeriod(template.rotationsPerPeriod);
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
      usePositions: false,
      formation: [],
      noConsecutiveBench,
      maxConsecutiveBench,
      enforceMinPlayTime,
      minPlayPercentage,
      goaliePlayFullPeriod,
      goalieRestAfterPeriod,
      balancePriority,
      createdAt: initialConfig?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    onSave(config);
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Quick templates */}
      {!initialConfig && (
        <div className="space-y-2">
          <Label>Start from template</Label>
          <div className="flex flex-wrap gap-2">
            {GAME_CONFIG_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Separator />

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

      <Separator />

      <h3 className="font-medium text-sm">Rules</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">No consecutive benching</Label>
            <p className="text-xs text-muted-foreground">Prevent back-to-back bench rotations</p>
          </div>
          <input
            type="checkbox"
            checked={noConsecutiveBench}
            onChange={(e) => setNoConsecutiveBench(e.target.checked)}
            className="h-4 w-4"
          />
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
          <input
            type="checkbox"
            checked={enforceMinPlayTime}
            onChange={(e) => setEnforceMinPlayTime(e.target.checked)}
            className="h-4 w-4"
          />
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
            <Label className="text-sm">Goalie plays full period</Label>
            <p className="text-xs text-muted-foreground">No mid-period goalie swaps</p>
          </div>
          <input
            type="checkbox"
            checked={goaliePlayFullPeriod}
            onChange={(e) => setGoaliePlayFullPeriod(e.target.checked)}
            className="h-4 w-4"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Goalie rests after period</Label>
            <p className="text-xs text-muted-foreground">Goalie must bench first rotation of next period</p>
          </div>
          <input
            type="checkbox"
            checked={goalieRestAfterPeriod}
            onChange={(e) => setGoalieRestAfterPeriod(e.target.checked)}
            className="h-4 w-4"
          />
        </div>

        <div className="space-y-2">
          <Label>Balance Priority</Label>
          <Select value={balancePriority} onValueChange={(v) => setBalancePriority(v as GameConfig['balancePriority'])}>
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

      <Separator />

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1" disabled={!name.trim()}>
          {initialConfig ? 'Save Changes' : 'Create Configuration'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
