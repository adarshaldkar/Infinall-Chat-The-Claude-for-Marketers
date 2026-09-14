import assert from 'node:assert/strict';
import { hashCanonicalArgs } from '../lib/tools/approval/signer';

console.log('--- Running Security Canonical Hashing Suite ---');
const a = { b: 2, a: 1 };
const b = { a: 1, b: 2 };
assert.equal(hashCanonicalArgs(a), hashCanonicalArgs(b));
console.log('✅ [PASS] Canonical JSON argument hashing invariant verified (order-independent)');
