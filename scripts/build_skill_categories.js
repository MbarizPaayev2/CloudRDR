import fs from 'fs';
import path from 'path';

const skillsDir = path.resolve('.agents/skills');
const categoriesDir = path.resolve('.agents/categories');

if (!fs.existsSync(categoriesDir)) {
  fs.mkdirSync(categoriesDir, { recursive: true });
}

const categoryDefs = [
  {
    id: '01-creative-3d-media',
    title: 'Creative Web, 3D, WebGL & Video Production',
    description: 'Three.js, React Three Fiber, WebGL, WebXR, Spline, Babylon, PixiJS, Manim animated explainers, Remotion, and video creation.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /3d|webgl|threejs|three\.js|r3f|react-three|spline|babylon|pixi|playcanvas|aframe|webxr|manim|video|remotion|blender|substance|gif|render|hyperframes/.test(text);
    }
  },
  {
    id: '02-desktop-mobile-native',
    title: 'Native Mobile & Desktop Applications',
    description: 'macOS Tahoe, Swift 6, iOS Liquid Glass, Android Kotlin Coroutines, Compose, Flutter/Dart, and Windows desktop automation.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /\b(macos|swift|apple|ios|mobile|android|kotlin|flutter|dart|windows-desktop|pywinauto)\b/.test(text);
    }
  },
  {
    id: '03-science-biology-cheminformatics',
    title: 'Bioinformatics, Cheminformatics & Life Sciences',
    description: 'PubChem, ChEMBL, AlphaFold, ClinVar, GTEx, Human Protein Atlas, Europe PMC, arXiv, and genomic databases.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /chembl|pubchem|clinvar|gtex|protein|genom|alphafold|pubmed|arxiv|europepmc|opentargets|biomolecular|uniprot|pdb|foldseek|gget|variant|uspto/.test(text);
    }
  },
  {
    id: '04-security-threat-soc',
    title: 'Cybersecurity, Threat Modeling, SOC & Compliance',
    description: 'OWASP MCP Top 10, penetration testing, threat assessment, vulnerability mitigation, SOC response, HIPAA, and compliance verification.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /security|threat|pentest|vulnerability|owasp|strix|soc|compliance|hipaa|audit|auth|crypto|keccak|hash|ransomware|detector|safe|defense|attack|stride|wcag|prowler|cartography|triage/.test(text);
    }
  },
  {
    id: '05-testing-qa-verification',
    title: 'Testing, Quality Assurance & Formal Verification',
    description: 'Playwright E2E, TDD workflows, unit & integration testing, browser QA, flaky test diagnosis, and benchmark verification.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /test|testing|qa|playwright|tdd|e2e|verify|verification|benchmark|fuzzing|regression|reproduce|canary|gateguard|assert|mock|jest|pytest|vitest|sanitizer/.test(text);
    }
  },
  {
    id: '06-backend-architecture-api',
    title: 'Backend Engineering, APIs & Database Architectures',
    description: 'Go, C/C++, Python, Rust, Node/Bun, PostgreSQL, ClickHouse, MySQL, Redis, REST/gRPC API patterns, and database scaling.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /backend|\bapi\b|database|postgres|mysql|clickhouse|redis|\bsql\b|\bgolang\b|\bgo\b\s+(?:backend|code|service)|python|rust|csharp|dotnet|\bcpp\b|c\+\+|java|django|fastapi|laravel|quarkus|springboot|orm|prisma|hexagonal|architecture|microservice|rest|grpc|\bbun\b|jsonapi|indexing|migration|celery/.test(text);
    }
  },
  {
    id: '07-devops-infra-cloud',
    title: 'DevOps, Cloud Infrastructure & Observability',
    description: 'Kubernetes, Docker, CI/CD pipelines, Terraform, GitOps, Uncloud, AWS FinOps, network diagnostics, and monitoring dashboards.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /devops|infra|cloud|kubernetes|k8s|docker|container|terraform|gitops|uncloud|aws|ci-cd|pipeline|observability|metric|log|trace|prometheus|grafana|dashboard-builder|network|bgp|deploy|vercel|finops/.test(text);
    }
  },
  {
    id: '08-agentic-ai-loops',
    title: 'Autonomous AI Agents, Memory & Token Optimization',
    description: 'Agent harness engineering, multi-agent loops, context budget management, headroom compression, codeburn spend elimination, and eval harnesses.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /agent|harness|loop|autonomous|headroom|codeburn|context|memory|eval|token|llm|prompt|subagent|ponytail|negentropy|cost-aware|output-enforcement|dynamic-workflow|ai-sdk|gh-aw|mcp/.test(text);
    }
  },
  {
    id: '09-content-seo-marketing',
    title: 'Content Strategy, Search/Answer Engines (SEO/AEO) & Growth',
    description: 'Answer Engine Optimization (AEO), technical SEO, programmatic content engines, copywriting, CRO, and growth ops.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /seo|aeo|content|marketing|serp|keyword|copywriting|cro|growth|crosspost|lead|social|email|investor|pitch|slides|article|headline|backlink|churn/.test(text);
    }
  },
  {
    id: '10-frontend-design-taste',
    title: 'Frontend Engineering, Design Systems & Taste Skills',
    description: 'Anti-slop UI craft, Taste Skill suite, typography, bento grids, Motion/GSAP animations, Tailwind, Radix/shadcn, and redesign audits.',
    match: (name, desc) => {
      const n = name.toLowerCase();
      if (/taste|redesign|minimalist-ui|industrial-brutalist|brandkit|image-to-code|high-end-visual|stitch-design/.test(n)) return true;
      const text = `${name} ${desc}`.toLowerCase();
      return /design|taste|frontend|ui|css|tailwind|style|typography|font|motion|animation|framer|gsap|anime|redesign|minimalist|brutalist|visual|theme|brand|interface|button|layout|bento|canvas|vue|react|angular|component|color|html|make-interfaces|baseline|nextjs|zustand|zod|tour/.test(text);
    }
  },
  {
    id: '11-developer-tooling-workflow',
    title: 'Developer Tooling, Knowledge Bases & Git Workflows',
    description: 'Git operations, PR authoring, conventional commits, Obsidian knowledge bases, documentation lookup, and terminal automation.',
    match: (name, desc) => {
      const text = `${name} ${desc}`.toLowerCase();
      return /git|commit|pr|pull-request|obsidian|doc|documentation|terminal|cli|tool|rule|skill-scout|skill-creator|understand|code-review|typescript|turborepo|sync|changelog|readme/.test(text);
    }
  }
];

