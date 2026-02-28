import { RotationAssignment } from '@/types/domain.ts';
import type { FormationSlot, Player, PlayerId, Rotation, SubPosition } from '@/types/domain.ts';
import { deriveSubPositions, SUB_POSITION_GROUP } from '@/utils/positions.ts';
import {
  getRotationTransitions,
  type RotationTransitionKind,
} from '@/utils/rotationTransitions.ts';

// ---------------------------------------------------------------------------
// Coordinate mapping: SubPosition → (x, y) on the half-field SVG
// Field area: (0,0) = halfway line top-left, (680, 525) = goal line bottom-right
// Attacking end (FWD) at low y, defending end (GK) at high y
// ---------------------------------------------------------------------------

const FIELD_COORDS: Record<SubPosition | 'GK', { x: number; y: number }> = {
  GK: { x: 340, y: 500 },
  LB: { x: 95, y: 378 },
  LCB: { x: 215, y: 385 },
  CB: { x: 340, y: 388 },
  RCB: { x: 465, y: 385 },
  RB: { x: 585, y: 378 },
  LM: { x: 90, y: 238 },
  LCM: { x: 215, y: 245 },
  CM: { x: 340, y: 248 },
  RCM: { x: 465, y: 245 },
  RM: { x: 590, y: 238 },
  LW: { x: 115, y: 95 },
  CF: { x: 265, y: 78 },
  ST: { x: 340, y: 70 },
  RW: { x: 565, y: 95 },
};

const SIDE_NUDGE_X = 8;
const MOBILE_ENTER_PX = 640;
const MOBILE_EXIT_PX = 680;
const TABLET_ENTER_PX = 900;
const TABLET_EXIT_PX = 940;
const MARKER_SCALE_DESKTOP = 1;
const MARKER_SCALE_TABLET = 1.12;
const MARKER_SCALE_MOBILE = 1.26;

function getMarkerScaleForWidth(width: number): number {
  if (width <= MOBILE_ENTER_PX) return MARKER_SCALE_MOBILE;
  if (width <= TABLET_ENTER_PX) return MARKER_SCALE_TABLET;
  return MARKER_SCALE_DESKTOP;
}

export function getNextMarkerScale(width: number, currentScale: number): number {
  if (currentScale === MARKER_SCALE_MOBILE) {
    if (width > MOBILE_EXIT_PX) {
      return width <= TABLET_ENTER_PX ? MARKER_SCALE_TABLET : MARKER_SCALE_DESKTOP;
    }
    return MARKER_SCALE_MOBILE;
  }

  if (currentScale === MARKER_SCALE_TABLET) {
    if (width <= MOBILE_ENTER_PX) return MARKER_SCALE_MOBILE;
    if (width > TABLET_EXIT_PX) return MARKER_SCALE_DESKTOP;
    return MARKER_SCALE_TABLET;
  }

  if (width <= MOBILE_ENTER_PX) return MARKER_SCALE_MOBILE;
  if (width <= TABLET_ENTER_PX) return MARKER_SCALE_TABLET;
  return MARKER_SCALE_DESKTOP;
}

export function getCurrentMarkerScale(): number {
  if (typeof window === 'undefined') return 1;
  return getMarkerScaleForWidth(window.innerWidth);
}

export function getCoordsWithLateralNudge(subPos: SubPosition | 'GK'): { x: number; y: number } {
  const coords = FIELD_COORDS[subPos];
  if (!coords) {
    if (import.meta.env.DEV)
      console.warn(`FieldView: unknown sub-position "${subPos}", centering marker`);
    return { x: 340, y: 248 };
  }
  if (subPos === 'GK') return coords;
  if (subPos.startsWith('L')) return { x: coords.x - SIDE_NUDGE_X, y: coords.y };
  if (subPos.startsWith('R')) return { x: coords.x + SIDE_NUDGE_X, y: coords.y };
  return coords;
}

export const GROUP_TINT_FILL: Record<string, string> = {
  GK: 'rgba(59, 130, 246, 0.26)',
  DEF: 'rgba(147, 51, 234, 0.24)',
  MID: 'rgba(5, 150, 105, 0.24)',
  FWD: 'rgba(234, 88, 12, 0.24)',
};

