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

## Active Skills in `.agents/skills/` (120 Installed Skills)

### 1. Motion, Framer Motion & Animation Engines (23 Skills)

- `motion-framer`: Modern animation library for React/JS (Motion v11+ / Framer Motion): variants, gestures (whileHover, whileTap, whileDrag), layout animations, AnimatePresence, springs, and scroll effects
- `gsap-scrolltrigger`: GreenSock Animation Platform with ScrollTrigger: timelines, pinning, scrubbing, and scroll-driven choreography
- `animejs`: Lightweight JavaScript animation engine for DOM, CSS, SVG path morphing, and staggered sequences
- `react-spring-physics`: Physics-based spring animations with natural inertia, gesture velocity, and reactive streams
- `delphi-animate`: Animation patterns and best practices for Next.js/React (Emil Kowalski "Animations on the Web")
- `design-motion-principles`: Motion and interaction design expert (Emil Kowalski, Jakub Krehel, Jhey Tompkins lenses)
- `emil-animate`: Build animations from scratch (intent, properties, curve, duration, interruptibility)
- `emil-animate-expo`: React Native / Expo gesture, sheet, and screen transitions with Reanimated and Gesture Handler
- `emil-animation-performance`: 60/120fps motion profiling, off-main-thread execution, and stutter elimination
- `emil-animation-vocabulary`: Reverse-lookup glossary translating motion effects into exact technical terms
- `emil-apple-design`: Apple interface design, fluid physical motion, spring physics, translucent materials, optical sizing
- `emil-find-animation-opportunities`: Audit UI to find components that should animate with exact values
- `emil-improve-animations`: Survey codebase animations and generate prioritized implementation plans
- `emil-mobile-native`: Native mobile interface patterns, touch targets, and tactile physics
- `emil-review-animations`: In-depth critique of existing animations and transitions
- `claude-animation`: Animation engineering and motion workflows for modern web applications
- `animated-component-libraries`: Integration with Radix UI, Headless UI, shadcn/ui, and accessible animated primitives
- `lottie-animations`: After Effects JSON vector animation rendering for web and React
- `rive-interactive`: State-machine vector animations with runtime interactivity and two-way data binding
- `barba-js`: Fluid, smooth SPA-style page and route transitions
- `locomotive-scroll`: Smooth scrolling, parallax effects, and viewport detection
- `scroll-reveal-libraries`: Lightweight scroll reveal animations using AOS (Animate On Scroll)
- `awesome-claude-video-skills`: Curated directory and best practices for video, motion graphics, and Remotion/HyperFrames

### 2. Frontend Engineering, Design Systems & Visual Craft (36 Skills)

