import assert from 'node:assert/strict';
import { isNewerVersion, shouldSkipUpdateCheck } from '../dist/update-check.js';

assert.equal(isNewerVersion('0.1.5', '0.1.4'), true);
assert.equal(isNewerVersion('0.2.0', '0.1.9'), true);
assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
assert.equal(isNewerVersion('0.1.4', '0.1.4'), false);
assert.equal(isNewerVersion('0.1.3', '0.1.4'), false);
assert.equal(isNewerVersion('0.1.5-beta', '0.1.4'), true);
assert.equal(isNewerVersion('not-a-version', '0.1.4'), false);
assert.equal(isNewerVersion('0.1.5', 'bad'), false);

assert.equal(shouldSkipUpdateCheck({ PLAINNOTE_NO_UPDATE: '1' }), true);
assert.equal(shouldSkipUpdateCheck({ PLAINSHARE_NO_UPDATE: '1' }), true);
assert.equal(shouldSkipUpdateCheck({ CI: 'true' }), true);
assert.equal(shouldSkipUpdateCheck({ npm_config_update_notifier: 'false' }), true);
assert.equal(shouldSkipUpdateCheck({}), false);

console.log('update-check: ok');
