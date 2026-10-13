// End-to-end: node tests/e2e.mjs [base-url]
import assert from 'node:assert/strict';
import { sunElevation, CITIES } from '../src/tasks.js';
const B = process.argv[2] || 'http://localhost:8787';
const PIN = roll => String(1000 + Number(roll));
const get = async p => { const m = p.match(/roll=(\d+)/); if (m && !/pin=/.test(p)) p += `&pin=${PIN(m[1])}`; const r = await fetch(B + p); return [r.status, await r.json()]; };
const post = async (p, b) => { if (b.roll && !b.pin && p !== '/api/reset') b = { ...b, pin: PIN(b.roll) }; const r = await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json()]; };
const log = (m) => console.log('✓', m);

const [, cls] = await post('/api/class', { name: 'Test 7B', size: 6 }); const C = cls.code, K = cls.key;
log(`class ${C} created`);
const H = 'g6-sci-handspan', good = { hs1: 16, n1: 9.5, hs2: 21, n2: 7, L: 150 };
let [s, r] = await post('/api/submit', { class: C, roll: 1, task: H, values: good });
assert.equal(s, 400); assert.match(r.error, /prediction/); log('submit before prediction is refused');
[s] = await post('/api/predict', { class: C, roll: 1, task: H, value: 'Me' }); assert.equal(s, 200);
[s] = await post('/api/predict', { class: C, roll: 1, task: H, value: 'The adult' }); assert.equal(s, 409); log('prediction is locked');
[s] = await post('/api/predict', { class: C, roll: 9, task: H, value: 'Me' }); assert.equal(s, 400); log('roll outside class size refused');
[s, r] = await post('/api/submit', { class: C, roll: 1, task: H, values: good }); assert.equal(r.ok, true); log('honest submission accepted');
await post('/api/predict', { class: C, roll: 2, task: H, value: 'Me' });
[s, r] = await post('/api/submit', { class: C, roll: 2, task: H, values: good }); assert.equal(r.ok, true);
await post('/api/predict', { class: C, roll: 3, task: H, value: 'Same' });
for (let i = 0; i < 5; i++) { [s, r] = await post('/api/submit', { class: C, roll: 3, task: H, values: { ...good, n1: 3 + i } }); assert.equal(r.ok, false); assert.ok(!JSON.stringify(r).includes('150 /')); }
[s] = await post('/api/submit', { class: C, roll: 3, task: H, values: good }); assert.equal(s, 429); log('5 wrong attempts, then locked out (no answer leaked)');
[s] = await get(`/api/pool?class=${C}&task=${H}`); assert.equal(s, 403); log('class results hidden before teacher reveals');
[s] = await post('/api/reveal', { class: C, key: 'WRONG', task: H }); assert.equal(s, 403);
[s] = await post('/api/reveal', { class: C, key: K, task: H }); assert.equal(s, 200);
[s, r] = await get(`/api/pool?class=${C}&task=${H}`); assert.equal(r.values.length, 2); assert.equal(r.predictions.length, 3); log('pool visible after reveal');
[s, r] = await get(`/api/dash?class=${C}&key=${K}`);
const hrows = r.tasks.find(t => t.id === H).rows;
assert.match(hrows.find(x => x.roll === 1).flags.join(), /roll 2/); assert.equal(hrows.find(x => x.roll === 3).attempts, 5); log('dashboard flags identical submissions (rolls 1 & 2)');
assert.match(hrows.find(x => x.roll === 1).flags.join(), /min after predicting/); log('dashboard flags finishing within minutes of predicting');
assert.match(hrows.find(x => x.roll === 3).flags.join(), /Out of tries/); log('dashboard flags out-of-tries');
assert.ok(!('hs2' in r.tasks[0]) && !JSON.stringify((await get(`/api/pool?class=${C}&task=${H}`))[1]).includes('"n1"')); log('pool shows only summaries, not raw inputs');
// wrong PIN, then teacher reset
[s, r] = await post('/api/predict', { class: C, roll: 3, pin: '9999', task: 'g7-sci-pendulum', value: 'Double' }); assert.equal(s, 403); log('someone else cannot use a claimed roll number');
for (let i = 0; i < 12; i++) [s] = await post('/api/predict', { class: C, roll: 3, pin: String(2000 + i), task: H, value: 'Me' });
assert.equal(s, 429); log('PIN guessing locks the roll after 10 wrong PINs');
[s] = await post('/api/reset', { class: C, key: K, roll: 3 }); assert.equal(s, 200);
[s] = await post('/api/predict', { class: C, roll: 3, pin: '9999', task: H, value: 'Me' }); assert.equal(s, 200); log('teacher reset frees the roll (tries and PIN cleared)');
// typos are free
[s, r] = await post('/api/submit', { class: C, roll: 3, pin: '9999', task: H, values: { ...good, hs1: 5 } }); assert.equal(r.free, true); assert.equal(r.left, 5); log('out-of-range typo does not cost a try');
// near-copy
await post('/api/predict', { class: C, roll: 4, task: 'g7-sci-pendulum', value: 'Double' }); await post('/api/predict', { class: C, roll: 5, task: 'g7-sci-pendulum', value: 'Double' });
await post('/api/submit', { class: C, roll: 4, task: 'g7-sci-pendulum', values: { L1: 25, t1: 10.2, L2: 100, t2: 20.1 } });
await post('/api/submit', { class: C, roll: 5, task: 'g7-sci-pendulum', values: { L1: 25, t1: 10.3, L2: 100, t2: 20.1 } });
[, r] = await get(`/api/dash?class=${C}&key=${K}`);
assert.match(r.tasks.find(t => t.id === 'g7-sci-pendulum').rows.find(x => x.roll === 5).flags.join(), /Almost the same numbers as roll 4/); log('near-copies are flagged (within 2%)');
[s] = await get(`/api/dash?class=${C}&key=nope`); assert.equal(s, 403);