- `impeccable`: Peak design director craft, zero-slop UI, bounded iteration, and uncompromising aesthetics
- `frontend-design`: Intentional visual design, typography, layout, and distinctive creative direction
- `modern-web-design`: Modern web design guidelines, responsive grids, balanced whitespace, and contemporary patterns
- `awesome-design-md`: 80+ DESIGN.md design system specifications from top tech companies (Vercel, Linear, Cursor, Stripe)
- `stitch-design-taste`: Semantic Design System skill generating agent-friendly DESIGN.md files with calibrated colors and micro-motion
- `design-taste-frontend`: Anti-slop frontend rules for landing pages, dashboards, and redesigns (v2 default)
- `design-taste-frontend-v1`: Original v1 taste-skill for exact backward compatibility
- `design-taste-frontend-v2-experimental`: Old experimental single-file dial-driven taste skill
- `ui-ux-pro-max`: UI/UX design intelligence (79 styles, 192 product palettes, 74 font pairings, 119 UX guidelines)
- `high-end-visual-design`: Premium agency-grade aesthetics, typography scales, card elevation, and visual hierarchy
- `minimalist-ui`: Warm monochrome palettes, typographic contrast, flat bento grids, and muted tones
- `industrial-brutalist-ui`: Swiss typographic print meets military terminal aesthetics, rigid grids, and high contrast
- `gpt-taste`: Editorial typography, gapless bento grids, strict AIDA structure, and massive section spacing
- `design-system`: Three-layer design tokens (primitive -> semantic -> component) and component specs
- `tailwind-design-system`: Scalable Tailwind CSS design system architectures and component token patterns
- `typography`: Font selection, vertical rhythm, modular scales, optical sizing, and letter spacing
- `ui-skills`: Accessible UI recipes, motion components, and component canvas exploration by ibelick / motion-primitives
- `ui-ux-designer`: Interface wireframes, user journeys, accessibility standards, and component libraries
- `bencium-controlled-ux-designer`: Expert UI/UX design guidance for unique, accessible interfaces
- `bencium-impact-designer`: Create distinctive, production-grade frontend interfaces with high design quality
- `bencium-innovative-ux-designer`: Innovative interaction paradigms and bespoke UI architectures
- `design-audit`: Comprehensive visual, architectural, and component design audit
- `web-artifacts-builder`: Multi-component HTML/React/Tailwind artifacts with state management and shadcn/ui
- `theme-factory`: Theme engine with 10 pre-set enterprise palettes and custom theme generation
- `brand-guidelines`: Anthropic official brand standards, colors, and typography
- `brandkit`: Premium identity boards, logo systems, and visual presentation decks
- `image-to-code`: Precision website image-to-code implementation without generic card nesting
- `imagegen-frontend-web`: Generative visual assets and hero imagery for web interfaces
- `imagegen-frontend-mobile`: Generative UI assets and visual mockups for mobile apps
- `redesign-existing-projects`: Upgrade existing websites to premium quality without breaking functionality
- `relationship-design`: AI-first interfaces building memory, trust evolution, and collaborative interaction
- `emil-ask-sonner`: Toast and notification architecture with Sonner
- `emil-break-ui`: Stress-testing UI components with worst-case data (overflow, edge cases, unicode)
- `emil-emil-design-eng`: Invisible details, polish, component feel, and micro-interactions
- `emil-pick-ui-library`: Pragmatic UI library evaluation and component selection
- `emil-prototype`: Rapid interactive prototyping with high visual fidelity

### 3. 3D Web, WebGL, WebXR & Creative Engineering (12 Skills)

- `threejs-webgl`: Full Three.js 3D development: scenes, cameras, lighting, PBR materials, shaders, and rendering
- `react-three-fiber`: Declarative 3D scenes with React Three Fiber (R3F) for configurators and immersive web apps
- `web3d-integration-patterns`: Multi-library orchestration combining Three.js, GSAP, R3F, Motion, and React Spring
- `spline-interactive`: 3D interactive scenes, visual editor workflows, and React Spline embedding
- `babylonjs-engine`: Real-time 3D games, physics simulations, and WebGL/WebGPU rendering
- `playcanvas-engine`: Lightweight entity-component WebGL/WebGPU game engine
- `aframe-webxr`: Declarative entity-component HTML framework for WebXR, VR, and AR experiences
- `pixijs-2d`: Ultra-fast 2D WebGL/WebGPU sprite rendering and particle systems
- `lightweight-3d-effects`: Micro-interactions and pseudo-3D using Zdog, Vanta.js, and Vanilla-Tilt.js
- `blender-web-pipeline`: glTF export workflows, bpy scripting, model compression, and web optimization
- `substance-3d-texturing`: PBR material creation, texture baking, and real-time engine export
- `algorithmic-art`: Generative art, particle flow fields, and seeded randomness with p5.js

### 4. Security, Threat Modeling, Pentesting & Compliance (14 Skills)

