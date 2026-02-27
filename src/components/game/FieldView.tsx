import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownIcon,
  ArrowRightLeftIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import { cn } from '@/lib/utils.ts';
import type { PlayerId, Player, Rotation } from '@/types/domain.ts';
import type { RotationTransitionKind } from '@/utils/rotationTransitions.ts';
import { getPeriodRange } from '@/utils/rotationLayout.ts';
import {
  buildNextPreview,
  buildPlacements,
  getCurrentMarkerScale,
  getFirstName,
  getLeftRoundedSegmentPath,
  getMarkerLabel,
  getMarkerWidth,
  getNextMarkerScale,
  GROUP_TINT_FILL,
  stackOverlappingPlacements,
} from './fieldViewHelpers.ts';
import type { PlacedPlayer } from './fieldViewHelpers.ts';

// ---------------------------------------------------------------------------
// Rendering constants
// ---------------------------------------------------------------------------

const TRANSITION_TONE: Record<
  RotationTransitionKind,
  { segmentColor: string; icon: string } | null
> = {
  in: { segmentColor: '#22c55e', icon: '↑' },
  out: null,
  position: { segmentColor: '#06b6d4', icon: '↔' },
  role: { segmentColor: '#8b5cf6', icon: '↔' },
};

const OUTGOING_TONE = { segmentColor: '#f97316', icon: '↓' } as const;

// ---------------------------------------------------------------------------
// SVG marker components
// ---------------------------------------------------------------------------