const DEFAULT_FORMATIONS: Record<number, FormationSlot[]> = {
  2: [
    { position: 'DEF', count: 1 },
    { position: 'FWD', count: 1 },
  ],
  3: [
    { position: 'DEF', count: 1 },
    { position: 'MID', count: 1 },
    { position: 'FWD', count: 1 },
  ],
  4: [
    { position: 'DEF', count: 2 },
    { position: 'MID', count: 1 },
    { position: 'FWD', count: 1 },
  ],
  5: [
    { position: 'DEF', count: 2 },
    { position: 'MID', count: 2 },
    { position: 'FWD', count: 1 },
  ],
  6: [
    { position: 'DEF', count: 2 },
    { position: 'MID', count: 2 },
    { position: 'FWD', count: 2 },
  ],
  7: [
    { position: 'DEF', count: 3 },
    { position: 'MID', count: 2 },
    { position: 'FWD', count: 2 },
  ],
  8: [
    { position: 'DEF', count: 3 },
    { position: 'MID', count: 3 },
    { position: 'FWD', count: 2 },
  ],
  9: [
    { position: 'DEF', count: 3 },
    { position: 'MID', count: 3 },
    { position: 'FWD', count: 3 },
  ],
  10: [
    { position: 'DEF', count: 4 },
    { position: 'MID', count: 3 },
    { position: 'FWD', count: 3 },
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlacedPlayer {
  player: Player;
  subPos: SubPosition | 'GK';
  group: string;
  x: number;
  y: number;
}

interface StackItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preferUp?: boolean;
}

export interface PreviewData {
  placements: PlacedPlayer[];
  transitionKindByPlayerId: Map<PlayerId, RotationTransitionKind>;
  markerNameByPlayerId: Map<PlayerId, string>;
  incomingPlacements: PlacedPlayer[];
  outgoingPlacements: PlacedPlayer[];
  positionPlacements: PlacedPlayer[];
  rolePlacements: PlacedPlayer[];
  hasGoalie: boolean;
}

// ---------------------------------------------------------------------------
// Name disambiguation
// ---------------------------------------------------------------------------

export function getFirstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[0];
}

function getLastName(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1] ?? null;
}

