# Selective Export & Import

## Problem

Export dumps everything. Users with multiple teams can't export/share a single team's data without getting the whole backup.

## Design

### Export Dialog

"Export Backup" opens a dialog with a checkbox tree of teams and their data categories. Each team row is **collapsed by default** (mobile-friendly) and expandable via chevron. Three children per team: Rosters, Game Configs, Game History. Parent checkbox is tri-state (checked/unchecked/indeterminate). Select All / Clear All at the top. Export button disabled when nothing selected.

### Import Dialog

After parsing a file, show the same checkbox tree populated from the imported data (all checked by default). Two actions:

- **Import Selected** (primary) — filters imported data by selections, merges into existing state
- **Replace All Data** (destructive, behind ConfirmDialog) — full restore, ignores selections

### Selection State

`useSelectionState(teams)` hook manages `Record<TeamId, { rosters: boolean; configs: boolean; history: boolean }>`. Derives parent tri-state from children. Provides `toggle(teamId, field)`, `toggleTeam(teamId)`, `selectAll()`, `clearAll()`.

### Data Filtering

`filterStorageData(data, selections)` in `exportImport.ts`:

- Include team if any child is true
- Strip `team.rosters` to `[]` if rosters unchecked
- Strip `team.gameConfigs` to `[]` if configs unchecked
- Exclude games for team if history unchecked
- Omit teams not in selections

Output is valid `StorageData`, so existing `downloadJSON` and `MERGE_DATA` work unchanged.

### Checkbox Indeterminate Support

Add `MinusIcon` rendering to `checkbox.tsx` for `data-[state=indeterminate]`.

## Files

| File                              | Change                                              |
| --------------------------------- | --------------------------------------------------- |
| `src/components/ExportDialog.tsx` | New — export modal with tree                        |
| `src/components/ImportDialog.tsx` | New — import modal with tree                        |
| `src/hooks/useSelectionState.ts`  | New — shared selection state hook                   |
| `src/storage/exportImport.ts`     | Add `filterStorageData()`                           |
| `src/components/ui/checkbox.tsx`  | Add indeterminate icon                              |
| `src/pages/Dashboard.tsx`         | Replace inline export/import with dialog components |
