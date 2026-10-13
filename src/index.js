import { TASKS, byId, grade, publicTask, summary, fingerprint, CITIES, sunElevation } from './tasks.js';

const MAX_ATTEMPTS = 5, MAX_PIN_FAILS = 10, CLASSES_PER_IP_PER_DAY = 10, QUICK_MIN = 3;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });
const err = (msg, status = 400) => json({ error: msg }, status);
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALPHA[b % ALPHA.length]).join('');

// Check class + roll, and claim or verify the student's PIN.
async function student(db, code, roll, pin, now) {
  code = String(code || '').toUpperCase().trim();
  roll = Number(roll); pin = String(pin || '');
  const c = await db.prepare('SELECT code, size FROM classes WHERE code = ?').bind(code).first();
  if (!c) return { e: 'Class code not found. Check it with your teacher.' };
  if (!Number.isInteger(roll) || roll < 1 || roll > c.size) return { e: `Roll number must be between 1 and ${c.size}.` };
  if (!/^\d{4}$/.test(pin)) return { e: 'Enter a 4-digit PIN.' };
  const fails = await db.prepare('SELECT n FROM pinfails WHERE code=? AND roll=?').bind(code, roll).first();
  if (fails && fails.n >= MAX_PIN_FAILS) return { e: 'Too many wrong PINs for this roll number. Ask your teacher to reset it.', status: 429 };
  const s = await db.prepare('SELECT pin FROM students WHERE code=? AND roll=?').bind(code, roll).first();
  if (!s) await db.prepare('INSERT OR IGNORE INTO students VALUES (?, ?, ?, ?)').bind(code, roll, pin, now).run();
  else if (s.pin !== pin) {
    await db.prepare('INSERT INTO pinfails VALUES (?, ?, 1) ON CONFLICT (code, roll) DO UPDATE SET n = n + 1').bind(code, roll).run();
    return { e: 'This roll number already has a different PIN. If it is yours and you forgot it, ask your teacher to reset it.', status: 403 };
  }
  return { code, roll };
}
const personalFor = (t, code, roll) => (t.personal ? t.personal(`${code}:${roll}:${t.id}`) : null);
async function teacher(db, code, key) {
  return db.prepare('SELECT * FROM classes WHERE code = ? AND key = ?').bind(String(code || '').toUpperCase(), String(key || '')).first();
}
const close = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= 0.02 * Math.max(Math.abs(x), Math.abs(b[i]), 1e-9));

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), p = url.pathname, q = url.searchParams, db = env.DB;
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const now = Date.now();
    try {
      if (p === '/api/tasks') return json({ tasks: TASKS.map(t => publicTask(t)), cities: Object.keys(CITIES) });

      if (p === '/api/class' && req.method === 'POST') {
        const ip = req.headers.get('cf-connecting-ip') || 'local', day = new Date(now).toISOString().slice(0, 10);
        const m = await db.prepare('SELECT n FROM makers WHERE ip=? AND day=?').bind(ip, day).first();
        if (m && m.n >= CLASSES_PER_IP_PER_DAY) return err('Too many classes made from this network today. Try again tomorrow.', 429);
        await db.prepare('INSERT INTO makers VALUES (?, ?, 1) ON CONFLICT (ip, day) DO UPDATE SET n = n + 1').bind(ip, day).run();
        const size = Math.min(80, Math.max(1, Number(body.size) || 45));
        const code = rand(6), key = rand(16);
        await db.prepare('INSERT INTO classes VALUES (?, ?, ?, ?, ?)').bind(code, key, String(body.name || '').slice(0, 60), size, now).run();
        return json({ code, key, size });
      }

      if (p === '/api/status') {
        const s = await student(db, q.get('class'), q.get('roll'), q.get('pin'), now);
        if (s.e) return err(s.e, s.status);
        const t = byId[q.get('task')];
        if (!t) return err('Unknown task.');
        const pred = await db.prepare('SELECT value FROM predictions WHERE code=? AND roll=? AND task=?').bind(s.code, s.roll, t.id).first();
        const att = await db.prepare('SELECT COUNT(*) n, MAX(ok) ok FROM attempts WHERE code=? AND roll=? AND task=?').bind(s.code, s.roll, t.id).first();
        const rev = await db.prepare('SELECT 1 FROM reveals WHERE code=? AND task=?').bind(s.code, t.id).first();
        return json({ task: publicTask(t, personalFor(t, s.code, s.roll)), prediction: pred ? pred.value : null, attempts: att.n, left: MAX_ATTEMPTS - att.n, accepted: !!att.ok, revealed: !!rev });
      }

      if (p === '/api/predict' && req.method === 'POST') {
        const s = await student(db, body.class, body.roll, body.pin, now);
        if (s.e) return err(s.e, s.status);
        const t = byId[body.task];
        if (!t) return err('Unknown task.');
        const value = String(body.value ?? '').trim().slice(0, 40), pr = t.predict;
        if (!value) return err('Write a prediction first.');
        if (pr.options && !pr.options.includes(value)) return err('Pick one of the options.');
        if (pr.number && !(Number(value) >= pr.min && Number(value) <= pr.max)) return err(`Write a number between ${pr.min} and ${pr.max}.`);
        const r = await db.prepare('INSERT OR IGNORE INTO predictions VALUES (?, ?, ?, ?, ?)').bind(s.code, s.roll, t.id, value, now).run();
        if (!r.meta.changes) return err('Your prediction is already locked. It cannot be changed.', 409);
        return json({ locked: value });
      }

      if (p === '/api/submit' && req.method === 'POST') {
        const s = await student(db, body.class, body.roll, body.pin, now);
        if (s.e) return err(s.e, s.status);
        const t = byId[body.task];
        if (!t) return err('Unknown task.');
        const pred = await db.prepare('SELECT 1 FROM predictions WHERE code=? AND roll=? AND task=?').bind(s.code, s.roll, t.id).first();
        if (!pred) return err('Lock your prediction before you submit measurements.');
        const att = await db.prepare('SELECT COUNT(*) n, MAX(ok) ok FROM attempts WHERE code=? AND roll=? AND task=?').bind(s.code, s.roll, t.id).first();
        if (att.ok) return err('You have already finished this task.', 409);
        if (att.n >= MAX_ATTEMPTS) return err('No tries left. Show your notebook to your teacher.', 429);
        let ctx = null, meta = {};
        if (t.sun) {
          const ll = CITIES[body.city];
          const when = Date.parse(String(body.when || '') + ':00+05:30'); // "YYYY-MM-DDTHH:MM" in IST
          if (!ll) return err('Pick your city (or the nearest big city).');
          if (!Number.isFinite(when)) return err('Enter the date and time you measured.');
          if (when > now + 5 * 60e3) return err('That time is in the future. Enter the time you measured.');
          if (when < now - 7 * 86400e3) return err('Enter a measurement from the last 7 days.');
          ctx = { elev: sunElevation(ll[0], ll[1], when) };
          meta = { city: body.city, when: body.when };
        }
        const g = grade(t, body.values || {}, personalFor(t, s.code, s.roll), ctx);
        if (g.shape) return json({ ok: false, messages: g.messages, left: MAX_ATTEMPTS - att.n, free: true }); // typos don't cost a try
        await db.prepare('INSERT INTO attempts (code, roll, task, vals, ok, ts, meta) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(s.code, s.roll, t.id, JSON.stringify({ fp: fingerprint(t, g.v, personalFor(t, s.code, s.roll)), sum: summary(t, g.v) }), g.ok ? 1 : 0, now, JSON.stringify(meta)).run();
        return json({ ok: g.ok, messages: g.messages, left: MAX_ATTEMPTS - att.n - 1 });
      }

      if (p === '/api/pool') {
        const code = String(q.get('class') || '').toUpperCase(), t = byId[q.get('task')];
        if (!t) return err('Unknown task.');
        const rev = await db.prepare('SELECT 1 FROM reveals WHERE code=? AND task=?').bind(code, t.id).first();
        if (!rev) return err('Your teacher has not opened the class results yet.', 403);
        const rows = (await db.prepare('SELECT vals FROM attempts WHERE code=? AND task=? AND ok=1').bind(code, t.id).all()).results;
        const preds = (await db.prepare('SELECT value FROM predictions WHERE code=? AND task=?').bind(code, t.id).all()).results;
        return json({ pool: t.pool, values: rows.map(r => JSON.parse(r.vals).sum).filter(Boolean), predictions: preds.map(r => r.value) });
      }

      if (p === '/api/reveal' && req.method === 'POST') {
        const c = await teacher(db, body.class, body.key);
        if (!c) return err('Wrong class code or teacher key.', 403);
        if (!byId[body.task]) return err('Unknown task.');
        await db.prepare('INSERT OR IGNORE INTO reveals VALUES (?, ?, ?)').bind(c.code, body.task, now).run();
        return json({ revealed: body.task });
      }

      if (p === '/api/reset' && req.method === 'POST') {
        const c = await teacher(db, body.class, body.key);
        if (!c) return err('Wrong class code or teacher key.', 403);
        const roll = Number(body.roll);
        await db.batch([
          db.prepare('DELETE FROM students WHERE code=? AND roll=?').bind(c.code, roll),
          db.prepare('DELETE FROM predictions WHERE code=? AND roll=?').bind(c.code, roll),
          db.prepare('DELETE FROM attempts WHERE code=? AND roll=?').bind(c.code, roll),
          db.prepare('DELETE FROM pinfails WHERE code=? AND roll=?').bind(c.code, roll),
        ]);
        return json({ reset: roll });
      }

      if (p === '/api/dash') {
        const c = await teacher(db, q.get('class'), q.get('key'));
        if (!c) return err('Wrong class code or teacher key.', 403);
        const preds = (await db.prepare('SELECT roll, task, value, ts FROM predictions WHERE code=?').bind(c.code).all()).results;
        const atts = (await db.prepare('SELECT roll, task, vals, ok, ts FROM attempts WHERE code=? ORDER BY id').bind(c.code).all()).results;
        const revs = (await db.prepare('SELECT task FROM reveals WHERE code=?').bind(c.code).all()).results.map(r => r.task);
        const locked = (await db.prepare('SELECT roll FROM pinfails WHERE code=? AND n >= ?').bind(c.code, MAX_PIN_FAILS).all()).results.map(r => r.roll);
        const tasks = TASKS.map(t => {
          const rows = {}, okFp = [];
          const row = roll => rows[roll] ||= { roll, prediction: null, predTs: null, attempts: 0, accepted: false, doneTs: null, flags: [] };
          for (const r of preds.filter(x => x.task === t.id)) Object.assign(row(r.roll), { prediction: r.value, predTs: r.ts });
          for (const a of atts.filter(x => x.task === t.id)) {
            const r = row(a.roll); r.attempts++;
            if (a.ok) { r.accepted = true; r.doneTs = a.ts; const fp = JSON.parse(a.vals).fp; if (Array.isArray(fp)) okFp.push([a.roll, fp]); }
          }
          for (const [ra, fa] of okFp) {
            const near = okFp.filter(([rb, fb]) => rb !== ra && close(fa, fb)).map(([rb]) => rb);
            if (near.length) rows[ra].flags.push(`Almost the same numbers as roll ${near.join(', ')}`);
          }
          for (const r of Object.values(rows)) {
            if (r.accepted && r.predTs && r.doneTs - r.predTs < QUICK_MIN * 60e3) r.flags.push(`Finished ${Math.max(0, Math.round((r.doneTs - r.predTs) / 60e3))} min after predicting`);
            if (r.accepted && r.attempts >= 4) r.flags.push(`Needed ${r.attempts} tries`);
            if (!r.accepted && r.attempts >= MAX_ATTEMPTS) r.flags.push('Out of tries');
          }
          return { id: t.id, title: t.title, grade: t.grade, subject: t.subject, revealed: revs.includes(t.id), rows: Object.values(rows).sort((a, b) => a.roll - b.roll) };
        });
        return json({ class: { code: c.code, name: c.name, size: c.size }, tasks, locked });
      }
      return err('Not found', 404);
    } catch (e) {
      return err('Server error. Please try again.', 500);
    }
  },
};
