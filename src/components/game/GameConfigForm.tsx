import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { GameConfig, FormationSlot, Position } from '@/types/domain.ts';
import { deriveSubPositions } from '@/utils/positions.ts';

interface GameConfigFormProps {
  teamId: string;
  initialConfig?: GameConfig;
  onSave: (config: GameConfig) => void;
}

export function GameConfigForm({ teamId, initialConfig, onSave }: GameConfigFormProps) {
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');
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

  const formationDiff = formationTotal - fieldPlayerSlots;
  const positionFooter = usePositions
    ? t('config_form.formation_total', { current: formationTotal, max: fieldPlayerSlots }) +
      (formationDiff !== 0
        ? formationDiff < 0
          ? t('config_form.formation_need_more', { count: -formationDiff })
          : t('config_form.formation_too_many', { count: formationDiff })
        : '')
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
              placeholder={t('config_form.name_placeholder')}
              className="w-44 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
            />
          }
        >
          <span className="text-ios-body">{t('config_form.name_label')}</span>
        </GroupedListRow>
      </GroupedList>

      {/* Section 2: Format */}
      <GroupedList header={t('config_form.format')}>
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
          <span className="text-ios-body">{t('config_form.field_size')}</span>
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
          <span className="text-ios-body">{t('config_form.periods')}</span>
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
              <span className="text-ios-body text-muted-foreground">
                {t('config_form.period_duration_unit')}
              </span>
            </div>
          }
        >
          <span className="text-ios-body">{t('config_form.period_duration')}</span>
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
          <span className="text-ios-body">{t('config_form.rotations_per_period')}</span>
        </GroupedListRow>
      </GroupedList>

      {/* Section 3: Rules */}
      <GroupedList header={t('config_form.rules')}>
        <GroupedListRow
          trailing={<Switch checked={noConsecutiveBench} onCheckedChange={setNoConsecutiveBench} />}
        >
          <div>
            <div className="text-ios-body">{t('config_form.no_consecutive_bench')}</div>
            <div className="text-ios-caption1 text-muted-foreground">
              {t('config_form.no_consecutive_bench_desc')}
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
            <span className="text-ios-body">{t('config_form.max_consecutive')}</span>
          </GroupedListRow>
        )}
        <GroupedListRow
          trailing={<Switch checked={enforceMinPlayTime} onCheckedChange={setEnforceMinPlayTime} />}
        >
          <div>
            <div className="text-ios-body">{t('config_form.min_play_time')}</div>
            <div className="text-ios-caption1 text-muted-foreground">
              {t('config_form.min_play_time_desc')}
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
            <span className="text-ios-body">{t('config_form.min_play_pct')}</span>
          </GroupedListRow>
        )}
      </GroupedList>

      {/* Section 4: Goalkeeper */}
      <GroupedList header={t('config_form.goalkeeper')}>
        <GroupedListRow
          last={!useGoalie}
          trailing={<Switch checked={useGoalie} onCheckedChange={setUseGoalie} />}
        >
          <div>
            <div className="text-ios-body">{t('config_form.uses_goalkeeper')}</div>
            <div className="text-ios-caption1 text-muted-foreground">
              {t('config_form.uses_goalkeeper_desc')}
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
                <div className="text-ios-body">{t('config_form.full_period_only')}</div>
                <div className="text-ios-caption1 text-muted-foreground">
                  {t('config_form.full_period_only_desc')}
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
                <div className="text-ios-body">{t('config_form.rest_after_period')}</div>
                <div className="text-ios-caption1 text-muted-foreground">
                  {t('config_form.rest_after_period_desc')}
                </div>
              </div>
            </GroupedListRow>
          </>
        )}
      </GroupedList>

      {/* Section 5: Positions */}
      <GroupedList header={t('config_form.positions')} footer={positionFooter}>
        <GroupedListRow
          last={!usePositions}
          trailing={<Switch checked={usePositions} onCheckedChange={setUsePositions} />}
        >
          <div>
            <div className="text-ios-body">{t('config_form.use_positions')}</div>
            <div className="text-ios-caption1 text-muted-foreground">
              {t('config_form.use_positions_desc')}
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
                <span className="text-ios-body">{tCommon(`position_plural.${pos}`)}</span>
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
      <GroupedList header={t('config_form.balance')}>
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
                <SelectItem value="strict">{t('config_form.balance_strict')}</SelectItem>
                <SelectItem value="balanced">{t('config_form.balance_balanced')}</SelectItem>
                <SelectItem value="off">{t('config_form.balance_off')}</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <span className="text-ios-body">{t('config_form.balance_priority')}</span>
        </GroupedListRow>
      </GroupedList>

      {/* Save button */}
      <Button
        size="lg"
        onClick={handleSave}
        disabled={!name.trim() || (usePositions && formationTotal !== fieldPlayerSlots)}
      >
        {initialConfig ? t('config_form.save') : t('config_form.create')}
      </Button>
    </div>
  );
}