- `strix-managed-pentesting-with-strix`: Automated security audits, cloud pentesting, and remediation with Strix
- `strix-web-app-penetration-testing`: End-to-end black-box web app testing (auth bypass, IDOR, injection, SSRF, XSS)
- `strix-api-security-testing`: REST and GraphQL API vulnerability discovery and exploitation
- `strix-application-security-testing`: Full-stack application security assessment and vulnerability validation
- `strix-ci-security-scanning-with-strix`: Continuous security integration and automated PR scanning
- `strix-find-security-vulnerabilities-in-code`: Static and dynamic code analysis for exploitable vulnerabilities
- `strix-fix-security-vulnerabilities-with-strix`: Triage findings, patch root causes, and verify remediation proofs
- `strix-owasp-top-10-testing`: OWASP Top 10 automated test suites and compliance verification
- `strix-penetration-testing-with-strix`: Autonomous agent-driven penetration testing workflows
- `security-auditor`: Comprehensive cybersecurity, DevSecOps, OAuth2/OIDC, and compliance (GDPR/HIPAA/SOC2)
- `threat-modeling-expert`: Threat assessment methodologies (STRIDE, PASTA, attack trees, security requirements)
- `cloudflare-security-audit`: Infrastructure and API edge security review, WAF, and DDoS resilience
- `wcag-audit-patterns`: WCAG 2.2 accessibility audits (levels A, AA, AAA), automated and manual verification
- `eu-ai-act-reviewer`: EU AI Act classification, risk assessment, transparency, and compliance checklists

### 5. Testing, Verification, Performance & Framework Best Practices (14 Skills)

- `webapp-testing`: Browser-based verification, screenshot capture, and frontend debugging with Playwright
- `playwright-dev`: Playwright development, API extensions, MCP tools, and CLI commands
- `playwright-test-results`: Query Playwright CI test results and flaky tests from aggregated DuckDB database
- `playwright-triage`: Triage and reproduce GitHub bug reports from issues
- `playwright-cherry-pick`: Cherry-pick and isolate commits for Playwright test fixes
- `playwright-devops`: DevOps workflows for Playwright, CI failure analysis, and release operations
- `react-best-practices`: React and Next.js performance optimization guidelines from Vercel Engineering
- `composition-patterns`: Scalable React composition, compound components, and render props (React 19 ready)
- `react-view-transitions`: Modern React View Transitions API for fluid route and state morphing
- `vercel-optimize`: Vercel hosting, edge compute, bundle size, function invocations, and cost minimization
- `web-design-guidelines`: Web interface guidelines compliance, accessibility, and UX review
- `vanity-engineering-review`: Pragmatic code review eliminating unnecessary abstraction and premature optimization
- `bencium-code-conventions`: Strict engineering conventions, clean tech stack, and idiomatic patterns
- `emil-write-swift`: Modern Swift 6 concurrency, actor safety, and performance patterns

### 6. Core Foundations, Architecture & Engineering Efficiency (21 Skills)

- `ponytail`: Lazy senior dev mode: the smallest change that fully solves the task
- `ponytail-audit`: Quality audit of a whole repo: bugs, load limits, bloat, and deletion candidates
- `ponytail-debt`: Audit shortcut comments and list deferred technical debt ledger
- `ponytail-gain`: Measured savings (code, cost, speed) benchmark display
- `ponytail-help`: Quick reference for ponytail levels, skills, and commands
- `ponytail-review`: Quality review of changes against safety, load, tests, and necessity
- `graphify`: Knowledge graph querying (graphify query/path/explain) and AST graph maintenance
- `headroom`: Context window compression, precision line slicing, and memory waste elimination
- `codeburn`: AI coding token usage monitor, spend tracking, and waste elimination
- `human-architect-mindset`: Domain modeling, systems thinking, constraint navigation, and AI-aware problem decomposition
- `renaissance-architecture`: First-principles software architecture and innovative product formulation
- `negentropy-lens`: Reducing system chaos, structural debt, and entropy across complex codebases
- `adaptive-communication`: Context-aware user alignment, intent disambiguation, and tailored delivery
- `full-output-enforcement`: Complete code generation without placeholders, truncation, or lazy omissions
- `mcp-builder`: Model Context Protocol server creation in Python (FastMCP) and TypeScript
- `perplexity-ask`: Perplexity AI web search and deep reasoning integration
- `skill-creator`: Design, benchmark, eval, and optimize custom agent skills
- `slides`: Strategic executive presentation decks with Chart.js and token architectures
- `bencium-aeo`: Answer Engine Optimization for AI citations (ChatGPT, Claude, Gemini, AI Overviews)
- `hungarian-humanizer`: Natural language localization and AI marker elimination
- `insurgent-campaign`: Strategic project execution and high-momentum milestones