const allSkills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

const parsedSkills = allSkills.map(skillName => {
  const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
  let desc = '';
  if (fs.existsSync(skillPath)) {
    const raw = fs.readFileSync(skillPath, 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const lines = fmMatch[1].split('\n');
      let inDesc = false;
      for (const line of lines) {
        if (/^description:\s*/.test(line)) {
          desc = line.replace(/^description:\s*/, '').trim();
          if (desc === '>' || desc === '|' || desc === '|-' || desc === '>-') {
            desc = '';
          }
          inDesc = true;
        } else if (inDesc) {
          if (/^[a-zA-Z0-9_-]+:/.test(line)) {
            inDesc = false;
          } else {
            desc += ' ' + line.trim();
          }
        }
      }
    }
    desc = desc.trim().replace(/\s+/g, ' ');
  }
  return { name: skillName, desc, path: skillPath };
});

const categorized = {};
for (const cat of categoryDefs) {
  categorized[cat.id] = [];
}
categorized['11-specialized-domains'] = [];

for (const s of parsedSkills) {
  let placed = false;
  // Explicit priority for Taste & Design Skills suite
  if (/taste|redesign|minimalist|brutalist|brandkit|image-to-code|high-end-visual|stitch-design|tailwind-design|typography/.test(s.name.toLowerCase())) {
    categorized['10-frontend-design-taste'].push(s);
    placed = true;
    continue;
  }
  for (const cat of categoryDefs) {
    if (cat.match(s.name, s.desc)) {
      categorized[cat.id].push(s);
      placed = true;
      break;
    }
  }
  if (!placed) {
    categorized['11-specialized-domains'].push(s);
  }
}

// Generate Category directories and README files
for (const cat of categoryDefs) {
  const catFolder = path.join(categoriesDir, cat.id);
  if (!fs.existsSync(catFolder)) {
    fs.mkdirSync(catFolder, { recursive: true });
  }

  const items = categorized[cat.id];
  let md = `# Category: ${cat.title}\n\n`;
  md += `**Description:** ${cat.description}\n\n`;
  md += `**Total Skills:** ${items.length}\n\n`;
  md += `## Included Skills & Trigger Protocols\n\n`;
  md += `| Skill Name | Description | Link |\n`;
  md += `| :--- | :--- | :--- |\n`;

  for (const item of items) {
    const relLink = `../../skills/${item.name}/SKILL.md`;
    md += `| **${item.name}** | ${item.desc.replace(/\|/g, '\\|') || 'No description'} | [View Skill](${relLink}) |\n`;
  }

  fs.writeFileSync(path.join(catFolder, 'README.md'), md, 'utf8');
}

// Specialized category
const specFolder = path.join(categoriesDir, '11-specialized-domains');
if (!fs.existsSync(specFolder)) fs.mkdirSync(specFolder, { recursive: true });
const specItems = categorized['11-specialized-domains'];
let specMd = `# Category: Specialized Domains & Workflows\n\n`;
specMd += `**Description:** Life sciences, legal agreements, trade compliance, logistics, and domain-specific workflows.\n\n`;
specMd += `**Total Skills:** ${specItems.length}\n\n`;
specMd += `| Skill Name | Description | Link |\n| :--- | :--- | :--- |\n`;
for (const item of specItems) {
  specMd += `| **${item.name}** | ${item.desc.replace(/\|/g, '\\|') || 'Specialized domain workflow'} | [View Skill](../../skills/${item.name}/SKILL.md) |\n`;
}
fs.writeFileSync(path.join(specFolder, 'README.md'), specMd, 'utf8');

// Master Catalog
let master = `# Master Skills Directory & Categorized Routing Index\n\n`;
master += `Total Installed Skills: **${parsedSkills.length}** across **11 Core Domains**.\n\n`;
master += `## Category Routing Map\n\n`;

for (const cat of categoryDefs) {
  const count = categorized[cat.id].length;
  master += `### [${cat.title}](./${cat.id}/README.md) (${count} skills)\n`;
  master += `> ${cat.description}\n\n`;
  master += `**Primary Recommended Skills:**\n`;
  const topSkills = categorized[cat.id].slice(0, 8).map(s => `\`${s.name}\``).join(', ');
  master += `${topSkills}\n\n`;
}

master += `### [Specialized Domains & Workflows](./11-specialized-domains/README.md) (${specItems.length} skills)\n`;
master += `> Specialized niche workflows including life sciences, legal contracts, logistics, and domain automation.\n\n`;

fs.writeFileSync(path.join(categoriesDir, 'MASTER_CATALOG.md'), master, 'utf8');
fs.writeFileSync(path.join(categoriesDir, 'INDEX.md'), master, 'utf8');

console.log('Successfully generated categorized directory structure and master catalogs.');
for (const [k, v] of Object.entries(categorized)) {
  console.log(k.padEnd(35), v.length);
}
