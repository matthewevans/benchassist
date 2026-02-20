# Design: GYSA Brackets + Easier Team Setup

**Date:** 2026-02-20
**Status:** Approved

## Overview

Three improvements to make team setup faster and smarter:

1. Relax bulk player import so skill is optional (defaults to 3)
2. Add all GYSA age-bracket game config templates
3. Auto-apply the matching GYSA config when a team is created with a birth year
4. Redesign the template picker to be HIG-compliant (bottom sheet with grouped sections)

---

## 1. Skill Default for Bulk Import

### Problem

`parsePlayerImport` currently requires `Name: Skill` format and returns an error when no skill number is provided. Coaches who want to paste a plain list of names can't do so.

### Solution

Make `: Skill` optional in the parser. A line with no colon (or just a name) parses as `skillRanking: 3`. Lines with an explicit skill still parse as before. Lines with a malformed skill (non-integer, out of 1–5 range) still produce an error.

### Change

`src/utils/parsePlayerImport.ts` — single function change.

---

## 2. GYSA Templates

### New Templates (rename existing GYSA 7v7 → GYSA U9)

| Template Name       | fieldSize | useGoalie | periods | periodDurationMinutes | rotationsPerPeriod | usePositions |
| ------------------- | --------- | --------- | ------- | --------------------- | ------------------ | ------------ |
| GYSA U5/U6          | 4         | false     | 4       | 10                    | 1                  | false        |
| GYSA U7             | 5         | false     | 4       | 12                    | 1                  | false        |
| GYSA U8             | 6         | true      | 4       | 12                    | 2                  | false        |
| GYSA U9 _(renamed)_ | 7         | true      | 4       | 12                    | 2                  | false        |
| GYSA U10            | 7         | true      | 4       | 15                    | 2                  | false        |
| GYSA U11/12/13      | 9         | true      | 2       | 30                    | 2                  | false        |
| GYSA U14/15/16      | 11        | true      | 2       | 35                    | 2                  | false        |

U4 is omitted (too informal for rotation management).

### Template Type Extension

Add `group` and age-range fields to `GameConfigTemplate`:

```ts
export interface GameConfigTemplate {
  name: string;
  group: 'standard' | 'gysa';
  gysaMinAge?: number; // inclusive U age (e.g. 5 for U5/U6)
  gysaMaxAge?: number; // inclusive U age (e.g. 6 for U5/U6)
  // ...existing fields...
}
```

### Auto-Selection Logic

A new util `getGysaTemplateForBirthYear(birthYear: number): GameConfigTemplate | undefined` in `src/utils/gameConfig.ts`:

- Compute `uAge = currentYear - birthYear`
- Map to template: U5–U6 → GYSA U5/U6, U7 → GYSA U7, U8 → GYSA U8, U9 → GYSA U9, U10 → GYSA U10, U11–U13 → GYSA U11/12/13, U14+ → GYSA U14/15/16
- Returns `undefined` for ages outside GYSA range (< 5 or > 16)

---

## 3. Team Creation with Birth Year + Auto-Config

### Changes to `Dashboard.tsx`

Add a Birth Year field to the "New Team" bottom sheet (same inline input pattern used in TeamManagement). When the team is created with a birth year:

1. Create the `Team` object with `birthYear` set
2. Call `getGysaTemplateForBirthYear(birthYear)` — if match found, create a `GameConfig` from the template via `createConfigFromTemplate`
3. Dispatch `CREATE_TEAM` with the config embedded in `team.gameConfigs`

This avoids a second dispatch and keeps team creation atomic.

---

## 4. Template Picker UI (HIG-Compliant)

### Problem

Current UI: flat flex-wrap row of capsule buttons in TeamManagement. Not scalable (11+ templates), capsule shape is semantically wrong (belongs to tags/filters), and has no visual hierarchy.

### Solution

Replace with a **bottom sheet** triggered by a single **"+ Add from Template"** button. The sheet contains:

```
STANDARD FORMATS                    ← footnote, uppercase, muted
┌──────────────────────────────────┐
│ 5v5 (No Positions)               │
│ 5 players · 2 halves · 25 min + │
├──────────────────────────────────┤
│ 7v7                              │
│ 7 players · 2 halves · 30 min + │
│ ...                              │
└──────────────────────────────────┘

GYSA BRACKETS                       ← footnote, uppercase, muted
┌──────────────────────────────────┐
│ GYSA U9                     ★   │ ← "Recommended" primary color if birthYear matches
│ 7 players · 4 quarters · 12 min │
├──────────────────────────────────┤
│ GYSA U10                         │
│ 7 players · 4 quarters · 15 min │
│ ...                              │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Custom                       ›   │ ← opens GameConfigForm sheet
└──────────────────────────────────┘
```

**HIG compliance:**

- Section headers: footnote/uppercase/muted ✓
- Rows: `GroupedListRow` with 44px+ touch target ✓
- Tapping a template row adds the config and dismisses the sheet ✓
- Recommended label uses primary color (not a badge/chip — inline text) ✓
- Custom row uses chevron disclosure pattern ✓

### Subtitle Format Helper

A helper `formatConfigSummary(template)` produces the subtitle:

- `{fieldSize} players · {periods} halves/quarters · {periodDurationMinutes} min`
- Uses "halves" for 2 periods, "quarters" for 4 periods
- Appends "· Goalkeeper" if `useGoalie` is true

---

## Files Changed

| File                             | Change                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/types/domain.ts`            | Add `group`/`gysaMinAge`/`gysaMaxAge` to `GameConfigTemplate`, add 7 new GYSA templates, rename existing GYSA 7v7 |
| `src/utils/parsePlayerImport.ts` | Make skill optional in bulk import                                                                                |
| `src/utils/gameConfig.ts`        | Add `getGysaTemplateForBirthYear()`, add `formatConfigSummary()`                                                  |
| `src/pages/Dashboard.tsx`        | Add birth year field to create sheet, auto-add GYSA config on create                                              |
| `src/pages/TeamManagement.tsx`   | Replace capsule buttons with "Add from Template" button + new bottom sheet                                        |

---

## Out of Scope

- U4 templates (too informal)
- No changes to `GameConfig` runtime structure (only `GameConfigTemplate` metadata changes)
- No migration needed (templates are static definitions, not stored data)
- Skill field in manual player editor already defaults to 3 — no change needed
