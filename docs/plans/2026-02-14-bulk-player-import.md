# Bulk Player Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add paste-based bulk player import with editable preview to the RosterEditor page.

**Architecture:** Pure parsing function (`parsePlayerImport`) handles text→structured data, tested independently. UI lives in `RosterEditor.tsx` as a two-step dialog (paste → preview table → save). Reuses existing `ADD_PLAYER` / `UPDATE_PLAYER` dispatch actions.

**Tech Stack:** React, TypeScript, Vitest, shadcn/ui (Dialog, Input, Select, Badge, Button, Label)

---

### Task 1: Parse function — tests

**Files:**

- Create: `src/utils/parsePlayerImport.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { parsePlayerImport } from './parsePlayerImport.ts';

describe('parsePlayerImport', () => {
  it('parses valid lines into name and skill', () => {
    const result = parsePlayerImport('Sloane: 4\nElla: 5');
    expect(result).toEqual([
      { name: 'Sloane', skillRanking: 4 },
      { name: 'Ella', skillRanking: 5 },
    ]);
  });

  it('trims whitespace from names', () => {
    const result = parsePlayerImport('  Ava G  : 3  ');
    expect(result).toEqual([{ name: 'Ava G', skillRanking: 3 }]);
  });

  it('skips blank lines', () => {
    const result = parsePlayerImport('Sloane: 4\n\n\nElla: 5');
    expect(result).toHaveLength(2);
  });

  it('returns error for invalid skill ranking', () => {
    const result = parsePlayerImport('Bad: 9');
    expect(result).toEqual([{ name: 'Bad', error: 'Skill must be 1-5' }]);
  });

  it('returns error for missing colon', () => {
    const result = parsePlayerImport('NoColon');
    expect(result).toEqual([{ name: 'NoColon', error: 'Expected format: Name: Skill' }]);
  });

  it('returns error for non-numeric skill', () => {
    const result = parsePlayerImport('Bad: abc');
    expect(result).toEqual([{ name: 'Bad', error: 'Skill must be 1-5' }]);
  });

  it('splits on last colon to handle names with colons', () => {
    const result = parsePlayerImport('Nick: Jr: 2');
    expect(result).toEqual([{ name: 'Nick: Jr', skillRanking: 2 }]);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlayerImport('')).toEqual([]);
    expect(parsePlayerImport('  \n  \n  ')).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/utils/parsePlayerImport.test.ts`
Expected: FAIL — module not found

**Step 3: Commit**

```bash
git add src/utils/parsePlayerImport.test.ts
git commit -m "test: add parsePlayerImport tests"
```

---

### Task 2: Parse function — implementation

**Files:**

- Create: `src/utils/parsePlayerImport.ts`

**Step 1: Implement the parser**

```ts
import type { SkillRanking } from '@/types/domain.ts';

export type ParsedPlayer =
  | { name: string; skillRanking: SkillRanking }
  | { name: string; error: string };

export function parsePlayerImport(text: string): ParsedPlayer[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(parseLine);
}

function parseLine(line: string): ParsedPlayer {
  const lastColon = line.lastIndexOf(':');
  if (lastColon === -1) {
    return { name: line.trim(), error: 'Expected format: Name: Skill' };
  }

  const name = line.slice(0, lastColon).trim();
  const skillStr = line.slice(lastColon + 1).trim();
  const skill = Number(skillStr);

  if (!Number.isInteger(skill) || skill < 1 || skill > 5) {
    return { name: name || skillStr, error: 'Skill must be 1-5' };
  }

  return { name, skillRanking: skill as SkillRanking };
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test:run src/utils/parsePlayerImport.test.ts`
Expected: all 8 tests PASS

**Step 3: Commit**

```bash
git add src/utils/parsePlayerImport.ts
git commit -m "feat: add parsePlayerImport function"
```

---

### Task 3: Import dialog UI in RosterEditor

**Files:**

- Modify: `src/pages/RosterEditor.tsx`

This is the main UI task. Add an "Import Players" button and a two-step dialog.

**Step 1: Add state and import dialog to RosterEditor**

Add these state variables after line 44 (`const [form, setForm] = ...`):

```ts
const [isImporting, setIsImporting] = useState(false);
const [importText, setImportText] = useState('');
const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste');
const [importRows, setImportRows] = useState<ImportRow[]>([]);
```

Add type and imports at the top of the file:

```ts
import { parsePlayerImport, type ParsedPlayer } from '@/utils/parsePlayerImport.ts';

interface ImportRow {
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  existingPlayerId: string | null; // non-null = update existing player
  error: string | null;
}
```

Add handler functions after `handleDeletePlayer`:

