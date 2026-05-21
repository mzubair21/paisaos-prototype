#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

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
  try {
    const source = readFileSync(filePath, 'utf8');
    new vm.SourceTextModule(source);
  } catch (error) {
    console.error(`Syntax error in ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

console.log(`Linted ${jsFiles.length} JavaScript files.`);
