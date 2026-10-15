// Stateless verifier. No student data is stored: results are signed codes, and identical sheets hit a short-lived cache.
import { runLab } from './lab.js';
import { TASKS, TASK_CODE, CODE_TASK, LETTER, FROM_LETTER, gradedQuestions, textQuestions, normalize, missingQuestions,
         scoreRules, combine, looksInjected, buildMessages, parseModel, caseFor, FEEDBACK } from './grade.js';

const PROMPT_VERSION = 'v5';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...CORS } });
const B32 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();

async function sha(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
const b32 = (bytes, n) => Array.from(bytes.slice(0, n), b => B32[b % B32.length]).join('');
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const tsEq = (a, b) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
const today = () => new Date().toISOString().slice(2, 10).replace(/-/g, '');

// Code: TASK-LC-YYMMDD-SS-ITEMS-NONCE-SIG  (L overall level; SS the student's set number; ITEMS = one letter per scored question)
async function makeCode(env, taskId, level, set, items, nonce) {
  const body = [TASK_CODE[taskId], LETTER[level] + 'C', today(), String(set), items, nonce].join('-');
  return `${body}-${b32(await hmac(env.SIGNING_KEY, body), 8)}`;
}
async function readCode(env, code) {
  const parts = String(code || '').trim().toUpperCase().split('-');
  if (parts.length !== 7) return null;
  const [t, ln, d, set, items, nonce, sig] = parts;
  if (!tsEq(b32(await hmac(env.SIGNING_KEY, parts.slice(0, 6).join('-')), 8), sig)) return null;
  const task = TASKS[CODE_TASK[t]];
  if (!task || !/^[GPN]C$/.test(ln) || !/^\d{6}$/.test(d) || !/^\d{2}$/.test(set)) return null;
  const gq = gradedQuestions(task);
  if (items.length !== gq.length || /[^GPN]/.test(items)) return null;
  return {
    task: task.id, title: task.title, grade: task.grade, subject: task.subject,
    level: FROM_LETTER[ln[0]], set: Number(set), date: `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`,
    questions: gq.map((q, i) => ({ id: q.id, label: q.short, level: FROM_LETTER[items[i]] })),
  };
}

// The set number is assigned by the checker from the browser id, so someone else cannot run your lab.
const cidOk = c => /^[a-z0-9]{8,24}$/.test(String(c || ''));
async function setFor(env, cid) {
  const h = await hmac(env.SIGNING_KEY, 'set:' + cid);
  return 10 + ((h[0] * 16777216 + h[1] * 65536 + h[2] * 256 + h[3]) % 90);
}

async function bump(env, key, cap) {
  if (!env.LIMITS) return true;
  const n = Number(await env.LIMITS.get(key)) || 0;
  if (n >= cap) return false;
  await env.LIMITS.put(key, String(n + 1), { expirationTtl: 172800 });
  return true;
}

async function callModel(env, messages) {
  const r = await fetch(`${env.AIPIPE_BASE || 'https://aipipe.org/openai/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.AIPIPE_TOKEN}` },
    body: JSON.stringify({ model: env.MODEL || 'gpt-4.1-mini', temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages }),
  });
  if (!r.ok) throw new Error(`model http ${r.status}`);
  const j = await r.json();
  return j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
}

