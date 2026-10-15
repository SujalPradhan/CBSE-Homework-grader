// PRIVATE virtual labs. Each student set number has its own hidden constants, so one student's readings do not fit another's.
// Same inputs always give the same reading (so repeating a run cannot be averaged to find the hidden constant).
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const jitter = (set, a, b) => 1 + ((((set * 7919 + a * 104729 + b * 31) % 1000) + 1000) % 21 - 10) / 1000;   // ±1%

export const gravity = set => 3 + ((set * 37) % 70) / 10;   // m/s², 3.0–9.9: a "mystery planet"
export const pendulumTime = (set, lengthCm, noisy = false) =>
  20 * Math.PI * Math.sqrt(lengthCm / 100 / gravity(set)) * (noisy ? jitter(set, lengthCm, 0) : 1);

const baseSpoons = set => 3 + ((set * 13) % 4);                  // per half glass at 20 °C
const slope = set => [0.5, 0.75, 1.0][(set * 5) % 3];            // extra fraction per 20 °C
export const spoons = (set, glasses, tempC) => Math.round(baseSpoons(set) * (glasses / 0.5) * (1 + slope(set) * (tempC - 20) / 20));

// Inputs are clamped to the lab's ranges, so an odd request cannot reach outside them.
export function runLab(task, set, inp = {}) {
  if (task === 'pendulum') {
    const length = Math.round(clamp(Number(inp.length) || 25, 10, 100));
    const mass = Math.round(clamp(Number(inp.mass) || 100, 50, 500));
    return { length, mass, time: Math.round(pendulumTime(set, length, true) * 10) / 10 };
  }
  if (task === 'dissolve') {
    const glasses = [0.5, 1, 2].includes(Number(inp.glasses)) ? Number(inp.glasses) : 0.5;
    const temp = Math.round(clamp(Number(inp.temp) || 20, 20, 80) / 10) * 10;
    return { glasses, temp, stir: !!inp.stir, spoons: spoons(set, glasses, temp) };
  }
  return null;
}