// personalised paper stacks
const P = 'g7-math-paper';
const [, s1] = await get(`/api/status?class=${C}&roll=1&task=${P}`), [, s2] = await get(`/api/status?class=${C}&roll=2&task=${P}`);
assert.notDeepEqual(s1.task.personal, s2.task.personal); log(`paper stacks differ per student: ${JSON.stringify(s1.task.personal)} vs ${JSON.stringify(s2.task.personal)}`);
await post('/api/predict', { class: C, roll: 1, task: P, value: '0.1' });
const { a, b } = s1.task.personal, hb = +(b * 0.09).toFixed(1);
[s, r] = await post('/api/submit', { class: C, roll: 1, task: P, values: { ha: +(a * 0.09).toFixed(1), hb, t: +(hb / b).toFixed(3) } }); assert.equal(r.ok, true, JSON.stringify(r)); log('paper honest accepted');

// shadow with real sun position, yesterday 10:00 IST in Pune
const S = 'g8-math-shadow', d = new Date(Date.now() - 86400e3 + 5.5 * 3600e3).toISOString().slice(0, 10), when = `${d}T10:00`;
const el = sunElevation(...CITIES.Pune, Date.parse(when + ':00+05:30')), k = Math.tan(el * Math.PI / 180);
const v = { sh: 100, ss: Math.round(100 / k), ds: Math.round(205 / k) }; v.dcalc = Math.round(v.ds * v.sh / v.ss); v.dreal = 203;
await post('/api/predict', { class: C, roll: 1, task: S, value: '210' });
[s, r] = await post('/api/submit', { class: C, roll: 1, task: S, values: v, city: 'Pune', when }); assert.equal(r.ok, true, JSON.stringify(r));
await post('/api/predict', { class: C, roll: 2, task: S, value: '200' });
[s, r] = await post('/api/submit', { class: C, roll: 2, task: S, values: v, city: 'Pune', when: `${d}T15:30` }); assert.equal(r.ok, false); log('shadow: real sun accepted; same numbers at another time rejected');
for (let i = 0; i < 12; i++) [s] = await post('/api/class', { size: 2 });
assert.equal(s, 429); log('class creation is rate-limited per network');
console.log('\nall end-to-end checks passed');
