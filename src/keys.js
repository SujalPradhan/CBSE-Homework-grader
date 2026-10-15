// PRIVATE answer rules. Not in the public site. Each rule gets the student's answers (a) and their seeded case (c, with c.set).
import { walkLength } from './assignments.mjs';
import { pendulumTime, spoons } from './lab.js';
const near = (x, y, f) => Math.abs(x / y - 1) <= f;
const within = (x, y, d) => Math.abs(x - y) <= d;
const peri = (l, b, P) => within(2 * (l + b), P, 0.01);

// Measured anchors (A): the answer must match the student's own lab reading. The question's min/max is checked separately.
export const PLAUSIBLE = {
  river: {
    l10: (a, c) => within(a.l10, walkLength(c.set, 10), 1),
    l5: (a, c) => within(a.l5, walkLength(c.set, 5), 1),
    l2: (a, c) => within(a.l2, walkLength(c.set, 2), 1),
  },
  fence: {
    l1: (a, c) => a.l1 > 0 && a.l1 < c.P / 2,
    l2: (a, c) => a.l2 > 0 && a.l2 < c.P / 2,
    l3: (a, c) => a.l3 > 0 && a.l3 < c.P / 2,
  },
  pendulum: {
    a25: (a, c) => within(a.a25, pendulumTime(c.set, 25, true), 0.25),
    a100: (a, c) => within(a.a100, pendulumTime(c.set, 100, true), 0.35),
  },
  dissolve: {
    d20: (a, c) => within(a.d20, spoons(c.set, 0.5, 20), 1),
    dT: (a, c) => within(a.dT, spoons(c.set, 0.5, c.dT), 1),
  },
  mixer: {},
};

// Derived (D), fresh-case (F) and choice (C) rules. Return true when the answer is right.
export const RULES = {
  river: {
    diff: a => within(a.diff, a.l2 - a.l10, 0.5),
    l1: (a, c) => near(a.l1, walkLength(c.set, 1), 0.05) && a.l1 >= a.l2 - 0.5,
    best: a => a.best === '2 km step',
  },
  fence: {
    b1: (a, c) => peri(a.l1, a.b1, c.P),
    b2: (a, c) => peri(a.l2, a.b2, c.P) && a.l2 * a.b2 > a.l1 * a.b1 + 0.01,
    b3: (a, c) => Number.isInteger(a.l3) && Number.isInteger(a.b3) && peri(a.l3, a.b3, c.P) && a.l3 * a.b3 === Math.floor(c.P / 4) * (c.P / 2 - Math.floor(c.P / 4)),
    shape: a => a.shape === 'Nearly a square',
  },
  pendulum: {
    ratio: a => within(a.ratio, a.a100 / a.a25, 0.12) && a.ratio >= 1.7 && a.ratio <= 2.3,
    pL: (a, c) => near(a.pL, pendulumTime(c.set, c.pL), 0.08),
    need: (a, c) => near(a.need, 25 * c.k * c.k, 0.12),
    mass: a => a.mass === 'Barely changes',
  },
  dissolve: {
    more: a => within(a.more, a.dT - a.d20, 0.5) && a.dT > a.d20,
    full: (a, c) => near(a.full, spoons(c.set, 1, c.dT), 0.12),
    glasses: (a, c) => { const raw = c.need / spoons(c.set, 1, 40); return a.glasses === Math.ceil(raw) || within(a.glasses, raw, 0.05); },
    stir: a => a.stir === 'The same',
  },
  mixer: {
    s1: (a, c) => within(a.s1, c.n1 * c.r, 0.25),
    s2: (a, c) => within(a.s2, c.n2 * c.r, 0.25),
    cmp: (a, c) => a.cmp === { more: 'Sweeter', same: 'The same', less: 'Less sweet' }[c.mode],
    cups: (a, c) => within(a.cups, c.m, 0.25),
  },
};

// Meaning criteria for the AI-checked sentence. Never shown to students.
export const CRITERIA = {
  river: { why: 'A smaller step follows more of the bends and wiggles, so less of the river is cut off. A big step jumps straight across the curves and misses length.' },
  fence: { why: 'Yes: the same total fence (perimeter) can be split into different lengths and breadths, which give different areas. For example a long thin field has less area than a squarer one.' },
  pendulum: { why: 'A longer thread makes the time longer, but not in direct proportion: making it 4 times longer makes the time about 2 times longer, not 4 times. Saying only "longer thread means longer time" is partial.' },
  dissolve: { why: 'The water can hold only a limited amount of salt (it is full or saturated at that temperature). Once the limit is reached the extra salt cannot dissolve and stays as solid at the bottom.' },
  mixer: { why: 'Used the ratio: the same sugar for each cup of water, so the spoons were found by multiplying or dividing in the same way as the cups (for example spoons per cup times the number of cups). Guessing and tasting alone is partial.' },
};
