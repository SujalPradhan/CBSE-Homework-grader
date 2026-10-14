// Quality check against the live (or local) checker. Usage: node tests/quality.mjs [base-url]
import { honest } from './fixtures.mjs';
import { mk, EXPECT, SET } from './sheets.mjs';
const BASE = process.argv[2] || 'https://cbse-homework.cbse-homework-worker.workers.dev';
let fails = 0;
console.log('task      kind       level    ok?  per-item');
for (const id of Object.keys({ handspan: 1, pendulum: 1, salt: 1, paper: 1, sweet: 1 })) for (const kind of Object.keys(mk)) {
  const res = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: id, set: SET, answers: mk[kind](id) }) });
  const j = await res.json();
  if (!j.ok) { console.log(id.padEnd(9), kind.padEnd(10), '(no result)', j.error || j.status); fails++; continue; }
  const ok = EXPECT[kind](j.level), per = j.questions.map(q => ({ got_it: 'G', partly: 'P', not_yet: 'N' }[q.level])).join('');
  if (!ok) fails++;
  console.log(id.padEnd(9), kind.padEnd(10), j.level.padEnd(8), ok ? 'yes ' : 'NO  ', per);
}
console.log(fails ? `\n${fails} unexpected result(s)` : '\nall results as expected');
process.exit(fails ? 1 : 0);
