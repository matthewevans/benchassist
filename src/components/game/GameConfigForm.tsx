import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { generateId } from '@/utils/id.ts';
import { POSITION_LABELS } from '@/types/domain.ts';
import type { GameConfig, FormationSlot, Position } from '@/types/domain.ts';
import { deriveSubPositions } from '@/utils/positions.ts';

interface GameConfigFormProps {
  teamId: string;
  initialConfig?: GameConfig;
  onSave: (config: GameConfig) => void;
}

export function GameConfigForm({ teamId, initialConfig, onSave }: GameConfigFormProps) {
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

  const positionFooter = usePositions
    ? `Total: ${formationTotal} / ${fieldPlayerSlots} field players${formationTotal !== fieldPlayerSlots ? (formationTotal < fieldPlayerSlots ? ' — need more' : ' — too many') : ''}`
    : undefined;

  return (
    <div className="space-y-5 pt-2">
      {/* Section 1: Name */}
      <GroupedList>
        <GroupedListRow
          last
          trailing={
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regular Season 7v7"
              className="w-44 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
            />
          }
        >
          <span className="text-ios-body">Configuration Name</span>
        </GroupedListRow>
      </GroupedList>

      {/* Section 2: Format */}
      <GroupedList header="Format">
        <GroupedListRow
          trailing={
            <Input
              type="number"
              min={3}
              max={15}
              value={fieldSize}
              onChange={(e) => setFieldSize(Number(e.target.value))}
              className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
            />
          }
        >
          <span className="text-ios-body">Field Size</span>
        </GroupedListRow>
        <GroupedListRow
          trailing={
            <Input
              type="number"
              min={1}
              max={6}
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
            />
          }
        >
          <span className="text-ios-body">Periods</span>
        </GroupedListRow>
        <GroupedListRow
          trailing={
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={5}
                max={90}
                value={periodDuration}
                onChange={(e) => setPeriodDuration(Number(e.target.value))}
                className="w-16 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
              />
              <span className="text-ios-body text-muted-foreground">min</span>
            </div>
          }
        >
          <span className="text-ios-body">Period Duration</span>
        </GroupedListRow>
        <GroupedListRow
          last
          trailing={
            <Input
              type="number"
              min={1}
              max={6}
              value={rotationsPerPeriod}
              onChange={(e) => setRotationsPerPeriod(Number(e.target.value))}
              className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
            />
          }
        >
          <span className="text-ios-body">Rotations / Period</span>
        </GroupedListRow>
      </GroupedList>

      {/* Section 3: Rules */}
      <GroupedList header="Rules">
        <GroupedListRow
          trailing={<Switch checked={noConsecutiveBench} onCheckedChange={setNoConsecutiveBench} />}
        >
          <div>
            <div className="text-ios-body">No consecutive bench</div>
            <div className="text-ios-caption1 text-muted-foreground">
              Prevent back-to-back bench rotations
            </div>
          </div>
        </GroupedListRow>
        {noConsecutiveBench && (
          <GroupedListRow
            trailing={
              <Input
                type="number"
                min={1}
                max={5}
                value={maxConsecutiveBench}
                onChange={(e) => setMaxConsecutiveBench(Number(e.target.value))}
                className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
              />
            }
          >
            <span className="text-ios-body">Max consecutive</span>
          </GroupedListRow>
        )}
        <GroupedListRow
          trailing={<Switch checked={enforceMinPlayTime} onCheckedChange={setEnforceMinPlayTime} />}
        >
          <div>
            <div className="text-ios-body">Minimum play time</div>
            <div className="text-ios-caption1 text-muted-foreground">
              Every player plays at least this %
            </div>
          </div>
        </GroupedListRow>
        {enforceMinPlayTime && (
          <GroupedListRow
            last={!useGoalie && !usePositions}
            trailing={
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={minPlayPercentage}
                  onChange={(e) => setMinPlayPercentage(Number(e.target.value))}
                  className="w-16 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
                />
                <span className="text-ios-body text-muted-foreground">%</span>
              </div>
            }
          >
            <span className="text-ios-body">Min play %</span>
          </GroupedListRow>
        )}
      </GroupedList>

      {/* Section 4: Goalkeeper */}
      <GroupedList header="Goalkeeper">
        <GroupedListRow
          last={!useGoalie}
          trailing={<Switch checked={useGoalie} onCheckedChange={setUseGoalie} />}
        >
          <div>
            <div className="text-ios-body">Uses goalkeeper</div>
            <div className="text-ios-caption1 text-muted-foreground">
              Format includes a dedicated GK
            </div>
          </div>
        </GroupedListRow>
        {useGoalie && (
          <>
            <GroupedListRow
              trailing={
                <Switch checked={goaliePlayFullPeriod} onCheckedChange={setGoaliePlayFullPeriod} />
              }
            >
              <div>
                <div className="text-ios-body">Full period only</div>
                <div className="text-ios-caption1 text-muted-foreground">
                  No mid-period goalie swaps
                </div>
              </div>
            </GroupedListRow>
            <GroupedListRow
              last
              trailing={
                <Switch
                  checked={goalieRestAfterPeriod}
                  onCheckedChange={setGoalieRestAfterPeriod}
                />
              }
            >
              <div>
                <div className="text-ios-body">Rest after period</div>
                <div className="text-ios-caption1 text-muted-foreground">
                  Goalie benches first rotation next period
                </div>
              </div>
            </GroupedListRow>
          </>
        )}
      </GroupedList>

      {/* Section 5: Positions */}
      <GroupedList header="Positions" footer={positionFooter}>
        <GroupedListRow
          last={!usePositions}
          trailing={<Switch checked={usePositions} onCheckedChange={setUsePositions} />}
        >
          <div>
            <div className="text-ios-body">Use positions</div>
            <div className="text-ios-caption1 text-muted-foreground">
              Assign field positions (DEF, MID, FWD)
            </div>
          </div>
        </GroupedListRow>
        {usePositions &&
          (['DEF', 'MID', 'FWD'] as const).map((pos, i) => {
            const count = formation.find((s) => s.position === pos)?.count ?? 0;
            const isLast = i === 2;
            return (
              <GroupedListRow
                key={pos}
                last={isLast}
                trailing={
                  <Input
                    type="number"
                    min={0}
                    max={fieldPlayerSlots}
                    value={count}
                    onChange={(e) => updateFormationSlot(pos, Number(e.target.value))}
                    className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
                  />
                }
              >
                <span className="text-ios-body">{POSITION_LABELS[pos]}s</span>
              </GroupedListRow>
            );
          })}
      </GroupedList>
      {usePositions && derivedPositions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4">
          {derivedPositions.map((pos, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {pos}
            </Badge>
          ))}
        </div>
      )}

      {/* Section 6: Balance */}
      <GroupedList header="Balance">
        <GroupedListRow
          last
          trailing={
            <Select
              value={balancePriority}
              onValueChange={(v) => setBalancePriority(v as GameConfig['balancePriority'])}
            >
              <SelectTrigger className="w-32 min-h-11 border-none shadow-none bg-transparent px-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <span className="text-ios-body">Priority</span>
        </GroupedListRow>
      </GroupedList>

      {/* Save button */}
      <Button
        size="lg"
        onClick={handleSave}
        disabled={!name.trim() || (usePositions && formationTotal !== fieldPlayerSlots)}
      >
        {initialConfig ? 'Save Changes' : 'Create Configuration'}
      </Button>
    </div>
  );
}