function PlayerMarker({
  placement,
  transitionKind,
  showPosition = false,
  displayName,
  markerScale = 1,
}: {
  placement: PlacedPlayer;
  transitionKind?: RotationTransitionKind;
  showPosition?: boolean;
  displayName?: string;
  markerScale?: number;
}) {
  const tintFill = GROUP_TINT_FILL[placement.group] ?? GROUP_TINT_FILL.MID;
  const label = displayName ?? getMarkerLabel(placement, showPosition);
  const width = getMarkerWidth(label, markerScale);
  const height = 34 * markerScale;
  const x = -width / 2;
  const y = -height / 2;
  const tone = transitionKind ? TRANSITION_TONE[transitionKind] : null;
  const centerX = placement.x;
  const centerY = placement.y;
  const segmentWidth = tone
    ? Math.max(22 * markerScale, Math.min(34 * markerScale, width * 0.28))
    : 0;
  const segmentInset = 1 * markerScale;
  const segmentX = centerX + x + segmentInset;
  const segmentY = centerY + y + segmentInset;
  const segmentHeight = height - segmentInset * 2;
  const labelX = centerX + (tone ? segmentWidth / 2 : 0);

  return (
    <>
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill="rgba(11, 18, 32, 0.52)"
      />
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill={tintFill}
      />
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill="none"
        stroke="rgba(255,255,255,0.82)"
        strokeWidth={2.25 * markerScale}
      />

      {tone && (
        <>
          <path
            d={getLeftRoundedSegmentPath(
              segmentX,
              segmentY,
              segmentWidth,
              segmentHeight,
              9 * markerScale,
            )}
            fill={tone.segmentColor}
            opacity={0.94}
          />
          <text
            x={segmentX + segmentWidth / 2}
            y={centerY + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={12 * markerScale}
            fontWeight={800}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {tone.icon}
          </text>
        </>
      )}

      <text
        x={labelX}
        y={centerY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12.5 * markerScale}
        fontWeight={650}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {label}
      </text>
    </>
  );
}

function OutgoingMarker({
  placement,
  showPosition = false,
  displayName,
  markerScale = 1,
}: {
  placement: PlacedPlayer;
  showPosition?: boolean;
  displayName?: string;
  markerScale?: number;
}) {
  const label = displayName ?? getMarkerLabel(placement, showPosition);
  const width = getMarkerWidth(label, markerScale);
  const height = 34 * markerScale;
  const x = -width / 2;
  const y = -height / 2;
  const centerX = placement.x;
  const centerY = placement.y;
  const tone = OUTGOING_TONE;
  const segmentWidth = Math.max(22 * markerScale, Math.min(34 * markerScale, width * 0.28));
  const segmentInset = 1 * markerScale;
  const segmentX = centerX + x + segmentInset;
  const segmentY = centerY + y + segmentInset;
  const segmentHeight = height - segmentInset * 2;
  const labelX = centerX + segmentWidth / 2;

  return (
    <>
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill="rgba(11, 18, 32, 0.48)"
      />
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill="rgba(249, 115, 22, 0.16)"
      />
      <rect
        x={centerX + x}
        y={centerY + y}
        width={width}
        height={height}
        rx={11 * markerScale}
        fill="none"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth={2 * markerScale}
      />
      <path
        d={getLeftRoundedSegmentPath(
          segmentX,
          segmentY,
          segmentWidth,
          segmentHeight,
          9 * markerScale,
        )}
        fill={tone.segmentColor}
        opacity={0.92}
      />
      <text
        x={segmentX + segmentWidth / 2}
        y={centerY + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12 * markerScale}
        fontWeight={800}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {tone.icon}
      </text>
      <text
        x={labelX}
        y={centerY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fed7aa"
        fontSize={12.5 * markerScale}
        fontWeight={650}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {label}
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// Half-field SVG wrapper
// ---------------------------------------------------------------------------

function HalfFieldSvg({ children }: { children?: ReactNode }) {
  const id = useId();
  const clipId = `fv-clip${id}`;
  const shadowId = `fv-shadow${id}`;

  return (
    <svg
      viewBox="-30 -20 740 575"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={680} height={525} />
        </clipPath>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={1} stdDeviation={2} floodOpacity={0.25} />
        </filter>
      </defs>

      <rect x={-30} y={-20} width={740} height={575} fill="#3a7a33" />
      <rect width={680} height={525} fill="#4a9e42" />

      <g clipPath={`url(#${clipId})`} fill="#fff" opacity={0.06}>
        <rect y={0} width={680} height={75} />
        <rect y={150} width={680} height={75} />
        <rect y={300} width={680} height={75} />
        <rect y={450} width={680} height={75} />
      </g>

      <g fill="none" stroke="#fff" strokeWidth={2.5}>
        <rect width={680} height={525} />
        <path d="M248.5 0 A91.5 91.5 0 0 1 431.5 0" />
        <rect x={138.4} y={360} width={403.2} height={165} />
        <rect x={248.4} y={470} width={183.2} height={55} />
        <path d="M266.87 360 A91.5 91.5 0 0 1 413.13 360" />
        <path d="M10 525 A10 10 0 0 0 0 515" />
        <path d="M670 525 A10 10 0 0 1 680 515" />
      </g>

      <rect
        x={303.4}
        y={525}
        width={73.2}
        height={20}
        rx={3}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
      />

      <circle cx={340} cy={0} r={4} fill="#fff" />
      <circle cx={340} cy={415} r={3.5} fill="#fff" />

      <g filter={`url(#${shadowId})`}>{children}</g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Transition summary UI
// ---------------------------------------------------------------------------

function SummaryChip({
  tone,
  icon,
  label,
}: {
  tone: 'incoming' | 'outgoing' | 'position' | 'role';
  icon: ReactNode;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        tone === 'incoming' &&
          'text-green-700 dark:text-green-300 bg-green-500/12 dark:bg-green-500/18',
        tone === 'outgoing' &&
          'text-orange-700 dark:text-orange-300 bg-orange-500/12 dark:bg-orange-500/18',
        tone === 'position' &&
          'text-blue-700 dark:text-blue-300 bg-blue-500/12 dark:bg-blue-500/18',
        tone === 'role' &&
          'text-violet-700 dark:text-violet-300 bg-violet-500/12 dark:bg-violet-500/18',
      )}
    >
      {icon}
      {label}
    </span>
  );
}

interface TransitionSectionProps {
  title: string;
  tone: 'incoming' | 'outgoing' | 'position' | 'role';
  icon: ReactNode;
  placements: PlacedPlayer[];
}

function TransitionSection({ title, tone, icon, placements }: TransitionSectionProps) {
  if (placements.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-ios-caption1 uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {placements.map((placement) => (
          <SummaryChip
            key={`${tone}-${placement.player.id}`}
            tone={tone}
            icon={icon}
            label={`${getFirstName(placement.player.name)} · ${placement.subPos}`}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FieldView component
// ---------------------------------------------------------------------------

interface Props {
  rotations: Rotation[];
  initialRotationIndex: number;
  playerMap: Map<PlayerId, Player>;
  usePositions: boolean;
  useGoalie: boolean;
  isLive: boolean;
  periodDivisions: number[];
}

export function FieldView({
  rotations,
  initialRotationIndex,
  playerMap,
  usePositions,
  useGoalie,
  isLive,
  periodDivisions,
}: Props) {
  const { t } = useTranslation('game');
  const maxRotationIndex = Math.max(rotations.length - 1, 0);
  const clampRotationIndex = (index: number) => Math.min(Math.max(index, 0), maxRotationIndex);
  const parentViewingIndex = clampRotationIndex(initialRotationIndex);
  const [manualView, setManualView] = useState<{ baseIndex: number; index: number } | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [markerScale, setMarkerScale] = useState(getCurrentMarkerScale);
  const markerScaleRef = useRef(markerScale);

  useEffect(() => {
    markerScaleRef.current = markerScale;
  }, [markerScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastWidth = Math.round(window.innerWidth);
    let frameId: number | null = null;
    const onResize = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const nextWidth = Math.round(window.innerWidth);
        if (nextWidth === lastWidth) return;
        lastWidth = nextWidth;
        const nextScale = getNextMarkerScale(nextWidth, markerScaleRef.current);
        if (nextScale === markerScaleRef.current) return;
        markerScaleRef.current = nextScale;
        setMarkerScale(nextScale);
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const hasManualOverride = !isLive && manualView && manualView.baseIndex === parentViewingIndex;
  const viewingIndex = hasManualOverride
    ? clampRotationIndex(manualView.index)
    : parentViewingIndex;

  const rotation = rotations[viewingIndex];
  const nextRotation = rotations[viewingIndex + 1];
  const hasNext = viewingIndex < rotations.length - 1;
  const hasPrev = viewingIndex > 0;

  if (!rotation) return null;

  const basePlacements = buildPlacements(rotation, playerMap, usePositions);
  const placements = stackOverlappingPlacements(basePlacements, markerScale);

  const preview =
    showChanges && nextRotation
      ? buildNextPreview(
          rotation,
          basePlacements,
          nextRotation,
          playerMap,
          usePositions,
          markerScale,
        )
      : null;

  const displayedRotation = preview && nextRotation ? nextRotation : rotation;
  const periodRange = getPeriodRange(periodDivisions, displayedRotation.periodIndex);
  const rotationWithinPeriod = periodRange ? displayedRotation.index - periodRange.start + 1 : 1;
  const totalInPeriod = periodRange ? periodRange.endExclusive - periodRange.start : 1;

  return (
    <div className="space-y-3">
      {!isLive && (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            className={cn(
              'flex items-center justify-center size-11 rounded-lg transition-colors',
              hasPrev ? 'active:bg-secondary/80 text-foreground' : 'text-muted-foreground/30',
            )}
            disabled={!hasPrev}
            onClick={() => {
              setManualView((prev) => {
                const current =
                  prev && prev.baseIndex === parentViewingIndex
                    ? clampRotationIndex(prev.index)
                    : parentViewingIndex;
                return {
                  baseIndex: parentViewingIndex,
                  index: clampRotationIndex(current - 1),
                };
              });
            }}
            aria-label={t('live.previous_rotation')}
          >
            <ChevronLeftIcon className="size-5" />
          </button>

          <div className="flex items-baseline gap-1.5 min-w-[170px] justify-center">
            <span className="text-ios-footnote font-medium text-muted-foreground uppercase tracking-wide">
              {t('field.period_label', { period: displayedRotation.periodIndex + 1 })}
            </span>
            <span className="text-ios-footnote text-muted-foreground/60">·</span>
            <span className="text-ios-footnote text-muted-foreground">
              {t('field.rotation_of', {
                current: rotationWithinPeriod,
                total: totalInPeriod,
              })}
            </span>
            {preview && (
              <>
                <span className="text-ios-caption1 text-muted-foreground/50">·</span>
                <span className="text-ios-caption1 text-primary">{t('field.preview_badge')}</span>
              </>
            )}
          </div>

          <button
            type="button"
            className={cn(
              'flex items-center justify-center size-11 rounded-lg transition-colors',
              hasNext ? 'active:bg-secondary/80 text-foreground' : 'text-muted-foreground/30',
            )}
            disabled={!hasNext}
            onClick={() => {
              setManualView((prev) => {
                const current =
                  prev && prev.baseIndex === parentViewingIndex
                    ? clampRotationIndex(prev.index)
                    : parentViewingIndex;
                return {
                  baseIndex: parentViewingIndex,
                  index: clampRotationIndex(current + 1),
                };
              });
            }}
            aria-label={t('live.next_rotation')}
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.12)] dark:shadow-none">
        <HalfFieldSvg>
          {preview ? (
            <>
              {preview.outgoingPlacements.map((placement) => (
                <OutgoingMarker
                  key={`out-${placement.player.id}`}
                  placement={placement}
                  showPosition={false}
                  displayName={preview.markerNameByPlayerId.get(placement.player.id as PlayerId)}
                  markerScale={markerScale}
                />
              ))}

              {preview.placements
                .filter(
                  (placement) =>
                    !preview.transitionKindByPlayerId.has(placement.player.id as PlayerId),
                )
                .map((placement) => (
                  <PlayerMarker
                    key={placement.player.id}
                    placement={placement}
                    showPosition={false}
                    displayName={preview.markerNameByPlayerId.get(placement.player.id as PlayerId)}
                    markerScale={markerScale}
                  />
                ))}

              {preview.placements
                .filter((placement) =>
                  preview.transitionKindByPlayerId.has(placement.player.id as PlayerId),
                )
                .map((placement) => (
                  <PlayerMarker
                    key={placement.player.id}
                    placement={placement}
                    transitionKind={preview.transitionKindByPlayerId.get(
                      placement.player.id as PlayerId,
                    )}
                    showPosition={false}
                    displayName={preview.markerNameByPlayerId.get(placement.player.id as PlayerId)}
                    markerScale={markerScale}
                  />
                ))}
            </>
          ) : (
            placements.map((placement) => (
              <PlayerMarker
                key={placement.player.id}
                placement={placement}
                markerScale={markerScale}
              />
            ))
          )}
        </HalfFieldSvg>
      </div>

      {hasNext && (
        <div className="bg-card rounded-[10px] overflow-hidden border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <div className="flex items-center gap-3 px-4 py-2 min-h-11">
            <div className="flex-1 min-w-0">
              <p className="text-ios-subheadline font-medium">{t('field.show_changes')}</p>
              <p className="text-ios-caption1 text-muted-foreground">
                {t('field.preview_hint', {
                  rotation: (nextRotation?.index ?? viewingIndex + 1) + 1,
                })}
              </p>
            </div>
            <Switch
              checked={showChanges}
              onCheckedChange={setShowChanges}
              aria-label={t('field.show_changes')}
            />
          </div>

          {showChanges && preview && (
            <>
              <div className="h-px bg-border/35 ml-4" />
              <div className="px-4 py-3 space-y-3">
                {!preview.hasGoalie && useGoalie && (
                  <p className="text-ios-footnote text-destructive">
                    {t('field.no_goalie', {
                      rotation: (nextRotation?.index ?? viewingIndex + 1) + 1,
                    })}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <SummaryChip
                    tone="incoming"
                    icon={<ArrowUpIcon className="size-3.5" />}
                    label={`${preview.incomingPlacements.length} ${t('live.sub_in')}`}
                  />
                  <SummaryChip
                    tone="outgoing"
                    icon={<ArrowDownIcon className="size-3.5" />}
                    label={`${preview.outgoingPlacements.length} ${t('live.sub_out')}`}
                  />
                  <SummaryChip
                    tone="position"
                    icon={<ArrowRightLeftIcon className="size-3.5" />}
                    label={`${preview.positionPlacements.length} ${t('live.position_change')}`}
                  />
                  <SummaryChip
                    tone="role"
                    icon={<ArrowRightLeftIcon className="size-3.5" />}
                    label={`${preview.rolePlacements.length} ${t('live.role_change')}`}
                  />
                </div>

                {preview.incomingPlacements.length === 0 &&
                preview.outgoingPlacements.length === 0 &&
                preview.positionPlacements.length === 0 &&
                preview.rolePlacements.length === 0 ? (
                  <p className="text-ios-footnote text-muted-foreground">{t('field.no_changes')}</p>
                ) : (
                  <div className="space-y-3">
                    <TransitionSection
                      title={t('live.sub_in')}
                      tone="incoming"
                      icon={<ArrowUpIcon className="size-3.5" />}
                      placements={preview.incomingPlacements}
                    />
                    <TransitionSection
                      title={t('live.sub_out')}
                      tone="outgoing"
                      icon={<ArrowDownIcon className="size-3.5" />}
                      placements={preview.outgoingPlacements}
                    />
                    <TransitionSection
                      title={t('live.position_change')}
                      tone="position"
                      icon={<ArrowRightLeftIcon className="size-3.5" />}
                      placements={preview.positionPlacements}
                    />
                    <TransitionSection
                      title={t('live.role_change')}
                      tone="role"
                      icon={<ArrowRightLeftIcon className="size-3.5" />}
                      placements={preview.rolePlacements}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
