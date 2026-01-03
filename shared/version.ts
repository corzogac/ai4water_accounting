/**
 * Application version and build information
 * This file is automatically updated on each build/deployment
 * Last updated: 2026-01-03 11:01:02 GMT
 */

export const VERSION_INFO = {
  version: '1.0.0',
  buildDate: new Date('2026-01-03T11:01:02.704Z'),
  buildTimestamp: '2026-01-03 11:01:02 GMT',
  gitCommit: '693c0b1',
  gitRepo: 'https://github.com/corzogac/ai4water_accounting',
} as const;

export function getVersionString(): string {
  return `v${VERSION_INFO.version} (${VERSION_INFO.buildTimestamp})`;
}

export function getShortVersionString(): string {
  const date = new Date(VERSION_INFO.buildDate);
  return `v${VERSION_INFO.version} • ${date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
