---
name: codeburn
description: "AI coding token usage monitor, spend tracker, token waste optimizer, and budget auditor. Use to inspect where tokens go, find token waste, get exact optimizations, track per-tool spend, and install agent telemetry hooks."
---

# Codeburn — AI Spend & Token Waste Optimization

Codeburn monitors AI coding token consumption, tracks costs across models and tools, and pinpoints exact token waste with automated fixes.

## Commands & Usage

```bash
# Analyze recent AI coding sessions for token waste and get actionable fixes
npx codeburn optimize

# Quick summary of today's and this month's token spend
npx codeburn status

# Full interactive terminal dashboard
npx codeburn report

# Plain-text copy-pasteable usage overview
npx codeburn overview

# Context token breakdown per session (inspect what fills the context window)
npx codeburn context

# Run MCP server exposing token usage & metrics to AI agents
npx codeburn mcp

# Audit token usage vs provider bills
npx codeburn audit

# Set spend budget limits
npx codeburn budget

# Install Antigravity CLI usage capture hook
npx codeburn antigravity-hook install
```

## Agent Guidelines for Token Waste Elimination

1. **Eliminate Polling Loops**: Never poll or loop checking command outputs or file status. Let the system resume automatically.
2. **Eliminate Repetitive Scans**: Cache or summarize file structures instead of executing full filesystem scans in loops.
3. **Prevent Excessive Context Ballooning**: Truncate noisy build logs or stack traces to only the relevant failing frames.
4. **Targeted Diffs**: Favor small, surgical file edits (`replace_file_content`) over rewriting entire files with `write_to_file`.
5. **Periodic Optimization Check**: When completing major tasks or refactors, run `npx codeburn optimize` or `npx codeburn status` to monitor token footprint.