```ts
function handleImportParse() {
  const parsed = parsePlayerImport(importText);
  const rows: ImportRow[] = parsed.map((p) => {
    if ('error' in p) {
      return {
        name: p.name,
        skillRanking: 3,
        canPlayGoalie: false,
        existingPlayerId: null,
        error: p.error,
      };
    }
    const existing = roster?.players.find((rp) => rp.name.toLowerCase() === p.name.toLowerCase());
    return {
      name: p.name,
      skillRanking: p.skillRanking,
      canPlayGoalie: existing?.canPlayGoalie ?? false,
      existingPlayerId: existing?.id ?? null,
      error: null,
    };
  });
  setImportRows(rows);
  setImportStep('preview');
}

function handleImportSave() {
  if (!teamId || !rosterId) return;
  const validRows = importRows.filter((r) => !r.error);
  for (const row of validRows) {
    if (row.existingPlayerId) {
      const existing = roster?.players.find((p) => p.id === row.existingPlayerId);
      const player: Player = {
        id: row.existingPlayerId,
        name: row.name,
        skillRanking: row.skillRanking,
        canPlayGoalie: row.canPlayGoalie,
        primaryPosition: existing?.primaryPosition ?? null,
        secondaryPositions: existing?.secondaryPositions ?? [],
        createdAt: existing?.createdAt ?? Date.now(),
      };
      dispatch({ type: 'UPDATE_PLAYER', payload: { teamId, rosterId, player } });
    } else {
      const player: Player = {
        id: generateId(),
        name: row.name,
        skillRanking: row.skillRanking,
        canPlayGoalie: row.canPlayGoalie,
        primaryPosition: null,
        secondaryPositions: [],
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_PLAYER', payload: { teamId, rosterId, player } });
    }
  }
  handleImportClose();
}

function handleImportClose() {
  setIsImporting(false);
  setImportText('');
  setImportStep('paste');
  setImportRows([]);
}

function updateImportRow(index: number, updates: Partial<ImportRow>) {
  setImportRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)));
}

function removeImportRow(index: number) {
  setImportRows((rows) => rows.filter((_, i) => i !== index));
}
```

**Step 2: Add the Import Players button and dialog to JSX**

Insert an "Import Players" button next to the "Add Player" `DialogTrigger` (around line 136). Add a second `Dialog` for the import flow.

Place the Import button inside the `<div className="flex items-center justify-between">` on line 121, adding a `<div className="flex gap-2">` wrapper around both buttons:

```tsx
<div className="flex gap-2">
  <Dialog open={isImporting} onOpenChange={(open) => { if (!open) handleImportClose(); else setIsImporting(true); }}>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm">Import Players</Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {importStep === 'paste' ? 'Import Players' : 'Review Import'}
        </DialogTitle>
      </DialogHeader>

      {importStep === 'paste' ? (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Paste player list (Name: Skill per line)</Label>
            <textarea
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'Sloane: 4\nElla: 3\nKendall: 5'}
              autoFocus
            />
          </div>
          <Button
            onClick={handleImportParse}
            className="w-full"
            disabled={!importText.trim()}
          >
            Preview
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            {importRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                {row.error ? (
                  <div className="flex-1 flex items-center gap-2 text-sm text-destructive">
                    <span className="truncate">{row.name}</span>
                    <span className="text-xs">({row.error})</span>
                  </div>
                ) : (
                  <>
                    <Input
                      value={row.name}
                      onChange={(e) => updateImportRow(i, { name: e.target.value })}
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={String(row.skillRanking)}
                      onValueChange={(v) => updateImportRow(i, { skillRanking: Number(v) as SkillRanking })}
                    >
                      <SelectTrigger className="w-16 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {([1, 2, 3, 4, 5] as const).map((rank) => (
                          <SelectItem key={rank} value={String(rank)}>
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="checkbox"
                      checked={row.canPlayGoalie}
                      onChange={(e) => updateImportRow(i, { canPlayGoalie: e.target.checked })}
                      className="h-4 w-4"
                      title="Can play goalie"
                    />
                    {row.existingPlayerId ? (
                      <Badge variant="secondary" className="text-xs shrink-0">Update</Badge>
                    ) : (
                      <Badge className="text-xs shrink-0">New</Badge>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 text-xs text-destructive shrink-0"
                  onClick={() => removeImportRow(i)}
                >
                  X
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setImportStep('paste')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleImportSave}
              className="flex-1"
              disabled={importRows.filter((r) => !r.error).length === 0}
            >
              Import {importRows.filter((r) => !r.error).length} Players
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>

  {/* Existing Add Player dialog below */}
```

**Step 3: Run build to check types**

Run: `pnpm build`
Expected: clean build, no TS errors

**Step 4: Commit**

```bash
git add src/pages/RosterEditor.tsx
git commit -m "feat: add bulk player import dialog to RosterEditor"
```

---

### Task 4: Manual verification

**Step 1: Run all tests**

Run: `pnpm test:run`
Expected: all tests pass

**Step 2: Run build**

Run: `pnpm build`
Expected: clean build

**Step 3: Commit all remaining changes**

Commit any unstaged files.
