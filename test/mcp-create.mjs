import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../dist/server/index.js';

const dbDir = mkdtempSync(join(tmpdir(), 'plainnote-mcp-'));
const dbPath = join(dbDir, 'test.db');
const staticDir = mkdtempSync(join(tmpdir(), 'plainnote-static-'));

const server = await createServer({
  dbPath,
  staticDir,
  adminPassword: 'test-admin',
});

await server.app.listen({ host: '127.0.0.1', port: 0 });
const address = server.app.server.address();
assert.ok(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;

async function mcp(body, opts = {}) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (opts.allowEmpty) {
    assert.ok(
      res.status === 200 || res.status === 202,
      `unexpected status ${res.status}: ${text}`,
    );
    return text ? JSON.parse(text) : null;
  }
  assert.equal(res.status, 200, `unexpected status ${res.status}: ${text}`);
  return JSON.parse(text);
}

const init = await mcp({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'plainnote-test', version: '0.0.0' },
  },
});
assert.equal(init.result?.serverInfo?.name, 'plainnote');

await mcp(
  {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  },
  { allowEmpty: true },
);

const tools = await mcp({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
});
assert.equal(tools.result.tools.length, 1);
assert.equal(tools.result.tools[0].name, 'create_note');

const created = await mcp({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'create_note',
    arguments: {
      content: 'hello from mcp',
      title: 'mcp smoke',
      format: 'text',
    },
  },
});
assert.equal(created.result?.isError, undefined);
const payload = JSON.parse(created.result.content[0].text);
assert.ok(payload.id);
assert.ok(payload.secret);
assert.match(payload.editUrl, /\/edit\//);
assert.match(payload.noteUrl, /\/note\//);
assert.match(payload.rawUrl, /\/raw\//);

const getRes = await fetch(`${base}/api/notes/${payload.id}`);
assert.equal(getRes.status, 200);
const note = await getRes.json();
assert.equal(note.content, 'hello from mcp');
assert.equal(note.title, 'mcp smoke');

const methodNotAllowed = await fetch(`${base}/mcp`, { method: 'GET' });
assert.equal(methodNotAllowed.status, 405);

await server.close();
rmSync(dbDir, { recursive: true, force: true });
rmSync(staticDir, { recursive: true, force: true });
console.log('mcp-create: ok');
