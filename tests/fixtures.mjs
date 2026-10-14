// Complete, honest answer sheets (simulated test data, not real students). Numbers follow the student's own set number.
import { CASE } from '../src/assignments.mjs';
const phys = L => 10 * 2 * Math.PI * Math.sqrt(L / 981);
const r1 = x => Math.round(x * 10) / 10;
export const SET = 47;

export function honest(id, set = SET) {
  const c = CASE(set);
  switch (id) {
    case 'handspan': {
      const hs1 = 16, hs2 = 21, L = 150;
      return { pred: 'The adult', hs1, n1: 9.5, hs2, n2: 7, L, bench: r1(c.bench / hs2), fair: 'A metre scale',
        why: 'The adult has a bigger hand so needs fewer handspans. A metre scale is the same for everyone.' };
    }
    case 'pendulum': {
      const t1 = phys(c.L), m = r1(t1);
      return { pred: 'Double', t1a: r1(t1 * 1.02), t1b: r1(t1 * 0.98), t1c: m, t4: r1(t1 * 2.03),
        p15: r1(m * Math.pow(2.03, 0.2925)), t15: r1(m * Math.pow(2.03, 0.2925) * 1.03),
        design: Math.round(c.L * Math.pow(c.goal / m, 2)), mass: 'Barely changes',
        why: 'When the thread was 4 times longer the time became about double, not four times.' };
    }
    case 'salt':
      return { n: 6, pf: 12, nf: 11, s1: 'Can’t test it', s2: 'Disagrees', s3: 'Disagrees', s4: 'Can’t test it',
        why: 'The salt is still in the glass as solid at the bottom because the water is full and cannot hold any more.' };
    case 'paper': {
      const sheets = c.pages / 2, h = r1(0.09 * sheets), t = Math.round(h / sheets * 1000) / 1000;
      return { pred: 0.1, h, t, th: Math.round(t * 1000), pile: r1(t * c.pile), best: 'Measure 100 sheets',
        why: 'One sheet is too thin for the ruler, so I measure many sheets and divide to share the ruler error.' };
    }
    case 'sweet':
      return { pred: 'Less sweet than A', b: 2 * c.a, least: 'C', jar: Math.round(c.jar / c.a * 100) / 100, fix: c.a - 1,
        why: 'The water doubled so the sugar must double too. One more spoon gives less sugar per cup so it tastes weaker.' };
  }
}
export const HONEST = Object.fromEntries(['handspan', 'pendulum', 'salt', 'paper', 'sweet'].map(id => [id, honest(id)]));
