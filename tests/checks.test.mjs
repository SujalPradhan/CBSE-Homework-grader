import test from 'node:test';
import assert from 'node:assert/strict';
import { byId, grade, sunElevation, CITIES, seeded } from '../src/tasks.js';

const ok = (id, v, p, ctx) => grade(byId[id], v, p, ctx);
const T = L => 2 * Math.PI * Math.sqrt(L / 981);

test('sun elevation sanity: Delhi solar noon at equinox ≈ 90 − 28.6', () => {
  const [lat, lon] = CITIES.Delhi;
  // 20 Mar 2026, ~12:21 IST = 06:51 UTC
  const e = sunElevation(lat, lon, Date.UTC(2026, 2, 20, 6, 51));
  assert.ok(Math.abs(e - (90 - 28.61)) < 1.2, e);
  assert.ok(sunElevation(lat, lon, Date.UTC(2026, 2, 20, 18, 0)) < 0);
});

test('handspan: honest passes, made-up numbers fail', () => {
  assert.equal(ok('g6-sci-handspan', { hs1: 16, n1: 9.5, hs2: 21, n2: 7, L: 150 }).ok, true);
  // counts copied from a friend with a different table
  assert.equal(ok('g6-sci-handspan', { hs1: 16, n1: 6, hs2: 21, n2: 4, L: 150 }).ok, false);
  // child claims an adult-size hand and equal counts
  assert.equal(ok('g6-sci-handspan', { hs1: 30, n1: 5, hs2: 21, n2: 5, L: 150 }).ok, false);
});

test('hand area: honest passes; rule and geometry are checked', () => {
  assert.equal(ok('g6-math-hand-area', { full: 80, more: 24, less: 20, A: 104, len: 16, wid: 8.5, P: 52 }).ok, true);
  assert.equal(ok('g6-math-hand-area', { full: 80, more: 24, less: 20, A: 114, len: 16, wid: 8.5, P: 52 }).ok, false); // rule not followed (counted halves)
  assert.equal(ok('g6-math-hand-area', { full: 120, more: 30, less: 20, A: 150, len: 16, wid: 8.5, P: 52 }).ok, false); // bigger than its box
  assert.equal(ok('g6-math-hand-area', { full: 80, more: 24, less: 20, A: 104, len: 16, wid: 8.5, P: 33 }).ok, false); // P²<4πA
});

test('pendulum: honest passes; half-swing counting and guesses fail', () => {
  assert.equal(ok('g7-sci-pendulum', { L1: 25, t1: 10 * T(25) * 1.03, L2: 100, t2: 10 * T(100) * 0.98 }).ok, true);
  assert.equal(ok('g7-sci-pendulum', { L1: 25, t1: 5 * T(25), L2: 100, t2: 5 * T(100) }).ok, false); // counted half swings
  assert.equal(ok('g7-sci-pendulum', { L1: 25, t1: 10, L2: 100, t2: 40 }).ok, false); // "4× longer → 4× time"
});

test('paper: per-student counts differ; honest passes; pages-for-sheets fails', () => {
  const p = { a: seeded('ABC:1:a', 24, 46), b: seeded('ABC:1:b', 70, 98) };
  const q = { a: seeded('ABC:2:a', 24, 46), b: seeded('ABC:2:b', 70, 98) };
  assert.notDeepEqual(p, q);
  const t = 0.09, hb = +(p.b * t).toFixed(1);
  assert.equal(ok('g7-math-paper', { ha: +(p.a * t).toFixed(1), hb, t: +(hb / p.b).toFixed(3) }, p).ok, true);
  // counting pages instead of sheets: stacks are half as high
  assert.equal(ok('g7-math-paper', { ha: +(p.a * t / 2).toFixed(1), hb: hb / 2, t: +(hb / 2 / p.b).toFixed(3) }, p).ok, false);
  // forwarding a classmate's answers with their stack counts
  const hq = +(q.b * t).toFixed(1);
  assert.equal(ok('g7-math-paper', { ha: +(q.a * t).toFixed(1), hb: hq, t: +(hq / q.b).toFixed(3) }, p).ok, false);
});

test('shadow: matches the real sun; same numbers at another time fail', () => {
  const [lat, lon] = CITIES.Chennai, when = Date.UTC(2026, 9, 10, 4, 30); // 10:00 IST
  const elev = sunElevation(lat, lon, when), r = Math.tan(elev * Math.PI / 180);
  const v = { sh: 100, ss: +(100 / r).toFixed(0), ds: +(210 / r).toFixed(0) };
  v.dcalc = +(v.ds * v.sh / v.ss).toFixed(0); v.dreal = 207;
  assert.equal(ok('g8-math-shadow', v, null, { elev }).ok, true);
  const later = sunElevation(lat, lon, when + 3 * 3600e3); // copied, claimed 3 hours later
  assert.equal(ok('g8-math-shadow', v, null, { elev: later }).ok, false);
});

test('bottle: physical jets pass; "upper goes farther" fake fails', () => {
  const Hw = 70, H1 = 42, H2 = 55, d = H => 2 * Math.sqrt((Hw - H) * H) * 0.85;
  assert.equal(ok('g8-sci-bottle', { Hw, H1, H2, d1: d(H1), d2: d(H2) }).ok, true);
  assert.equal(ok('g8-sci-bottle', { Hw, H1, H2, d1: 20, d2: 60 }).ok, false);
  assert.equal(ok('g8-sci-bottle', { Hw: 30, H1: 3, H2: 15, d1: 15, d2: 26 }).shape, true); // bottle on the ground: free retry
});

test('range errors are marked as shape errors (do not cost a try)', () => {
  assert.equal(grade(byId['g6-sci-handspan'], { hs1: 5, n1: 9, hs2: 21, n2: 7, L: 150 }).shape, true);
});

test('hand area: too few part-squares for the outline is rejected', () => {
  assert.equal(grade(byId['g6-math-hand-area'], { full: 99, more: 5, less: 5, A: 104, len: 16, wid: 8.5, P: 52 }).ok, false);
});
