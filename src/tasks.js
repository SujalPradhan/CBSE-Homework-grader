// Six homework tasks for CBSE Grades 6–8, each built on an activity in the NCERT textbook.
// Every check runs on the server. A check only accepts numbers that a real measurement could produce;
// it never tells the student the expected value.

export const CITIES = {
  // lat, lon (degrees). Used only by the shadow task to compute the sun's height.
  'Agartala': [23.83, 91.28], 'Ahmedabad': [23.03, 72.58], 'Bengaluru': [12.97, 77.59], 'Bhopal': [23.26, 77.41],
  'Bhubaneswar': [20.30, 85.82], 'Chandigarh': [30.73, 76.78], 'Chennai': [13.08, 80.27], 'Coimbatore': [11.02, 76.96],
  'Dehradun': [30.32, 78.03], 'Delhi': [28.61, 77.21], 'Gangtok': [27.33, 88.61], 'Guwahati': [26.14, 91.74],
  'Hyderabad': [17.39, 78.49], 'Imphal': [24.82, 93.94], 'Indore': [22.72, 75.86], 'Jaipur': [26.91, 75.79],
  'Jammu': [32.73, 74.86], 'Kochi': [9.93, 76.27], 'Kolkata': [22.57, 88.36], 'Lucknow': [26.85, 80.95],
  'Madurai': [9.93, 78.12], 'Mangaluru': [12.91, 74.86], 'Mumbai': [19.08, 72.88], 'Nagpur': [21.15, 79.09],
  'Panaji': [15.49, 73.83], 'Patna': [25.59, 85.14], 'Port Blair': [11.62, 92.73], 'Puducherry': [11.94, 79.81],
  'Pune': [18.52, 73.86], 'Raipur': [21.25, 81.63], 'Ranchi': [23.34, 85.31], 'Shillong': [25.58, 91.89],
  'Shimla': [31.10, 77.17], 'Srinagar': [34.08, 74.80], 'Surat': [21.17, 72.83], 'Thiruvananthapuram': [8.52, 76.94],
  'Vadodara': [22.31, 73.18], 'Varanasi': [25.32, 82.97], 'Visakhapatnam': [17.69, 83.22], 'Vijayawada': [16.51, 80.65],
};

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

// Sun's height above the horizon in degrees (NOAA low-precision formulae, ~0.1°).
export function sunElevation(lat, lon, utcMs) {
  const n = utcMs / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360, g = rad((357.528 + 0.9856003 * n) % 360);
  const lam = rad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)), eps = rad(23.439 - 0.0000004 * n);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = ((18.697374558 + 24.06570982441908 * n) % 24 + 24) % 24;
  const ha = rad(gmst * 15 + lon) - ra;
  return deg(Math.asin(Math.sin(rad(lat)) * Math.sin(dec) + Math.cos(rad(lat)) * Math.cos(dec) * Math.cos(ha)));
}

// Deterministic per-student numbers (so neighbours get different stacks to measure).
export function seeded(key, lo, hi) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return lo + (h % (hi - lo + 1));
}

const within = (x, target, frac) => Math.abs(x / target - 1) <= frac;

