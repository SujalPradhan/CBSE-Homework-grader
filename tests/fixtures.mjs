// Complete, honest answer sheets (simulated test data, not real students). Numbers come from the student's own set number.
import { CASE, walkLength } from '../src/assignments.mjs';
import { pendulumTime, spoons } from '../src/lab.js';
const r1 = x => Math.round(x * 10) / 10;
export const SET = 47;
export const TASK_IDS = ['river', 'fence', 'pendulum', 'dissolve', 'mixer'];

export function honest(id, set = SET) {
  const c = CASE(set);
  switch (id) {
    case 'river': {
      const l10 = walkLength(set, 10), l5 = walkLength(set, 5), l2 = walkLength(set, 2);
      return { pred: 'Longer', l10, l5, l2, diff: l2 - l10, l1: r1(walkLength(set, 1)), best: '2 km step',
        why: 'A smaller step follows more of the bends, but a big step cuts straight across the curves and misses some length.' };
    }
    case 'fence': {
      const h = c.P / 2, side = Math.floor(c.P / 4);
      return { l1: h - 1, b1: 1, l2: h - 3, b2: 3, l3: side, b3: h - side, shape: 'Nearly a square',
        why: 'Yes, the same fence can make different shapes, a long thin one has less area than a squarer one.' };
    }
    case 'pendulum': {
      const a25 = r1(pendulumTime(set, 25, true)), a100 = r1(pendulumTime(set, 100, true));
      return { pred: 'About 2 times longer', a25, a100, ratio: r1(a100 / a25), pL: r1(pendulumTime(set, c.pL)),
        need: 25 * c.k * c.k, mass: 'Barely changes',
        why: 'A longer thread takes longer but not as much as the length, 4 times the length gave about 2 times the time.' };
    }
    case 'dissolve': {
      const d20 = spoons(set, 0.5, 20), dT = spoons(set, 0.5, c.dT);
      return { pred: 'More salt', d20, dT, more: dT - d20, full: spoons(set, 1, c.dT),
        glasses: Math.ceil(c.need / spoons(set, 1, 40)), stir: 'The same',
        why: 'The water can only hold so much salt, when it is full the extra salt cannot dissolve and stays at the bottom.' };
    }
    case 'mixer':
      return { pred: 'Less sweet', s1: c.n1 * c.r, s2: c.n2 * c.r,
        cmp: { more: 'Sweeter', same: 'The same', less: 'Less sweet' }[c.mode], cups: c.m,
        why: 'The same sugar for every cup, so I multiplied the spoons per cup by the number of cups.' };
  }
}
export const HONEST = Object.fromEntries(TASK_IDS.map(id => [id, honest(id)]));
