---
name: headroom
description: "Context optimization, token compression, memory management, and token savings for AI coding agents. Run the optimization proxy, audit read-tool traffic, track token savings, and keep context window efficient."
---

# Headroom — Context Optimization Layer

Headroom optimizes and compresses LLM context for AI agents, saving tokens and fitting more into every context window.

## Core Capabilities

- **Context Compression**: Intelligently compresses large tool outputs, file reads, and prompt histories without losing critical facts or error traces.
- **Agent Memory**: Durable cross-session memory for agent learning and context retrieval.
- **Read Traffic Audit**: Audits read-tool payloads for compression opportunities.
- **Structural Analysis**: Bundled AST grep (`headroom sg`), structural diffing (`headroom diff`), and repo shape probing (`headroom loc`).

## Commands & Usage

```bash
# Run local optimization proxy
headroom proxy

# Show token compression savings over time
headroom savings

# Inspect original vs compressed content for recent proxy requests
headroom inspect

# Audit Read-tool traffic for compression opportunities
headroom audit-reads

# Memory management
headroom memory list
headroom memory stats

# Fast codebase probes
headroom loc        # Lines of code & file distribution (scc)
headroom diff       # Structural syntax-aware diff (difftastic)
headroom sg <query> # AST structural pattern search (ast-grep)

# Learn from past failures
headroom learn
```

## Agent Guidelines for Context Optimization

1. **Targeted Reading**: Always use slice notation (`StartLine`, `EndLine`) when reading files rather than reading entire large files.
2. **Avoid Redundant Context**: Never re-read a file that hasn't changed during the session.
3. **Concise Tool Payloads**: Keep script outputs, logs, and grep outputs compact. Avoid dumping megabytes of logs into context.
4. **Durable Knowledge**: Important discoveries should be recorded in persistent docs or memory rather than continually reprompted.
