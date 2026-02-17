import type { DrillProgression } from '@/types/drill.ts';

export const DRILL_PROGRESSIONS: DrillProgression[] = [
  {
    id: 'progression-passing-short-to-long',
    name: 'Passing: Short to Long Range',
    drillIds: [
      'passing-simple-pairs',
      'warm-up-passing-triangle',
      'passing-six-cone-rotation',
      'passing-long-range-driven',
    ],
  },

  {
    id: 'progression-passing-technique-to-pressure',
    name: 'Passing: Technique to Under Pressure',
    drillIds: [
      'warm-up-passing-pairs',
      'passing-wall-pass-combination',
      'passing-passing-under-pressure',
      'possession-rondo-5v2',
    ],
  },

  {
    id: 'progression-dribbling-mastery-to-1v1',
    name: 'Dribbling: Ball Mastery to 1v1',
    drillIds: [
      'warm-up-ball-mastery',
      'warm-up-cone-dribble-course',
      'dribbling-moves-circuit',
      'dribbling-1v1-channel',
    ],
  },

  {
    id: 'progression-dribbling-control-to-speed',
    name: 'Dribbling: Close Control to Speed',
    drillIds: [
      'dribbling-traffic-grid',
      'dribbling-gate-dribble',
      'dribbling-change-of-direction',
      'dribbling-speed-dribble-relay',
    ],
  },

  {
    id: 'progression-shooting-stationary-to-game',
    name: 'Shooting: Stationary to Game Situations',
    drillIds: [
      'shooting-stationary-strike',
      'shooting-turn-and-shoot',
      'shooting-finishing-circuit',
      'shooting-breakaway-finishing',
    ],
  },

  {
    id: 'progression-first-touch-basics-to-advanced',
    name: 'First Touch: Basics to Game Application',
    drillIds: [
      'first-touch-wall-rebound',
      'first-touch-cushion-control',
      'first-touch-directional',
      'first-touch-receive-and-turn',
    ],
  },

  {
    id: 'progression-defending-individual-to-team',
    name: 'Defending: Individual to Team Shape',
    drillIds: [
      'defending-1v1-jockeying',
      'defending-2v2-defending',
      'defending-recovery-runs',
      'defending-defensive-shape',
    ],
  },

  {
    id: 'progression-possession-small-to-large',
    name: 'Possession: Small Groups to Full Game',
    drillIds: [
      'possession-keep-ball-3v1',
      'possession-rondo-5v2',
      'possession-4v4-plus-3',
      'possession-keep-away-zones',
    ],
  },

  {
    id: 'progression-attacking-overloads-to-patterns',
    name: 'Attacking: Overloads to Team Patterns',
    drillIds: [
      'attacking-2v1-overload',
      'attacking-3v2-to-goal',
      'attacking-combination-to-finish',
      'attacking-final-third-entries',
    ],
  },

  {
    id: 'progression-goalkeeping-foundations',
    name: 'Goalkeeping: Foundations to Shot-Stopping',
    drillIds: [
      'warm-up-keeper-handling',
      'goalkeeping-footwork-agility',
      'goalkeeping-shot-stopping',
      'goalkeeping-1v1-saves',
    ],
  },

  {
    id: 'progression-transition-awareness',
    name: 'Transition: From Concept to Game',
    drillIds: [
      'transition-attack-to-defense',
      'transition-counter-attack',
      'transition-wave-attack',
      'scrimmage-numbers-up-down',
    ],
  },

  {
    id: 'progression-set-pieces-complete',
    name: 'Set Pieces: Dead Ball Mastery',
    drillIds: [
      'set-pieces-throw-in-routines',
      'set-pieces-goal-kick-build-up',
      'set-pieces-corner-kick-delivery',
      'set-pieces-free-kick-shooting',
    ],
  },
];
