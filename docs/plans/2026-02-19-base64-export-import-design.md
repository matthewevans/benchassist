# Base64 Text Export/Import Design

## Summary

Add base64 text export/import as an alternative to file-based JSON export/import. Users can copy backup data as text (for sharing via messages, notes, etc.) and paste text to restore.

## Export Flow

1. User taps "Export Backup" on Settings — ExportDialog opens (unchanged)
2. Team selection tree (unchanged)
3. Bottom area has two actions:
   - **"Save to Files"** — primary button, downloads JSON file (existing behavior)
   - **"Copy as Text"** — plain/secondary button below, encodes filtered JSON to base64
4. Tapping "Copy as Text":
   - Auto-copies base64 string to clipboard via `navigator.clipboard.writeText()`
   - Sheet transitions to a result state: "Copied to Clipboard" confirmation, read-only monospace textarea showing the base64 text, a "Copy" button for re-copying, and "Done" to dismiss

## Import Flow

1. User taps "Import Backup" on Settings — new ImportMethodDialog bottom sheet opens
2. Two grouped list rows:
   - **"Choose File"** — document icon, chevron — opens file picker, then existing ImportDialog with selection tree + merge/replace
   - **"Paste Text"** — clipboard icon, chevron — navigates to a textarea view within the sheet
3. Paste Text view: textarea with placeholder "Paste backup text here...", "Load" button decodes base64, validates, then opens ImportDialog with selection tree + merge/replace (identical to file path)

## New Utility Functions (`exportImport.ts`)

- `exportToBase64(data: StorageData): string` — `btoa(exportToJSON(data))`
- `importFromBase64(text: string): StorageData` — `importFromJSON(atob(text.trim()))`

## Settings Page Changes

"Import Backup" row no longer directly triggers a hidden file input. It opens the ImportMethodDialog instead.

## Error Handling

- Invalid base64 on import: inline error below textarea — "Invalid backup data. Check that you copied the full text."
- Clipboard API failure on export: still show the text, skip the auto-copy confirmation

## Unchanged

- Team selection tree, merge/replace logic, undo support, schema migration — all identical
- File export/import behavior preserved
