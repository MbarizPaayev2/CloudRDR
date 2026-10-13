# CloudRDR — Development & Branching Guidelines

**Owner / Role:** Rauf Quliyev (DevOps Lead)  
**Applicability:** All CloudRDR Team Members (Year 3 Capstone)

---

## 1. Branch Strategy

CloudRDR follows a Git feature-branch workflow. Direct pushes to the `main` branch are restricted. All changes must be proposed via Pull Requests.

```
       feature/xyz ──●───●───●
                    /         \  (Pull Request + CI pass)
  main ────────────●───────────▼────────●──────▶
```

### Branch Naming Conventions:

- `feature/<name>` — New feature or service module (e.g. `feature/minio-adapter`, `feature/metrics-table`)
- `fix/<name>` — Bug fix or error resolution (e.g. `fix/canary-regex`, `fix/stream-timeout`)
- `docs/<name>` — Documentation or GRC updates (e.g. `docs/stride-update`, `docs/api-specs`)
- `test/<name>` — New test suites or benchmark experiments (e.g. `test/threshold-sweep`)
- `crypto/<name>` — Cryptography implementations (e.g. `crypto/ed25519-hsm`)

---

## 2. Commit Message Standards

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature or endpoint
- `fix:` A bug fix in existing logic
- `crypto:` Cryptographic algorithm, key management, or audit log update
- `devops:` CI/CD pipeline, Docker, IAM, or deployment configuration
- `test:` Unit, integration, or negative test suite additions
- `docs:` Documentation, README, or GRC document updates
- `refactor:` Code restructuring without behavioral changes

_Example:_ `feat(detection): implement sliding window rate accumulator`

---

## 3. Pre-Push Local Quality Checklist

Before opening a Pull Request, run the local quality suite:

```bash
# 1. Check code formatting
npm run format:check

# 2. Run static analysis (ESLint)
npm run lint

# 3. Execute all unit and integration tests
npm test

# 4. Verify end-to-end simulated attack and recovery
npm run simulate
```

---

## 4. Pull Request Requirements

Every Pull Request must satisfy:

1. **CI Pipeline Passing**: All GitHub Actions matrix checks (Node.js 18, 20, 22 on Ubuntu & Windows) must be green.
2. **Zero Swallowed Exceptions**: All errors must use custom classes from `src/utils/errors.js`.
3. **No Secret Leaks**: Credentials, keys, and tokens must NEVER be committed to Git. `.env` is strictly gitignored.
4. **Documentation Integrity**: Any public function must contain JSDoc type annotations.
