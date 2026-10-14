// Compare models locally through AI Pipe. Usage: AIPIPE_TOKEN=... node tests/compare.mjs gpt-4.1-nano gpt-4.1-mini
import worker from '../src/index.js';
import { mk, EXPECT, SET } from './sheets.mjs';
const kv = () => { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } }; };
for (const model of process.argv.slice(2)) {
  const env = { SIGNING_KEY: 'k', AIPIPE_TOKEN: process.env.AIPIPE_TOKEN, MODEL: model, LIMITS: kv(), IP_DAILY_CAP: '9999', GLOBAL_DAILY_CAP: '9999' };
  let bad = 0; const rows = [];
  for (const id of ['handspan', 'pendulum', 'salt', 'paper', 'sweet']) for (const kind of Object.keys(mk)) {
    const r = await worker.fetch(new Request('https://x/api/verify', { method: 'POST', body: JSON.stringify({ task: id, set: SET, answers: mk[kind](id) }) }), env);
    const j = await r.json(), ok = j.ok && EXPECT[kind](j.level); if (!ok) bad++;
    rows.push(`${id.padEnd(9)} ${kind.padEnd(10)} ${(j.level || j.status || j.error || 'error').toString().slice(0, 12).padEnd(12)} ${ok ? 'ok' : 'UNEXPECTED'}`);
  }
  console.log(`\n== ${model}: ${bad} unexpected of ${rows.length}\n` + rows.join('\n'));
}