function buildCompactNameMap(placements: PlacedPlayer[]): Map<PlayerId, string> {
  const byFirstName = new Map<string, PlacedPlayer[]>();
  for (const placement of placements) {
    const firstName = getFirstName(placement.player.name);
    const group = byFirstName.get(firstName) ?? [];
    group.push(placement);
    byFirstName.set(firstName, group);
  }

  const result = new Map<PlayerId, string>();
  for (const [firstName, group] of byFirstName.entries()) {
    if (group.length === 1) {
      const only = group[0];
      if (only) result.set(only.player.id as PlayerId, firstName);
      continue;
    }

    const initials = new Map<PlayerId, string>();
    const initialCounts = new Map<string, number>();

    for (const placement of group) {
      const lastName = getLastName(placement.player.name);
      const initial = lastName ? `${lastName[0]}.` : '';
      initials.set(placement.player.id as PlayerId, initial);
      initialCounts.set(initial, (initialCounts.get(initial) ?? 0) + 1);
    }

    for (const placement of group) {
      const playerId = placement.player.id as PlayerId;
      const initial = initials.get(playerId) ?? '';
      if (!initial) {
        result.set(playerId, firstName);
        continue;
      }

      const initialCount = initialCounts.get(initial) ?? 0;
      if (initialCount === 1) {
        result.set(playerId, `${firstName} ${initial}`);
        continue;
      }

      const lastName = getLastName(placement.player.name);
      if (lastName) {
        result.set(playerId, `${firstName} ${lastName}`);
      } else {
        result.set(playerId, firstName);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Placement building
// ---------------------------------------------------------------------------

const POSITION_FALLBACK: Record<string, SubPosition> = {
  DEF: 'CB',
  MID: 'CM',
  FWD: 'ST',
};

function fallbackSubPos(player: Player): SubPosition {
  if (player.primaryPosition) {
    return POSITION_FALLBACK[player.primaryPosition] ?? 'CM';
  }
  return 'CM';
}

function sortByFieldOrder(a: PlacedPlayer, b: PlacedPlayer): number {
  return a.y - b.y || a.x - b.x;
}

export function buildPlacements(
  rotation: Rotation,
  playerMap: Map<PlayerId, Player>,
  usePositions: boolean,
): PlacedPlayer[] {
  const placements: PlacedPlayer[] = [];

  if (usePositions && rotation.fieldPositions) {
    for (const [pid, assignment] of Object.entries(rotation.assignments)) {
      if (assignment === RotationAssignment.Bench) continue;
      const player = playerMap.get(pid as PlayerId);
      if (!player) continue;

      if (assignment === RotationAssignment.Goalie) {
        const coords = getCoordsWithLateralNudge('GK');
        placements.push({ player, subPos: 'GK', group: 'GK', ...coords });
      } else {
        const subPos = rotation.fieldPositions[pid as PlayerId] ?? fallbackSubPos(player);
        const coords = getCoordsWithLateralNudge(subPos);
        if (!coords) continue;
        placements.push({
          player,
          subPos,
          group: SUB_POSITION_GROUP[subPos] ?? 'MID',
          ...coords,
        });
      }
    }
    return placements;
  }

  const fieldPlayerIds: PlayerId[] = [];
  for (const [pid, assignment] of Object.entries(rotation.assignments)) {
    if (assignment === RotationAssignment.Bench) continue;
    const player = playerMap.get(pid as PlayerId);
    if (!player) continue;

    if (assignment === RotationAssignment.Goalie) {
      const coords = getCoordsWithLateralNudge('GK');
      placements.push({ player, subPos: 'GK', group: 'GK', ...coords });
    } else {
      fieldPlayerIds.push(pid as PlayerId);
    }
  }

  const outfieldCount = fieldPlayerIds.length;
  const formation = DEFAULT_FORMATIONS[outfieldCount] ?? DEFAULT_FORMATIONS[6];
  if (import.meta.env.DEV && !DEFAULT_FORMATIONS[outfieldCount]) {
    console.warn(
      `FieldView: no formation for ${outfieldCount} outfield players, falling back to 6`,
    );
  }
  const slots = formation ? deriveSubPositions(formation) : [];

  fieldPlayerIds.forEach((pid, i) => {
    const player = playerMap.get(pid);
    if (!player) return;
    const subPos = slots[i] ?? ('CM' as SubPosition);
    const coords = getCoordsWithLateralNudge(subPos as SubPosition);
    placements.push({
      player,
      subPos: subPos as SubPosition,
      group: SUB_POSITION_GROUP[subPos as SubPosition] ?? 'MID',
      ...coords,
    });
  });

  return placements;
}

// ---------------------------------------------------------------------------
// Stacking / overlap resolution
// ---------------------------------------------------------------------------

export function stackOverlappingPlacements(
  placements: PlacedPlayer[],
  markerScale = 1,
): PlacedPlayer[] {
  const stackedCoords = stackCoordsByOverlap(
    placements.map((placement) => ({
      id: placement.player.id,
      x: placement.x,
      y: placement.y,
      width: getPlacementWidth(placement, false, markerScale) + 12 * markerScale,
      height: 34 * markerScale + 10,
    })),
  );

  return placements.map((placement) => {
    const spread = stackedCoords.get(placement.player.id);
    if (!spread) return placement;
    return {
      ...placement,
      x: spread.x,
      y: spread.y,
    };
  });
}

function stackCoordsByOverlap(
  items: StackItem[],
  options?: { gap?: number; horizontalPadding?: number },
): Map<string, { x: number; y: number }> {
  const spreadById = new Map<string, { x: number; y: number }>();
  const placed: StackItem[] = [];
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const gap = options?.gap ?? 8;
  const horizontalPadding = options?.horizontalPadding ?? 4;

  for (const item of sorted) {
    let y = item.y;
    let moved = true;
    const minY = item.height / 2 + 6;
    const maxY = 525 - item.height / 2 - 6;
    const prefersUp = item.preferUp === true;

    while (moved) {
      moved = false;
      for (const prior of placed) {
        const overlapsHorizontally =
          Math.abs(item.x - prior.x) < (item.width + prior.width) / 2 + horizontalPadding;
        const overlapsVertically = Math.abs(y - prior.y) < (item.height + prior.height) / 2 + gap;
        if (overlapsHorizontally && overlapsVertically) {
          const distance = (item.height + prior.height) / 2 + gap;
          const upCandidate = prior.y - distance;
          const downCandidate = prior.y + distance;

          if (prefersUp) {
            if (upCandidate >= minY && upCandidate < y) {
              y = upCandidate;
              moved = true;
            } else if (downCandidate <= maxY && downCandidate > y) {
              y = downCandidate;
              moved = true;
            }
          } else if (downCandidate <= maxY && downCandidate > y) {
            y = downCandidate;
            moved = true;
          } else if (upCandidate >= minY && upCandidate < y) {
            y = upCandidate;
            moved = true;
          }
        }
      }
    }

    const boundedY = Math.max(minY, Math.min(maxY, y));
    spreadById.set(item.id, { x: item.x, y: boundedY });
    placed.push({ ...item, y: boundedY });
  }

  return spreadById;
}

export function getMarkerLabel(placement: PlacedPlayer, showPosition = false): string {
  const firstName = getFirstName(placement.player.name);
  return showPosition ? `${firstName} · ${placement.subPos}` : firstName;
}

export function getMarkerWidth(label: string, markerScale = 1): number {
  return Math.max(
    84 * markerScale,
    Math.min(178 * markerScale, label.length * 7.2 * markerScale + 24 * markerScale),
  );
}

function getPlacementWidth(placement: PlacedPlayer, showPosition = false, markerScale = 1): number {
  return getMarkerWidth(getMarkerLabel(placement, showPosition), markerScale);
}

// ---------------------------------------------------------------------------
// Preview building
// ---------------------------------------------------------------------------

export function buildNextPreview(
  currentRotation: Rotation,
  currentPlacements: PlacedPlayer[],
  nextRotation: Rotation,
  playerMap: Map<PlayerId, Player>,
  usePositions: boolean,
  markerScale: number,
): PreviewData {
  const nextPlacementsRaw = buildPlacements(nextRotation, playerMap, usePositions);
  const transitions = getRotationTransitions(currentRotation, nextRotation);

  const transitionKindByPlayerId = new Map<PlayerId, RotationTransitionKind>();
  const incomingIds = new Set<PlayerId>();
  const outgoingIds = new Set<PlayerId>();
  const positionIds = new Set<PlayerId>();
  const roleIds = new Set<PlayerId>();

  for (const transition of transitions) {
    transitionKindByPlayerId.set(transition.playerId, transition.kind);

    switch (transition.kind) {
      case 'in':
        incomingIds.add(transition.playerId);
        break;
      case 'out':
        outgoingIds.add(transition.playerId);
        break;
      case 'position':
        positionIds.add(transition.playerId);
        break;
      case 'role':
        roleIds.add(transition.playerId);
        break;
    }
  }

  const outgoingRawPlacements = currentPlacements.filter((placement) =>
    outgoingIds.has(placement.player.id as PlayerId),
  );
  const markerNameByPlayerId = buildCompactNameMap([
    ...nextPlacementsRaw,
    ...outgoingRawPlacements,
  ]);

  function toStackItem(prefix: string, placement: PlacedPlayer): StackItem {
    const label =
      markerNameByPlayerId.get(placement.player.id as PlayerId) ?? getMarkerLabel(placement, false);
    return {
      id: `${prefix}:${placement.player.id}`,
      x: placement.x,
      y: placement.y,
      width: getMarkerWidth(label, markerScale) + 10 * markerScale,
      height: 34 * markerScale + 6,
      preferUp: placement.subPos === 'GK',
    };
  }

  const stacked = stackCoordsByOverlap(
    [
      ...nextPlacementsRaw.map((p) => toStackItem('next', p)),
      ...outgoingRawPlacements.map((p) => toStackItem('out', p)),
    ],
    { gap: 2, horizontalPadding: 2 },
  );

  function applyStacked(prefix: string, placements: PlacedPlayer[]): PlacedPlayer[] {
    return placements.map((placement) => {
      const spread = stacked.get(`${prefix}:${placement.player.id}`);
      return spread ? { ...placement, x: spread.x, y: spread.y } : placement;
    });
  }

  const spreadPlacements = applyStacked('next', nextPlacementsRaw);
  const spreadOutgoingPlacements = applyStacked('out', outgoingRawPlacements);

  const incomingPlacements = spreadPlacements
    .filter((placement) => incomingIds.has(placement.player.id as PlayerId))
    .sort(sortByFieldOrder);

  const positionPlacements = spreadPlacements
    .filter((placement) => positionIds.has(placement.player.id as PlayerId))
    .sort(sortByFieldOrder);

  const rolePlacements = spreadPlacements
    .filter((placement) => roleIds.has(placement.player.id as PlayerId))
    .sort(sortByFieldOrder);

  return {
    placements: spreadPlacements,
    transitionKindByPlayerId,
    markerNameByPlayerId,
    incomingPlacements,
    outgoingPlacements: spreadOutgoingPlacements.sort(sortByFieldOrder),
    positionPlacements,
    rolePlacements,
    hasGoalie: Object.values(nextRotation.assignments).includes(RotationAssignment.Goalie),
  };
}

// ---------------------------------------------------------------------------
// SVG path helper
// ---------------------------------------------------------------------------

export function getLeftRoundedSegmentPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, height / 2, width / 2));
  return [
    `M ${x + r} ${y}`,
    `H ${x + width}`,
    `V ${y + height}`,
    `H ${x + r}`,
    `Q ${x} ${y + height} ${x} ${y + height - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}
