// Compare models locally through AI Pipe. Usage: AIPIPE_TOKEN=... node tests/compare.mjs gpt-4.1-nano gpt-4.1-mini
import worker from '../src/index.js';
import { HONEST } from './fixtures.mjs';
import { mk } from './sheets.mjs';
const models = process.argv.slice(2);
const kv = () => { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } }; };
for (const model of models) {
  const env = { SIGNING_KEY: 'k', AIPIPE_TOKEN: process.env.AIPIPE_TOKEN, MODEL: model, LIMITS: kv(), IP_DAILY_CAP: '9999', GLOBAL_DAILY_CAP: '9999' };
  const tally = {}, rows = [];
  for (const id of Object.keys(HONEST)) for (const kind of Object.keys(mk)) {
    const r = await worker.fetch(new Request('https://x/api/verify', { method: 'POST', body: JSON.stringify({ task: id, answers: mk[kind](id) }) }), env);
    const j = await r.json();
    const per = j.ok ? j.questions.map(q => ({ got_it: 'G', partly: 'P', not_yet: 'N' }[q.level])).join('') : '??';
    rows.push(`${id.padEnd(9)} ${kind.padEnd(9)} ${(j.level || j.status || 'error').padEnd(8)} ${per}`);
    (tally[kind] ||= []).push(j.level || 'error');
  }
  console.log(`\n== ${model}\n` + rows.join('\n'));
  console.log('summary', Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v.join(',')])));
}
