#!/usr/bin/env python3
"""
Transforms drills.ts and training-focuses.ts string fields to LocalizedString format.
Wraps string fields like name/description/setup with { en: '...' } and transforms
array items in coachingTips/variations from strings to LocalizedString objects.

Uses a line-based state machine approach for reliability.
"""
import sys
import re

def is_string_value(s):
    """Check if s is a quoted string (single or double)."""
    s = s.strip()
    return (s.startswith("'") or s.startswith('"'))

def wrap_as_localized(s):
    """Wrap a quoted string value as { en: 'value' }."""
    return f"{{ en: {s} }}"

def transform_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip('\n')

        # Match simple string property: name/description/setup on same line
        # Pattern: <indent>field: 'value', or <indent>field: 'value'
        # Only match if the value is a complete string (ends with quote + comma)
        m = re.match(
            r'^(\s+)(name|description|setup):\s+(\'(?:[^\'\\]|\\.)*\'|"(?:[^"\\]|\\.)*")(\s*,?\s*)$',
            stripped
        )
        if m:
            indent, field, value, tail = m.groups()
            result.append(f"{indent}{field}: {{ en: {value} }}{tail}\n")
            i += 1
            continue

        # Match description/setup/name that continues on NEXT line(s)
        # Pattern: <indent>field:
        # then next line(s) are the string value
        m = re.match(r'^(\s+)(name|description|setup):\s*$', stripped)
        if m:
            indent, field = m.groups()
            # Look at next line(s) for the string value
            result.append(f"{indent}{field}:\n")
            i += 1
            # Collect next line - it should be the string value
            if i < len(lines):
                next_stripped = lines[i].rstrip('\n')
                vm = re.match(
                    r'^(\s+)(\'(?:[^\'\\]|\\.)*\'|"(?:[^"\\]|\\.)*")(\s*,?\s*)$',
                    next_stripped
                )
                if vm:
                    v_indent, value, tail = vm.groups()
                    result.append(f"{v_indent}{{ en: {value} }}{tail}\n")
                    i += 1
                    continue
            continue

        # Match description/setup with value on same line (alternate spacing)
        # Pattern: <indent>description: (newline) <indent>  'long string',

        # Match string items inside arrays (coachingTips, variations)
        # These look like:   'tip text',
        # We need context: are we inside a coachingTips or variations array?
        # Instead of tracking context, match the pattern but only for lines
        # that are clearly array string items (extra indent, string, comma)
        # We'll match strings that look like drill array items:
        #   4+ spaces indent, string value, optional comma
        m = re.match(
            r'^(\s{6,})(\'(?:[^\'\\]|\\.)*\'|"(?:[^"\\]|\\.)*")(\s*,\s*)$',
            stripped
        )
        if m:
            indent, value, tail = m.groups()
            result.append(f"{indent}{{ en: {value} }}{tail}\n")
            i += 1
            continue

        result.append(lines[i])
        i += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(result)

    print(f"Transformed {filepath}")

for filepath in sys.argv[1:]:
    transform_file(filepath)
