import { renderHook, act } from '@testing-library/react';
import { useSelectionState } from './useSelectionState.ts';
import { teamFactory, resetFactories } from '@/test/factories.ts';
import type { Team } from '@/types/domain.ts';

describe('useSelectionState', () => {
  beforeEach(() => resetFactories());

  function buildTeams(): Team[] {
    return [teamFactory.build({ id: 'team-1' }), teamFactory.build({ id: 'team-2' })];
  }

  it('initializes all teams as fully selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.selections).toEqual({
      'team-1': { rosters: true, configs: true, history: true },
      'team-2': { rosters: true, configs: true, history: true },
    });
  });

  it('toggles a single field', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    expect(result.current.selections['team-1'].rosters).toBe(false);
    expect(result.current.selections['team-1'].configs).toBe(true);
  });

  it('derives parent state as checked when all children checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.getTeamState('team-1')).toBe(true);
  });

  it('derives parent state as unchecked when all children unchecked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => {
      result.current.toggleField('team-1', 'rosters');
      result.current.toggleField('team-1', 'configs');
      result.current.toggleField('team-1', 'history');
    });
    expect(result.current.getTeamState('team-1')).toBe(false);
  });

  it('derives parent state as indeterminate when some children checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    expect(result.current.getTeamState('team-1')).toBe('indeterminate');
  });

  it('toggleTeam checks all when currently unchecked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => {
      result.current.toggleField('team-1', 'rosters');
      result.current.toggleField('team-1', 'configs');
      result.current.toggleField('team-1', 'history');
    });
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('toggleTeam checks all when currently indeterminate', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('toggleTeam unchecks all when currently all checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: false,
      configs: false,
      history: false,
    });
  });

  it('selectAll checks everything', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleTeam('team-1')); // uncheck team-1
    act(() => result.current.selectAll());
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
    expect(result.current.selections['team-2']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('clearAll unchecks everything', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.clearAll());
    expect(result.current.selections['team-1']).toEqual({
      rosters: false,
      configs: false,
      history: false,
    });
  });

  it('hasAnySelected returns true when something is selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.hasAnySelected).toBe(true);
  });

  it('hasAnySelected returns false when nothing is selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.clearAll());
    expect(result.current.hasAnySelected).toBe(false);
  });
});
