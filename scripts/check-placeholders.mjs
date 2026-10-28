#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const exts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const ignore = ['node_modules', '.git', 'dist', 'build', 'coverage'];

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full);
    if (ignore.some((i) => rel.includes(i))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, results);
    } else if (exts.includes(path.extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(root);
const found = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('TODO_') && !line.includes("indexOf('TODO_')") && !line.includes('startsWith') && !line.includes('TODO_FACEBOOK') && !line.includes('TODO_INSTAGRAM') && !line.includes('TODO_LINKEDIN') && !line.includes('TODO_TIKTOK') && !line.includes('TODO_YOUTUBE')) {
      found.push({ file: path.relative(root, file), line: idx + 1, text: line.trim() });
    } else if (line.includes('TODO_FREE_DELIVERY_NOTE') || line.includes("address: 'TODO_ADDRESS'") || line.includes("openingHours: 'TODO_HOURS'") || line.includes("about: 'TODO_ABOUT'")) {
      found.push({ file: path.relative(root, file), line: idx + 1, text: line.trim() });
    }
  });
}

if (found.length === 0) {
  console.log('No TODO_ placeholders found.');
  process.exit(0);
} else {
  console.log('Found TODO_ placeholders:');
  for (const f of found) {
    console.log(`${f.file}:${f.line}: ${f.text}`);
  }
  process.exit(1);
}
