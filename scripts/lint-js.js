#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.log('No lint targets provided.');
  process.exit(0);
}

const jsFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath);
    if (stat.isFile() && fullPath.endsWith('.js')) jsFiles.push(fullPath);
  }
};

for (const target of targets) {
  const fullTarget = resolve(process.cwd(), target);
  try {
    if (statSync(fullTarget).isDirectory()) walk(fullTarget);
    if (statSync(fullTarget).isFile() && fullTarget.endsWith('.js')) jsFiles.push(fullTarget);
  } catch {
    console.warn(`Skipping missing target: ${target}`);
  }
}

for (const filePath of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', filePath], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `Syntax check failed for ${filePath}\n`);
    process.exit(1);
  }
}

console.log(`Linted ${jsFiles.length} JavaScript files.`);