export const TASKS = [
  {
    id: 'g6-sci-handspan', grade: 6, subject: 'Science', minutes: 20,
    chapter: 'Curiosity (Grade 6), Ch. 5 Measurement of Length and Motion, Activity 5.1',
    title: 'How many handspans long is your table?',
    hook: 'People in a story measured the same table with their hands and got different answers. Will that happen in your home too?',
    materials: ['A table or bed', 'A ruler or measuring tape', 'One adult at home'],
    predict: { q: 'Who will need MORE handspans to cover the table: you or the adult?', options: ['Me', 'The adult', 'Same'] },
    steps: [
      'Spread your hand wide. Measure your handspan (thumb tip to little-finger tip) in cm with the ruler.',
      'Count how many of your handspans cover the long side of the table. Halves are okay, like 7.5.',
      'Ask the adult to do the same two steps.',
      'Now measure the long side of the table in cm with the ruler or tape.',
    ],
    inputs: [
      { id: 'hs1', label: 'Your handspan', unit: 'cm', min: 8, max: 30 },
      { id: 'n1', label: 'Your handspans along the table', unit: 'handspans', min: 1, max: 40 },
      { id: 'hs2', label: "Adult's handspan", unit: 'cm', min: 8, max: 30 },
      { id: 'n2', label: "Adult's handspans along the table", unit: 'handspans', min: 1, max: 40 },
      { id: 'L', label: 'Table length with ruler or tape', unit: 'cm', min: 30, max: 400 },
    ],
    check(v) {
      const m = [];
      if (v.hs1 < 11 || v.hs1 > 24) m.push('Your handspan looks unusual. Measure from thumb tip to little-finger tip with your hand spread wide.');
      if (v.hs2 < 13 || v.hs2 > 27) m.push("The adult's handspan looks unusual. Measure it again.");
      if (!within(v.n1 * v.hs1, v.L, 0.15)) m.push('Your handspan count and the table length do not agree. Count your handspans again, end to end.');
      if (!within(v.n2 * v.hs2, v.L, 0.15)) m.push("The adult's count and the table length do not agree. Count again, end to end.");
      return m;
    },
    explainBack: 'Tell the adult why you both got different numbers for the same table. Ask them to explain it back to you in one sentence, and write their sentence in your notebook.',
    fresh: ['Riya’s handspan is 15 cm. Her father’s is 20 cm. A bench is 12 of Riya’s handspans long. How many of her father’s handspans long is it?', 'Why do shops use metres and not handspans?'],
    pool: { x: 'hs1', label: 'Handspans in our class (cm)' },
  },
  {
    id: 'g6-math-hand-area', grade: 6, subject: 'Maths', minutes: 25,
    chapter: 'Ganita Prakash (Grade 6), Ch. 6 Perimeter and Area, area of irregular figures on squared paper',
    title: 'What is the area of your hand?',
    hook: 'Your hand is not a rectangle. Can you still find its area?',
    materials: ['Squared paper with 1 cm squares (or draw a 1 cm grid)', 'Pencil', 'A piece of thread', 'Ruler'],
    predict: { q: 'Guess the area of your hand (fingers closed), in square cm.', number: true, unit: 'sq cm', min: 1, max: 1000 },
    steps: [
      'Place your hand flat on the squared paper with fingers together. Trace around it up to the wrist line.',
      'Count the area using the textbook rule: count full squares, count a square as 1 if more than half is inside, ignore it if less than half is inside.',
      'Measure the hand length (wrist line to tip of middle finger) and the width (widest part) with the ruler.',
      'Lay the thread along your outline, then straighten it and measure it. This is the perimeter.',
    ],
    inputs: [
      { id: 'full', label: 'Full squares inside', unit: 'squares', min: 0, max: 400 },
      { id: 'more', label: 'Part-squares more than half inside', unit: 'squares', min: 0, max: 200 },
      { id: 'less', label: 'Part-squares less than half inside', unit: 'squares', min: 0, max: 200 },
      { id: 'A', label: 'Total area (by the rule)', unit: 'sq cm', min: 20, max: 400 },
      { id: 'len', label: 'Hand length', unit: 'cm', min: 8, max: 26 },
      { id: 'wid', label: 'Hand width', unit: 'cm', min: 4, max: 14 },
      { id: 'P', label: 'Perimeter with thread', unit: 'cm', min: 20, max: 120 },
    ],
    check(v) {
      const m = [];
      if (v.len < 11 || v.len > 24 || v.wid < 5 || v.wid > 12) m.push('Check your length and width measurements with the ruler.');
      if (Math.abs(v.A - (v.full + v.more)) > 0.5) m.push('Use the rule for the total: full squares count 1, more-than-half squares count 1, less-than-half squares count 0.');
      const edge = v.more + v.less;
      if (edge < 0.6 * v.P || edge > 2.2 * v.P) m.push('Count the part-squares along the outline again. A longer outline crosses more squares.');
      if (v.A > v.len * v.wid || v.A < 0.45 * v.len * v.wid) m.push('Your area does not fit a hand of this length and width. Recount your squares and remeasure.');
      if (v.P * v.P < 4 * Math.PI * v.A) m.push('Your perimeter is too short for this area. Lay the thread along every bump of the outline.');
      if (v.P < 2 * v.len) m.push('Your perimeter must be at least twice your hand length. Measure the thread again.');
      return m;
    },
    explainBack: 'Show an adult your traced hand. Explain how you counted the part-squares. Ask them to explain the rule back to you, and write their sentence in your notebook.',
    fresh: ['A leaf traced on 1 cm paper covers 18 full squares, 7 squares more than half, and 9 squares less than half. What is its area by the rule?', 'Two shapes have the same area. Must they have the same perimeter? Draw an example.'],
    pool: { x: 'A', label: 'Hand areas in our class (sq cm)' },
  },
  {
    id: 'g7-sci-pendulum', grade: 7, subject: 'Science', minutes: 30,
    chapter: 'Curiosity (Grade 7), Ch. 8 Measurement of Time and Motion, Activity 8.2 and “Think like a scientist”',
    title: 'Does a longer pendulum swing faster or slower?',
    hook: 'Galileo timed swinging lamps with his pulse. You will use a watch.',
    materials: ['Thread about 1.5 m long', 'A small heavy object (stone, key, nut) as the bob', 'A watch or phone stopwatch', 'Ruler or tape', 'A place to hang the thread (door frame, hook)'],
    predict: { q: 'If you make the thread 4 times longer, the time for one swing will…', options: ['Stay the same', 'Double', 'Become 4 times', 'Get shorter'] },
    steps: [
      'Tie the bob to the thread and hang it. Measure the length from the hanging point to the middle of the bob.',
      'Pull the bob a little to one side (not far) and let go. Time 10 full oscillations: one oscillation is from one side, to the other side, and back.',
      'Change the thread to a clearly different length (at least one and a half times longer or shorter). Measure and time 10 oscillations again.',
    ],
    inputs: [
      { id: 'L1', label: 'Length 1', unit: 'cm', min: 10, max: 250 },
      { id: 't1', label: 'Time for 10 oscillations at length 1', unit: 's', min: 2, max: 60 },
      { id: 'L2', label: 'Length 2', unit: 'cm', min: 10, max: 250 },
      { id: 't2', label: 'Time for 10 oscillations at length 2', unit: 's', min: 2, max: 60 },
    ],
    check(v) {
      const m = [], T = L => 2 * Math.PI * Math.sqrt(L / 981);
      const r = Math.max(v.L1, v.L2) / Math.min(v.L1, v.L2);
      if (v.L1 < 20 || v.L2 < 20) m.push('Use threads at least 20 cm long so you can count the swings.');
      if (r < 1.5) m.push('Make the two lengths more different (one at least one and a half times the other).');
      if (!within(v.t1 / 10, T(v.L1), 0.12) || !within(v.t2 / 10, T(v.L2), 0.12))
        m.push('Your times do not match a real pendulum of these lengths. Recheck what counts as one oscillation, and measure the length to the middle of the bob.');
      return m;
    },
    explainBack: 'Show an adult both pendulums. Explain what changed the swing time and what did not. Ask them to explain it back, and write their sentence in your notebook.',
    fresh: ['A pendulum takes 15 seconds for 10 oscillations. What is its time period?', 'Two pendulums have the same length. One has a heavier bob. Which swings faster?'],
    pool: { x: 'L1', y: 't1', label: 'Our class: length (cm) vs time for 10 swings (s)' },
  },
  {
    id: 'g7-math-paper', grade: 7, subject: 'Maths', minutes: 20,
    chapter: 'Ganita Prakash (Grade 7), Ch. 3 A Peek Beyond the Point (tenths, hundredths, thousandths)',
    title: 'How thick is one sheet of paper?',
    hook: 'A sheet is too thin for your ruler. But a stack is not.',
    materials: ['A notebook or old book', 'A ruler with mm marks'],
    personal: key => ({ a: seeded(key + ':a', 24, 46), b: seeded(key + ':b', 70, 98) }),
    predict: { q: 'Guess the thickness of one sheet, in mm.', number: true, unit: 'mm', min: 0.001, max: 10 },
    steps: [
      'A sheet is one leaf of paper: it has 2 pages (front and back).',
      'Squeeze together exactly your FIRST number of sheets (shown above). Measure the stack in mm.',
      'Do the same with your SECOND number of sheets.',
      'Divide to find the thickness of one sheet. Write it in mm with three decimal places, for example 0.085.',
    ],
    inputs: [
      { id: 'ha', label: 'Height of the first stack', unit: 'mm', min: 0.5, max: 40 },
      { id: 'hb', label: 'Height of the second stack', unit: 'mm', min: 0.5, max: 60 },
      { id: 't', label: 'Thickness of one sheet (from your second stack)', unit: 'mm', min: 0.01, max: 1 },
    ],
    check(v, p) {
      const m = [], ta = v.ha / p.a, tb = v.hb / p.b;
      if (!within(ta, tb, 0.2)) m.push('Your two stacks give very different thicknesses. Check that you counted sheets (not pages) and squeezed each stack.');
      if (tb < 0.055 || tb > 0.3) m.push('That thickness is unusual for notebook or book paper. Count sheets, not pages, and measure in mm.');
      if (!within(v.t, tb, 0.03)) m.push('Recheck your division for one sheet: second stack height ÷ second number of sheets.');
      return m;
    },
    explainBack: 'Explain to an adult why measuring many sheets gives a better answer than measuring one. Write their explanation in your notebook.',
    fresh: ['50 sheets make a stack 4.5 mm high. How thick is one sheet?', 'A book is 18 mm thick without its covers. Its sheets are 0.09 mm thick. How many pages does it have?'],
    pool: { x: 't', label: 'Sheet thickness in our class (mm)' },
  },
  {
    id: 'g8-math-shadow', grade: 8, subject: 'Maths', minutes: 25,
    chapter: 'Ganita Prakash (Grade 8), Ch. 7 Proportional Reasoning-1 (a : b :: c : d)',
    title: 'Find the height of your door from its shadow',
    hook: 'At one moment, every upright object and its shadow have the same ratio. Use that to find a height without climbing.',
    materials: ['A straight stick (or ruler) standing upright', 'A measuring tape', 'A sunny morning or afternoon (shadows are too short near noon and too long near sunset)', 'A door, gate or pole in the sun'],
    sun: true,
    predict: { q: 'Guess the height of the door, gate or pole in cm (before measuring anything).', number: true, unit: 'cm', min: 10, max: 2000 },
    steps: [
      'Stand the stick straight up in the sun. Measure the stick height and the length of its shadow.',
      'Within 2 minutes, measure the shadow of the door, gate or pole. Note the exact time.',
      'Use a : b :: c : d to work out the height of the door from its shadow.',
      'Now measure the real height of the door with the tape.',
    ],
    inputs: [
      { id: 'sh', label: 'Stick height', unit: 'cm', min: 10, max: 300 },
      { id: 'ss', label: 'Stick shadow', unit: 'cm', min: 1, max: 1500 },
      { id: 'ds', label: 'Door shadow', unit: 'cm', min: 1, max: 3000 },
      { id: 'dcalc', label: 'Door height you calculated', unit: 'cm', min: 10, max: 2000 },
      { id: 'dreal', label: 'Door height you measured', unit: 'cm', min: 10, max: 2000 },
    ],
    check(v, p, ctx) {
      const m = [];
      const want = v.sh / v.ss;
      if (!within(v.dcalc, v.ds * want, 0.03)) m.push('Recheck your calculation: stick height : stick shadow :: door height : door shadow.');
      if (!within(v.dreal, v.dcalc, 0.12)) m.push('Your calculated and measured door heights are far apart. Measure the shadows again at the same moment.');
      if (ctx && ctx.elev != null) {
        if (ctx.elev < 12) m.push('The sun was too low at that time. Measure in the morning or afternoon, not near sunrise or sunset.');
        else if (Math.abs(deg(Math.atan(want)) - ctx.elev) > 4) m.push('Your stick and its shadow do not match the sun at that time and place. Check the time, the city, and that the stick was upright.');
      }
      return m;
    },
    explainBack: 'Show an adult how one stick told you the door height. Ask them to explain it back, and write their sentence in your notebook.',
    fresh: ['A 1 m stick casts a 1.5 m shadow. At the same time a tree casts a 9 m shadow. How tall is the tree?', 'Would your answer work if you measured the door shadow one hour later? Why?'],
    pool: { x: 'ratio', label: 'Stick height ÷ shadow in our class' },
  },
  {
    id: 'g8-sci-bottle', grade: 8, subject: 'Science', minutes: 30,
    chapter: 'Curiosity (Grade 8), Ch. 6 Pressure, Winds, Storms, and Cyclones, Activity 6.2',
    title: 'Which hole squirts water farther?',
    hook: 'Two holes in one bottle, one high and one low. The bottle stands on a stool. Which jet lands farther away?',
    materials: ['An empty plastic bottle', 'A nail (ask an adult to make the holes)', 'Tape', 'A stool, brick or step to stand the bottle on', 'Measuring tape', 'Do this outside or over a bucket'],
    safety: 'Ask an adult to make the holes. If the nail needs heating, only the adult heats it.',
    predict: { q: 'Which jet will land farther from the bottle?', options: ['Lower hole', 'Upper hole', 'Same distance'] },
    steps: [
      'With an adult, make two holes on the same side of the bottle: one near the bottom, one about halfway up. Cover both with tape.',
      'Stand the bottle on a stool or brick. Fill it with water to the top.',
      'Measure from the ground: the height of the water surface, the lower hole, and the upper hole.',
      'Remove both tapes together. Straight away, mark where each jet hits the ground. Measure each mark’s distance from the bottle.',
    ],
    inputs: [
      { id: 'Hw', label: 'Water surface above ground', unit: 'cm', min: 10, max: 200 },
      { id: 'H1', label: 'Lower hole above ground (bottle on a stool)', unit: 'cm', min: 20, max: 200 },
      { id: 'H2', label: 'Upper hole above ground', unit: 'cm', min: 1, max: 200 },
      { id: 'd1', label: 'Lower jet distance', unit: 'cm', min: 0, max: 400 },
      { id: 'd2', label: 'Upper jet distance', unit: 'cm', min: 0, max: 400 },
    ],
    check(v) {
      const m = [], ideal = H => 2 * Math.sqrt(Math.max(0, v.Hw - H) * H);
      if (v.H1 < 20) m.push('Stand the bottle on a stool, brick or step (the lower hole should be at least 20 cm above the ground).');
      else if (!(v.H1 < v.H2 && v.H2 < v.Hw)) m.push('Heights should go: lower hole < upper hole < water surface. Measure all three from the ground.');
      else if (v.Hw - v.H2 < 4) m.push('Put the upper hole lower, so there is more water above it.');
      else {
        const r1 = v.d1 / ideal(v.H1), r2 = v.d2 / ideal(v.H2);
        if (r1 < 0.5 || r1 > 1.15 || r2 < 0.5 || r2 > 1.15) m.push('Your jet distances do not match real water jets for these heights. Mark the landing spots right after removing the tape.');
        else if (!within(v.d1 / v.d2, ideal(v.H1) / ideal(v.H2), 0.25)) m.push('The two jets do not compare the way real jets would. Remove both tapes at the same moment and measure again.');
      }
      return m;
    },
    explainBack: 'Explain to an adult why the water came out faster from one hole than the other. Ask them to explain it back, and write their sentence in your notebook.',
    fresh: ['Why are dam walls thicker at the bottom than at the top?', 'A water tank has taps at two heights. Which tap gives a faster flow when the tank is full? Why?'],
    pool: { x: 'winner', label: 'Which jet went farther in our class' },
  },
];

