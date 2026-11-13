import assert from 'node:assert/strict';
import { normalizeVercelRequestUrl } from '../dist/server/vercel-handler.js';

assert.equal(normalizeVercelRequestUrl('/api/notes'), '/api/notes');
assert.equal(normalizeVercelRequestUrl('/api/notes/abc'), '/api/notes/abc');
assert.equal(normalizeVercelRequestUrl('/api/raw/abc'), '/raw/abc');
assert.equal(normalizeVercelRequestUrl('/api/raw/abc?x=1'), '/raw/abc?x=1');
assert.equal(normalizeVercelRequestUrl('/api/raw'), '/raw');
assert.equal(normalizeVercelRequestUrl(undefined), '/');

// Full public path must not be overwritten by function-entry headers.
assert.equal(
  normalizeVercelRequestUrl('/api/notes/abc', { 'x-invoke-path': '/api' }),
  '/api/notes/abc',
);

// When rewrite collapses to /api, restore from forwarded URI.
assert.equal(
  normalizeVercelRequestUrl('/api', { 'x-forwarded-uri': '/api/notes/abc' }),
  '/api/notes/abc',
);
assert.equal(
  normalizeVercelRequestUrl('/api', { 'x-forwarded-uri': '/raw/xyz' }),
  '/raw/xyz',
);
assert.equal(
  normalizeVercelRequestUrl('/api', { 'x-forwarded-uri': '/mcp' }),
  '/mcp',
);

console.log('vercel-url: ok');
