---
trigger: always_on
description: Headroom context optimization and token efficiency rules.
---

## Headroom Context Optimization

Keep LLM context compact, efficient, and informative across all agent interactions.

Rules:
- Never read full large files when only specific functions or blocks are needed. Use targeted line slices.
- Do not repeat file reads in the same session if content has not changed.
- Avoid dumping massive terminal logs into context; isolate relevant errors, failures, and stack traces.
- For structural comparisons, use `headroom diff` or AST inspection (`headroom sg`) when inspecting syntax changes.
- Before complex multi-step refactoring, check available memory and ensure critical context is retained without prompt bloat.
