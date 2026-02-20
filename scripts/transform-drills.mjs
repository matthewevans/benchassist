/**
 * Transforms drills.ts string fields to LocalizedString format.
 * Wraps `name`, `description`, `setup` string values and
 * `coachingTips`/`variations` array string values with { en: '...' }.
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node transform-drills.mjs <file>');
  process.exit(1);
}

let content = readFileSync(filePath, 'utf8');

// Helper: wrap a captured string value with { en: VALUE }
// This handles both single-quoted and backtick strings

// Transform: name: 'string', → name: { en: 'string' },
// Also handles multiline template strings
const simpleStringFields = ['name', 'description', 'setup'];

for (const field of simpleStringFields) {
  // Match: field: 'single line string',
  // field:\n    'multiline\n    string',
  // Uses a non-greedy match for the string content
  content = content.replace(
    new RegExp(`(\\s+${field}:)\\s+('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"),`, 'g'),
    (_, prefix, str) => `${prefix} { en: ${str} },`
  );
}

// Transform array string items: ['tip1', 'tip2'] → [{ en: 'tip1' }, { en: 'tip2' }]
// This handles the coachingTips and variations arrays
// Match individual string items inside arrays that are values of these fields
const arrayFields = ['coachingTips', 'variations'];
for (const field of arrayFields) {
  // Replace string literals inside these array fields
  // We need to find the array and replace each string item
  // This is done by finding the field and its array content
  content = content.replace(
    new RegExp(`(${field}: \\[)([^\\]]+)(\\])`, 'gs'),
    (match, open, arrayContent, close) => {
      // Replace each string item in the array with { en: 'string' }
      const transformed = arrayContent.replace(
        /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g,
        (str) => `{ en: ${str} }`
      );
      return `${open}${transformed}${close}`;
    }
  );
}

writeFileSync(filePath, content, 'utf8');
console.log(`Transformed ${filePath}`);
