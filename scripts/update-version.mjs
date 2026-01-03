#!/usr/bin/env node

/**
 * Update version.ts with current build timestamp
 * Run this script before each deployment to update the version info
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const versionFile = join(projectRoot, 'shared', 'version.ts');

// Get current git commit hash
let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.warn('Could not get git commit hash:', error.message);
}

// Get current timestamp
const now = new Date();
const buildTimestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' GMT';

// Read package.json for version
let version = '1.0.0';
try {
  const packageJson = JSON.parse(
    execSync('cat package.json', { encoding: 'utf-8', cwd: projectRoot })
  );
  version = packageJson.version || '1.0.0';
} catch (error) {
  console.warn('Could not read version from package.json');
}

const versionContent = `/**
 * Application version and build information
 * This file is automatically updated on each build/deployment
 * Last updated: ${buildTimestamp}
 */

export const VERSION_INFO = {
  version: '${version}',
  buildDate: new Date('${now.toISOString()}'),
  buildTimestamp: '${buildTimestamp}',
  gitCommit: '${gitCommit}',
  gitRepo: 'https://github.com/corzogac/ai4water_accounting',
} as const;

export function getVersionString(): string {
  return \`v\${VERSION_INFO.version} (\${VERSION_INFO.buildTimestamp})\`;
}

export function getShortVersionString(): string {
  const date = new Date(VERSION_INFO.buildDate);
  return \`v\${VERSION_INFO.version} • \${date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}\`;
}
`;

writeFileSync(versionFile, versionContent, 'utf-8');

console.log('✅ Version updated successfully');
console.log(`   Version: ${version}`);
console.log(`   Commit: ${gitCommit}`);
console.log(`   Timestamp: ${buildTimestamp}`);
