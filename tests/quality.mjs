// Quality check for the real model. Usage: node tests/quality.mjs [base-url]
// Sends labelled sheets (simulated test data) and compares the checker's level with what we expect.
import { HONEST } from './fixtures.mjs';
import { mk } from './sheets.mjs';
const BASE = process.argv[2] || 'https://cbse-homework.cbse-homework-worker.workers.dev';
const EXPECT = { keywords: l => l !== 'got_it', honest: l => l !== 'not_yet', shallow: l => l !== 'got_it', wrong: l => l !== 'got_it', injected: l => l !== 'got_it' };
let fails = 0;
console.log('task      kind      level    ok?  per-question');
for (const id of Object.keys(HONEST)) for (const kind of Object.keys(mk)) {
  const res = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: id, answers: mk[kind](id) }) });
  const j = await res.json();
  if (!j.ok) { console.log(id.padEnd(9), kind.padEnd(9), '(no result)', j.error || j.status); fails++; continue; }
  const ok = EXPECT[kind](j.level), per = j.questions.map(q => ({ got_it: 'G', partly: 'P', not_yet: 'N' }[q.level])).join('');
  if (!ok) fails++;
  console.log(id.padEnd(9), kind.padEnd(9), j.level.padEnd(8), ok ? 'yes ' : 'NO  ', per, j.numbers === 'check' ? '(numbers flagged)' : '');
}
console.log(fails ? `\n${fails} unexpected result(s)` : '\nall results as expected');
process.exit(fails ? 1 : 0);
