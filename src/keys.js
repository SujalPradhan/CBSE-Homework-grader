// PRIVATE answer rules. Not in the public site. Each rule gets the student's answers (a) and their seeded case (c).
import { CASE } from './assignments.mjs';
const near = (x, y, f) => Math.abs(x / y - 1) <= f;
const phys = L => 10 * 2 * Math.PI * Math.sqrt(L / 981);   // seconds for 10 swings
const mean = (...v) => v.reduce((s, x) => s + x, 0) / v.length;

// Extra plausibility for measured anchors (the question's min/max is checked separately).
export const PLAUSIBLE = {
  handspan: { hs1: a => a.hs1 >= 11 && a.hs1 <= 24, hs2: a => a.hs2 >= 13 && a.hs2 <= 27 },
  pendulum: {
    t1a: (a, c) => near(a.t1a, phys(c.L), 0.4),
    t1b: (a, c) => near(a.t1b, phys(c.L), 0.4),
  },
  salt: { n: a => a.n >= 2 && a.n <= 14 },
  paper: { h: (a, c) => { const t = a.h / (c.pages / 2); return t >= 0.04 && t <= 0.3; } },
  sweet: {},
};

// Derived (D), fresh-case (F) and choice (C) rules. Return true when the answer is right.
export const RULES = {
  handspan: {
    n1: a => near(a.hs1 * a.n1, a.L, 0.15),
    n2: a => near(a.hs2 * a.n2, a.L, 0.15),
    bench: (a, c) => Math.abs(a.bench - c.bench / a.hs2) <= 0.5,
    fair: a => a.fair === 'A metre scale',
  },
  pendulum: {
    t1c: a => { const v = [a.t1a, a.t1b, a.t1c]; return (Math.max(...v) - Math.min(...v)) / mean(...v) <= 0.15; },
    t4: a => { const r = a.t4 / mean(a.t1a, a.t1b, a.t1c); return r >= 1.6 && r <= 2.4; },
    p15: a => { const m = mean(a.t1a, a.t1b, a.t1c); return near(a.p15, m * Math.pow(a.t4 / m, 0.2925), 0.12); },
    t15: a => { const m = mean(a.t1a, a.t1b, a.t1c); return near(a.t15, m * Math.pow(a.t4 / m, 0.2925), 0.12); },
    design: (a, c) => near(a.design, c.L * Math.pow(c.goal / mean(a.t1a, a.t1b, a.t1c), 2), 0.25),
    mass: a => a.mass === 'Barely changes',
  },
  salt: {
    pf: a => near(a.pf, 2 * a.n, 0.35),
    nf: a => { const r = a.nf / a.n; return r >= 1.5 && r <= 2.5; },
    s1: a => a.s1 === 'Can’t test it',
    s2: a => a.s2 === 'Disagrees',
    s3: a => a.s3 === 'Disagrees',
    s4: a => a.s4 === 'Can’t test it',
  },
  paper: {
    t: (a, c) => Math.abs(a.t - a.h / (c.pages / 2)) <= 0.005,
    th: a => Math.abs(a.th - a.t * 1000) <= Math.max(5, 0.05 * a.t * 1000),
    pile: (a, c) => near(a.pile, a.t * c.pile, 0.03),
    best: a => a.best === 'Measure 100 sheets',
  },
  sweet: {
    b: (a, c) => Math.abs(a.b - 2 * c.a) <= 0.1,
    least: a => a.least === 'C',
    jar: (a, c) => Math.abs(a.jar - c.jar / c.a) <= 0.25,
    fix: (a, c) => Math.abs(a.fix - (c.a - 1)) <= 0.1,
  },
};

// What a good one-sentence answer must show (meaning, not keywords).
export const CRITERIA = {
  handspan: { why: 'The two people have different sized hands, so the same length is a different number of handspans (a bigger hand needs fewer). A good answer links hand size to the count, or says a fixed unit like cm gives everyone the same number. Wrong if it says the counts should be the same, or gives no reason.' },
  pendulum: { why: 'When the thread was 4 times longer, the time for the swings became about twice as long (longer, but NOT 4 times). Accept "about double" or "longer, but not as much as the length". Wrong if it says the time stayed the same, became 4 times, or got shorter.' },
  salt: { why: 'The undissolved salt is still there as solid at the bottom, because the water already holds all the salt it can (it is full / saturated). Wrong if it says the salt vanished, melted, evaporated, reacted or is gone.' },
  paper: { why: 'One sheet is too thin for the ruler to show, and the ruler has a small error. Measuring a big stack shares that error among many sheets, so the answer per sheet is more accurate. Accept "ruler cannot measure one sheet" together with "divide the error among many sheets".' },
  sweet: { why: 'Doubling the water needs doubling the sugar, so the sugar per cup stays the same. Adding just one spoon makes less sugar per cup (the sugar did not change by the same factor as the water), so it tastes weaker. Wrong if it says it should taste the same, or gives no reason.' },
};

export { CASE };
