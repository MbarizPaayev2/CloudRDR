# CloudRDR — Agent Guidelines & Pre-Flight Skill Execution

Whenever you work on this project, adhere strictly to the installed skills and mandatory pre-flight protocol:

## Mandatory Pre-Flight Checklist (Run Before Every Task)

Every time a user provides a prompt or request, internalize these four core foundations before writing code:

### 1. Ponytail — Lazy Senior Dev Mode
- **The best code is the code never written.** Solve the whole problem with the least new code.
- Take the first option that fully works:
  1. Does it need to exist? Skip features, options, and flexibility nobody asked for.
  2. Already in this codebase? Reuse existing helpers, patterns, and conventions.
  3. Standard library or platform feature? Use it.
  4. Installed dependency? Use it before adding new packages.
  5. The shortest working diff wins.
- Never cut: security, error handling, trust boundary validation, tests for non-trivial logic.
- Label any deliberate shortcut with `shortcut: <limit>, <when to upgrade>`.
- End responses with 1–2 lines on what was skipped/unchecked and any risk the user must know.

### 2. Graphify — Architecture & Knowledge Graph
- Knowledge graph resides at `graphify-out/`.
- For codebase and architectural questions:
  - Run `graphify query "<question>"` (CLI) or `query_graph` (MCP).
  - Run `graphify path "<A>" "<B>"` for component relationships.
  - Run `graphify explain "<concept>"` for focused concepts.
- If `graphify-out/wiki/index.md` exists, navigate it first.
- After modifying code files in this session, run `graphify update .` to keep the AST graph current.

### 3. Headroom — Context & Memory Optimization
- Prevent context window bloat.
- Read files with precise line slices (`StartLine`, `EndLine`).
- Never dump megabytes of build or test logs; isolate relevant errors.
- Use `headroom diff`, `headroom sg` (ast-grep), and `headroom loc` (scc) for structural insight.

### 4. Codeburn — Token Spend & Waste Elimination
- Avoid polling loops or repetitive checking steps.
- Prefer surgical edits (`replace_file_content`) over rewriting entire files.
- Run `npx codeburn optimize` to audit token waste and inspect consumption patterns.

---

## Active Skills in `.agents/skills/`
- `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`
- `graphify`
- `headroom`
- `codeburn`
- `design-taste-frontend`, `ui-ux-pro-max`, `high-end-visual-design`, `design-system`, `slides`