async function verify(env, body, ip) {
  const task = TASKS[body.task];
  if (!task) return json({ error: 'Unknown task.' }, 400);
  if (!cidOk(body.cid)) return json({ error: 'Please reload the page.' }, 400);
  const set = await setFor(env, body.cid);
  if (Number(body.set) !== set) return json({ error: 'Please reload the page.' }, 400);
  const c = caseFor(set);
  const { ans, bad } = normalize(task, body.answers);
  const miss = missingQuestions(task, ans);
  if (miss.length) return json({ ok: false, status: 'incomplete', missing: miss.map(id => task.questions.find(q => q.id === id).short) });

  const key = 'g:' + b32(await sha(`${PROMPT_VERSION}|${env.MODEL || 'gpt-4.1-mini'}|${task.id}|${set}|${JSON.stringify(ans)}`), 24);
  const cached = env.LIMITS && await env.LIMITS.get(key);
  if (!cached && !env.AIPIPE_TOKEN) return json({ error: 'The answer checker is being set up. Your answers are saved on this device; please try again later.' }, 503);

  const items = scoreRules(task, ans, bad, c);
  let verdicts, nonce;
  if (cached) ({ verdicts, nonce } = JSON.parse(cached));
  else {
    const day = new Date().toISOString().slice(0, 10);
    // Retrying one task with many different answers would map the answer key. Cap per browser (and per network, which is larger
    // because a school shares one address). Changing the set number does not reset it.
    const cid = body.cid;
    if (!(await bump(env, `try:${cid}:${task.id}:${day}`, Number(env.TRY_CAP) || 8)) || !(await bump(env, `tip:${ip}:${task.id}:${day}`, Number(env.NET_TRY_CAP) || 200)))
      return json({ error: 'That is a lot of tries for this task today. Ask your teacher, or try again tomorrow.' }, 429);
    if (!(await bump(env, `ip:${ip}:${day}`, Number(env.IP_DAILY_CAP) || 300)) || !(await bump(env, `all:${day}`, Number(env.GLOBAL_DAILY_CAP) || 2000)))
      return json({ error: 'The checker is busy today. Your answers are saved on your device. Try again tomorrow.' }, 429);
    verdicts = {};
    const toModel = [];
    for (const q of textQuestions(task)) {
      if (ans[q.id].length < 8) verdicts[q.id] = { verdict: 'no', reason: 'too_short' };
      else if (looksInjected(ans[q.id])) verdicts[q.id] = { verdict: 'no', reason: 'injection' };
      else toModel.push(q);
    }
    if (toModel.length) {
      try { Object.assign(verdicts, parseModel(await callModel(env, buildMessages(task, ans, c, toModel)), toModel, ans)); }
      catch (e) { return json({ error: 'Could not check your answers right now. Please try again in a minute.' }, 502); }
    }
    // Same words (ignoring case, spacing and punctuation) give the same code, so exact copies are easy to spot.
    nonce = b32((await sha(JSON.stringify(Object.values(ans)).toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, ' ').trim())).slice(8), 4);
    if (env.LIMITS) await env.LIMITS.put(key, JSON.stringify({ verdicts, nonce }), { expirationTtl: 604800 });
  }
  const { level } = combine(items, Object.entries(verdicts).map(([id, v]) => ({ id, ...v })));
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const questions = gradedQuestions(task).map(q => {
    if (q.kind === 'T') { const v = verdicts[q.id]; return { id: q.id, label: q.short, level: v.verdict === 'ok' ? 'got_it' : v.verdict === 'partial' ? 'partly' : 'not_yet', feedback: FEEDBACK[v.verdict] }; }
    const ok = byId[q.id].ok;
    return { id: q.id, label: q.short, level: ok ? 'got_it' : 'not_yet', feedback: ok ? FEEDBACK.rule_ok : FEEDBACK.rule_bad };
  });
  const letters = questions.map(q => LETTER[q.level]).join('');
  const code = await makeCode(env, task.id, level, set, letters, nonce);
  return json({ ok: true, task: task.id, title: task.title, level, code, questions });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), ip = req.headers.get('cf-connecting-ip') || 'local';
    try {
      if (url.pathname === '/api/health') return json({ ok: true, model: env.MODEL || 'gpt-4.1-mini', configured: !!(env.AIPIPE_TOKEN && env.SIGNING_KEY) });
      if (!env.SIGNING_KEY) return json({ error: 'Checker is not configured yet.' }, 503);
      if (url.pathname === '/api/set') {
        const cid = url.searchParams.get('cid');
        return cidOk(cid) ? json({ ok: true, set: await setFor(env, cid) }) : json({ error: 'Bad browser id.' }, 400);
      }
      if (url.pathname === '/api/lab' && req.method === 'POST') {
        const text = await req.text();
        if (text.length > 600) return json({ error: 'Bad request.' }, 413);
        let b; try { b = JSON.parse(text); } catch { return json({ error: 'Bad request.' }, 400); }
        if (!cidOk(b.cid) || !TASKS[b.task]) return json({ error: 'Bad request.' }, 400);
        const day = new Date().toISOString().slice(0, 10);
        if (!(await bump(env, `lab:${b.cid}:${day}`, Number(env.LAB_CAP) || 200)) || !(await bump(env, `labip:${ip}:${day}`, 3000)))
          return json({ error: 'That is a lot of runs for today. Try again tomorrow.' }, 429);
        const r = runLab(b.task, await setFor(env, b.cid), b.inputs);
        return r ? json({ ok: true, ...r }) : json({ error: 'This task has no lab.' }, 400);
      }
      if (url.pathname === '/api/verify' && req.method === 'POST') {
        const text = await req.text();
        if (text.length > 12000) return json({ error: 'Answers are too long.' }, 413);
        let body; try { body = JSON.parse(text); } catch { return json({ error: 'Bad request.' }, 400); }
        return await verify(env, body, ip);
      }
      if (url.pathname === '/api/check') {
        const day = new Date().toISOString().slice(0, 10);
        if (!(await bump(env, `chk:${ip}:${day}`, 300))) return json({ error: 'Too many checks from this network today.' }, 429);
        const r = await readCode(env, url.searchParams.get('code'));
        return r ? json({ ok: true, ...r }) : json({ ok: false, error: 'This code is not valid. Check it was copied exactly.' }, 404);
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Server error. Please try again.' }, 500);
    }
  },
};