// What the class pool shows for each accepted answer: only the summary, never the raw inputs.
export function summary(task, v) {
  switch (task.id) {
    case 'g6-sci-handspan': return { hs1: v.hs1 };
    case 'g6-math-hand-area': return { A: v.A };
    case 'g7-sci-pendulum': return { pts: [[v.L1, v.t1], [v.L2, v.t2]] };
    case 'g7-math-paper': return { t: v.t };
    case 'g8-math-shadow': return { ratio: +(v.sh / v.ss).toFixed(3) };
    case 'g8-sci-bottle': return { winner: v.d1 > v.d2 * 1.05 ? 'Lower hole' : v.d2 > v.d1 * 1.05 ? 'Upper hole' : 'Same distance' };
  }
}
// Numbers used to spot near-copies between students.
// The paper task includes each student's own sheet counts, so honest students with similar paper are not flagged.
export const fingerprint = (task, v, personal) => [...task.inputs.map(f => v[f.id]), ...(personal ? [personal.a, personal.b] : [])];

export const byId = Object.fromEntries(TASKS.map(t => [t.id, t]));

// Validate shape and ranges, then run the task's check. Returns { ok, messages, v, shape? }.
export function grade(task, raw, personal, ctx) {
  const v = {}, m = [];
  for (const f of task.inputs) {
    const x = Number(raw[f.id]);
    if (!Number.isFinite(x)) { m.push(`Fill in: ${f.label}.`); continue; }
    if (x < f.min || x > f.max) m.push(`${f.label} should be between ${f.min} and ${f.max} ${f.unit}.`);
    v[f.id] = x;
  }
  if (m.length) return { ok: false, messages: m, v, shape: true };
  const msgs = task.check(v, personal, ctx);
  return { ok: msgs.length === 0, messages: msgs, v };
}

// Public view of a task (no check code).
export function publicTask(t, personal) {
  const { check, personal: _p, ...rest } = t;
  return { ...rest, personal: personal || null };
}
