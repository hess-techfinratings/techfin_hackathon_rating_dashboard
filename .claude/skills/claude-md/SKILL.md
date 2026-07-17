---
name: claude-md
description: Create or update CLAUDE.md — project rules, done/next logs, UI/UX & design conventions, and cross-page consistency. Use when asked to update CLAUDE.md or document rules/progress, and after completing a significant feature or design decision.
---

# CLAUDE.md maintenance

CLAUDE.md is loaded into context at the start of every session, so it must stay
**short, factual, and current**. It is not documentation for humans (that is the
README) — it is operating instructions for the agent. Target ≤ 120 lines total.

## Procedure

1. **Read the existing `CLAUDE.md`** at the repo root. If it exists, update in
   place — never regenerate from scratch, never drop a section you didn't verify
   is obsolete. If it doesn't exist, create it from the template below.
   - If CLAUDE.md is an import pointer (`@AGENTS.md`), leave the pointer alone
     and edit the target file instead (this repo: content lives in `AGENTS.md`).
   - Preserve managed blocks (`<!-- BEGIN:… -->` … `<!-- END:… -->`) exactly —
     tools own those; project content goes below them.
2. **Gather facts before writing.** Check `git log --oneline` since the last
   "What was done" entry, the current route/page list, and any new components,
   scripts, or conventions introduced. Every statement in CLAUDE.md must be
   verifiable in the repo right now — delete claims that no longer hold.
3. **Update each section** per the rules below.
4. **Show the user a one-line summary of what changed** in CLAUDE.md (added
   rules, moved roadmap items, etc.).

## Section rules

### Rules
Imperative, project-specific, non-obvious. One line each. A rule earns its place
only if breaking it caused (or would cause) a real bug or inconsistency — e.g.
encoding traps, library API differences, files that must never be committed.
Never restate what the framework or linter already enforces.

### Design & UI/UX conventions
The single source of truth for visual consistency: component library and its
usage idioms, color/token decisions and where they live, typography/number
formatting helpers and when to use them, language of UI copy, chart rules
(palette, legend, tooltip expectations). When a new convention is invented
during a task, it gets recorded here the same day.

### Page & function harmony
An "adding a new page/feature" checklist that keeps every page structurally
identical: required wrapper components, data-fetch + error/empty patterns,
guard clauses, navigation registration, formatting helpers. This section is
what makes the project **expandable** — a new page written only from this
checklist should be indistinguishable in style from existing pages. Update it
whenever a structural pattern changes (and refactor stragglers or note them
in the roadmap).

### Data model (if the project has one)
Tables/views/keys in a few lines, plus data quirks that would silently corrupt
work if forgotten (encodings, swapped columns, magic codes). Point to schema
files rather than duplicating them.

### What was done
Dated, newest first, one line per meaningful change ("2026-07-17 Imported
5,267 rating requests into Supabase"). This is the project's memory across
sessions — write entries so a fresh session can reconstruct state without
reading git history. Collapse entries older than ~10 lines into a single
"earlier: …" line.

### What to do next
Prioritized checklist of agreed future work only — no speculation the user
never endorsed. When an item completes, move it (rephrased in past tense) to
"What was done" in the same edit. Items blocked on the user get a
`(blocked: …)` suffix.

## Template (for first creation)

```markdown
# CLAUDE.md

<one-line project description>. Stack: <stack>.

## Rules
- …

## Design & UI/UX conventions
- …

## Page & function harmony — adding a new page
1. …

## Data model
- …

## What was done
- YYYY-MM-DD …

## What to do next
- [ ] …
```

## Anti-patterns

- Prose paragraphs — use terse bullets; the agent pays per token every session.
- Duplicating README, package.json, or schema contents.
- "What was done" entries that describe intent instead of outcome.
- Roadmap items that silently disappear instead of being moved to done.
- Updating code conventions without updating the harmony checklist (or vice versa).
