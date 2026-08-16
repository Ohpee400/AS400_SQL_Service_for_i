#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const targetDir = args[0] || process.cwd();
const flags = new Set(args.slice(1));

const hasSkills = flags.has('--skills');
const hasLlmsTxt = flags.has('--llms-txt');
const hasSrc = flags.has('--src');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createFile(filePath, content = '') {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// Core directories
ensureDir(path.join(targetDir, '.claude', 'rules'));
ensureDir(path.join(targetDir, '.claude', 'agents'));
ensureDir(path.join(targetDir, '.claude', 'hooks'));
ensureDir(path.join(targetDir, 'specs'));
ensureDir(path.join(targetDir, 'plans'));
ensureDir(path.join(targetDir, 'progress'));
ensureDir(path.join(targetDir, 'docs'));
ensureDir(path.join(targetDir, 'outputs'));
ensureDir(path.join(targetDir, 'temp'));

// Optional: src + tests structure
if (hasSrc) {
  ensureDir(path.join(targetDir, 'src'));
  ensureDir(path.join(targetDir, 'tests', 'unit'));
  ensureDir(path.join(targetDir, 'tests', 'integration'));
  ensureDir(path.join(targetDir, 'tests', 'fixtures'));
}

// Optional: skills
if (hasSkills) {
  ensureDir(path.join(targetDir, '.claude', 'skills'));
}

// Core files (empty)
createFile(path.join(targetDir, 'AGENTS.md'));
createFile(path.join(targetDir, 'CLAUDE.md'));
createFile(path.join(targetDir, '.claude', 'settings.json'), '{\n  "hooks": {}\n}');

// Optional: llms.txt
if (hasLlmsTxt) {
  createFile(path.join(targetDir, 'llms.txt'));
}

console.log('Scaffold complete.');
