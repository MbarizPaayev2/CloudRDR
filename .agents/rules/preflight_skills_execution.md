---
trigger: always_on
description: Mandatory pre-flight checklist - review Ponytail, Graphify, Headroom, and Codeburn before beginning work on any prompt.
---

# Mandatory Pre-Flight Skill Execution Protocol

Upon receiving ANY user prompt, and BEFORE generating code or modifying files, you MUST review and adhere to these four core skill principles:

## 1. Ponytail (Lazy Senior Dev Mode — Least Code Wins)
- **Principle**: The best code is the code never written. Solve the whole problem with the least new code.
- **Scope check**: Read the task and the code it touches. List every place the change must reach (callers, tests, fixtures, config, exports). Check what it could break.
- **The smallest complete change**:
  1. Does it need to exist? Skip features, options, and flexibility nobody asked for.
  2. Already in this codebase? Reuse existing helpers, patterns, and conventions.
  3. Standard library / platform feature? Use it.
  4. Installed dependency? Use it before adding new packages.
  5. The shortest working diff wins.
- **Never cut**: Validation at trust boundaries, error handling that prevents data loss, security, accessibility, tests for non-trivial logic.
- **Label intentional shortcuts**: Mark deferrals as `shortcut: <limit>, <when to upgrade>`.
- **Reply closing**: End every response with 1–2 lines stating what was skipped or not checked, and any risk the user must know.

## 2. Graphify (Knowledge Graph & Architecture Orientation)
- **Principle**: Orient with graph knowledge before diving into raw grepping.
- If `graphify-out/graph.json` exists:
  - Run `graphify query "<question>"` for scoped subgraphs.
  - Run `graphify path "<A>" "<B>"` for component relationships.
  - Run `graphify explain "<concept>"` for node explanations.
- If `graphify-out/wiki/index.md` exists, navigate it before raw files.
- After modifying code files in this session, run `graphify update .` to keep the AST graph up-to-date.

## 3. Headroom (Context Compression & Memory Efficiency)
- **Principle**: Prevent context bloating and retain high-signal information.
- Use targeted line slicing (`StartLine`, `EndLine`) when reading files.
- Never dump massive raw logs or repeat reads of unchanged files.
- Use structural probes (`headroom diff`, `headroom sg`, `headroom loc`) for syntax-level awareness.

## 4. Codeburn (Spend & Waste Elimination)
- **Principle**: Minimize token consumption and eliminate wasteful operations.
- Avoid polling loops or repetitive check routines.
- Run `npx codeburn optimize` when auditing workflows or checking token efficiency.
- Prefer targeted in-place edits (`replace_file_content`) over whole-file overwrites.
