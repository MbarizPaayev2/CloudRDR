import fs from 'fs';
import path from 'path';

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.log('Usage: node scripts/skill_router.js "<task description or question>"');
  process.exit(1);
}

const categoriesDir = path.resolve('.agents/categories');

const categoryFolders = fs.readdirSync(categoriesDir).filter(f => {
  const p = path.join(categoriesDir, f);
  return fs.statSync(p).isDirectory();
});

const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

const results = [];

for (const cat of categoryFolders) {
  const readmePath = path.join(categoriesDir, cat, 'README.md');
  if (!fs.existsSync(readmePath)) continue;
  const content = fs.readFileSync(readmePath, 'utf8');

  // Match skills inside category
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('| **')) {
      const match = line.match(/^\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|\s*\[View Skill\]\(([^)]+)\)/);
      if (match) {
        const name = match[1].trim();
        const desc = match[2].trim();
        const link = match[3].trim();
        
        let score = 0;
        for (const tok of tokens) {
          if (name.toLowerCase().includes(tok)) score += 5;
          if (desc.toLowerCase().includes(tok)) score += 2;
          if (cat.toLowerCase().includes(tok)) score += 1;
        }

        if (score > 0) {
          results.push({ name, desc, category: cat, score, link });
        }
      }
    }
  }
}

results.sort((a, b) => b.score - a.score);

console.log(`\n=== Skill Router: Top Recommendations for "${query}" ===\n`);
if (results.length === 0) {
  console.log('No direct match. Recommended general category: 10-frontend-design-taste or 04-security-threat-soc');
} else {
  const top = results.slice(0, 5);
  for (let i = 0; i < top.length; i++) {
    const r = top[i];
    console.log(`${i + 1}. [${r.name}] (Score: ${r.score})`);
    console.log(`   Category: ${r.category}`);
    console.log(`   Description: ${r.desc}`);
    console.log(`   Path: .agents/skills/${r.name}/SKILL.md\n`);
  }
}
