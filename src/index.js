// Stateless verifier. No student data is stored: results are signed codes, and identical sheets hit a short-lived cache.
import { TASKS, TASK_CODE, CODE_TASK, LETTER, FROM_LETTER, textQuestions, normalize, missingQuestions, numbersCheck,
         buildMessages, parseModel, combine, looksInjected, shortLabel } from './grade.js';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...CORS } });
const PROMPT_VERSION = 'v3';
const B32 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();

async function sha(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
const b32 = (bytes, n) => Array.from(bytes.slice(0, n), b => B32[b % 32]).join('');
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const tsEq = (a, b) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
const today = () => new Date().toISOString().slice(2, 10).replace(/-/g, '');

// Code: TASK-LN-YYMMDD-QS-NONCE-SIG   (L = overall level, N = C numbers consistent / X check, QS = one letter per written answer)
async function makeCode(env, taskId, level, numbers, qs, nonce) {
  const body = [TASK_CODE[taskId], LETTER[level] + (numbers === 'consistent' ? 'C' : 'X'), today(), qs, nonce].join('-');
  return `${body}-${b32(await hmac(env.SIGNING_KEY, body), 8)}`;
}
async function readCode(env, code) {
  const parts = String(code || '').trim().toUpperCase().split('-');
  if (parts.length !== 6) return null;
  const [t, ln, d, qs, nonce, sig] = parts;
  const body = parts.slice(0, 5).join('-');
  if (!tsEq(b32(await hmac(env.SIGNING_KEY, body), 8), sig)) return null;
  const taskId = CODE_TASK[t], task = TASKS[taskId];
  if (!task || !/^[GPN][CX]$/.test(ln) || !/^\d{6}$/.test(d)) return null;
  const tq = textQuestions(task);
  if (qs.length !== tq.length || /[^GPN]/.test(qs)) return null;
  return {
    task: taskId, title: task.title, grade: task.grade, subject: task.subject,
    level: FROM_LETTER[ln[0]], numbers: ln[1] === 'C' ? 'consistent' : 'check',
    date: `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`,
    questions: tq.map((q, i) => ({ id: q.id, label: shortLabel(q), level: FROM_LETTER[qs[i]] })),
  };
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
    body: JSON.stringify({ model: env.MODEL || 'gpt-4.1-mini', temperature: 0, max_tokens: 900, response_format: { type: 'json_object' }, messages }),
  });
  if (!r.ok) throw new Error(`model http ${r.status}`);
  const j = await r.json();
  return j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
}

async function verify(env, body, ip) {
  const task = TASKS[body.task];
  if (!task) return json({ error: 'Unknown task.' }, 400);
  const { ans, bad } = normalize(task, body.answers);
  const miss = missingQuestions(task, ans);
  const tq = textQuestions(task);
  const unanswered = miss.filter(id => tq.some(q => q.id === id)).length;
  if (miss.some(id => !tq.some(q => q.id === id)) || unanswered > Math.floor(tq.length * 0.4))
    return json({ ok: false, status: 'incomplete', missing: miss.map(id => task.questions.find(q => q.id === id).label.slice(0, 80)) });

  const numbers = numbersCheck(task, ans, bad);
  const key = 'g:' + b32(await sha(`${PROMPT_VERSION}|${env.MODEL || 'gpt-4.1-mini'}|${task.id}|${JSON.stringify(ans)}`), 24);
  const cached = env.LIMITS && await env.LIMITS.get(key);
  if (!cached && !env.AIPIPE_TOKEN) return json({ error: 'The answer checker is being set up. Your answers are saved on this device; please try again later.' }, 503);
  let levels, nonce;
  if (cached) ({ levels, nonce } = JSON.parse(cached));
  else {
    const day = new Date().toISOString().slice(0, 10);
    if (!(await bump(env, `ip:${ip}:${day}`, Number(env.IP_DAILY_CAP) || 300)) || !(await bump(env, `all:${day}`, Number(env.GLOBAL_DAILY_CAP) || 2000)))
      return json({ error: 'The checker is busy today. Your answers are saved on your device. Try again tomorrow.' }, 429);
    levels = {};
    const toModel = [];
    for (const q of tq) {
      if (ans[q.id].length < 8 || looksInjected(ans[q.id])) levels[q.id] = { level: 'not_yet', evidence: '', feedback: ans[q.id].length < 8 ? 'Write a fuller answer using your own numbers.' : 'Write what you found, in your own words.' };
      else toModel.push(q);
    }
    if (toModel.length) {
      let parsed;
      try { parsed = parseModel(await callModel(env, buildMessages(task, ans, toModel)), toModel, ans); }
      catch (e) { return json({ error: 'Could not check your answers right now. Please try again in a minute.' }, 502); }
      Object.assign(levels, parsed);
    }
    // Same words (ignoring case, spacing and punctuation) give the same code, so exact copies are easy to spot.
    nonce = b32((await sha(JSON.stringify(Object.values(ans)).toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, ' ').trim())).slice(8), 4);
    if (env.LIMITS) await env.LIMITS.put(key, JSON.stringify({ levels, nonce }), { expirationTtl: 604800 });
  }
  const level = combine(levels, numbers);
  const qs = tq.map(q => LETTER[levels[q.id].level]).join('');
  const code = await makeCode(env, task.id, level, numbers.status, qs, nonce);
  return json({
    ok: true, task: task.id, title: task.title, level, numbers: numbers.status, numberNotes: numbers.notes, code,
    questions: tq.map(q => ({ id: q.id, label: shortLabel(q), level: levels[q.id].level, feedback: levels[q.id].feedback })),
  });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), ip = req.headers.get('cf-connecting-ip') || 'local';
    try {
      if (url.pathname === '/api/health') return json({ ok: true, model: env.MODEL || 'gpt-4.1-mini', configured: !!(env.AIPIPE_TOKEN && env.SIGNING_KEY) });
      if (!env.SIGNING_KEY) return json({ error: 'Checker is not configured yet.' }, 503);
      if (url.pathname === '/api/verify' && req.method === 'POST') {
        const text = await req.text();
        if (text.length > 24000) return json({ error: 'Answers are too long.' }, 413);
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
