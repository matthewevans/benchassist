# Bulk Player Import

## Summary

Add an "Import Players" button to RosterEditor that lets users paste a list of players in `Name: Skill` format, preview/edit them in a table, then save.

## Flow

1. Click "Import Players" in RosterEditor (next to "Add Player")
2. Dialog step 1 — Paste: textarea for `Name: Skill` lines
3. Dialog step 2 — Preview: editable table with columns:
   - Name (text input)
   - Skill ranking (dropdown 1-5)
   - Goalie eligible (checkbox)
   - Status badge: "New" or "Update" (case-insensitive name match against existing roster)
   - Inline error display for unparseable lines
4. Click "Import N Players" to save
5. New players → `ADD_PLAYER`, matched players → `UPDATE_PLAYER`

## Parsing Rules

- Format: `Name: Skill` per line
- Split on last colon (handles names containing colons)
- Skill must be integer 1-5; invalid → error row
- Blank lines ignored
- Names trimmed

## Architecture

- Pure function `parsePlayerImport(text: string)` in `src/utils/parsePlayerImport.ts` — unit testable
- Dialog UI in `RosterEditor.tsx` with two internal states (paste vs preview)
- No new reducer actions needed — reuses existing `ADD_PLAYER` and `UPDATE_PLAYER`

## Out of Scope

- Position assignment during import
- CSV/file upload
- Undo/batch delete of imported players
