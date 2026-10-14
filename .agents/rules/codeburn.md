---
trigger: always_on
description: Codeburn token spend tracking and waste elimination rules.
---

## Codeburn Token Spend & Waste Elimination

Monitor AI coding spend and eliminate token waste proactively.

Rules:
- Never poll tasks or file status in a busy loop; use reactive notification resumption.
- Prefer precision code edits (`replace_file_content`) over broad file rewrites (`write_to_file`).
- When diagnosing or auditing agent workflows, run `npx codeburn optimize` or `npx codeburn status` to catch token waste early.
- Keep tool inputs and outputs focused on actionable payloads.
