import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { makeExercise } from '../lib/bank.mjs';
import { TOPICS, validateExercise, publicExercise } from '../lib/schema.mjs';
import { PYTHON_HARNESS } from '../public/runner-core.js';
import { createServer } from '../server.mjs';

function run(code, tests, mode = 'script') {
  const wrapper = 'import sys\n_task_payload = sys.stdin.read()\n' + PYTHON_HARNESS + '\nprint(_runner_result)';
  const child = spawnSync(process.env.PYTHON_BIN || 'python', ['-X', 'utf8', '-c', wrapper], { input: JSON.stringify({ code, tests, mode }), encoding: 'utf8', timeout: 12000 });
  assert.equal(child.status, 0, child.stderr || String(child.error));
  return JSON.parse(child.stdout);
}
test('Random sample references pass all boundary tests', () => {
  for (const topic of TOPICS) for (let i = 0; i < 5; i++) {
    const e = validateExercise(makeExercise(topic.id), topic.id);
    assert.ok(run(e.reference, e.tests, e.mode).every(r => r.passed), topic.id);
    assert.equal(publicExercise(e).reference, undefined);
    assert.equal(publicExercise(e).tests, undefined);
  }
});
test('Runner catches wrong output, missing input, infinite loops and excess output', () => {
  assert.equal(run('print(2)', [{ input: '', expected: '1' }])[0].passed, false);
  assert.match(run('input()', [{ input: '', expected: '' }])[0].error, /EOFError/);
  assert.match(run('while True:\n    pass', [{ input: '', expected: '' }])[0].error, /quá nhiều bước/);
  assert.match(run('print("a" * 65000)', [{ input: '', expected: '' }])[0].error, /64 KB/);
});
test('Runner compares numeric output and enforces boolean return', () => {
  assert.ok(run('n = int(input())\nprint(n / 2)', [{ input: '0', expected: '0' }, { input: '2', expected: '1' }]).every(r => r.passed));
  assert.equal(run('def f():\n    return 1', [{ expression: 'f()', expected: 'true' }], 'function')[0].passed, false);
  assert.equal(run('def f():\n    return True', [{ expression: 'f()', expected: 'true' }], 'function')[0].passed, true);
});
test('API generation, hints, grading, AI schema contract, validation and access control', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY, originalToken = process.env.APP_ACCESS_TOKEN;
  delete process.env.OPENAI_API_KEY; delete process.env.APP_ACCESS_TOKEN;
  const ids = [];
  const post = async (path, body, headers = {}) => {
    const r = await originalFetch(base + '/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: r.status, value: await r.json() };
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
    if (originalToken === undefined) delete process.env.APP_ACCESS_TOKEN; else process.env.APP_ACCESS_TOKEN = originalToken;
    await new Promise(resolve => server.close(resolve));
    for (const id of ids) await rm(new URL('../.data/' + id + '.json', import.meta.url), { force: true });
  });
  assert.equal((await originalFetch(base + '/api/config').then(r => r.json())).aiConfigured, false);
  const exam = await post('generate', { exam: true, source: 'sample', difficulty: 'basic' });
  assert.equal(exam.status, 200); assert.equal(exam.value.exercises.length, 5);
  ids.push(...exam.value.exercises.map(e => e.id));
  const e = exam.value.exercises[0];
  assert.equal(e.reference, undefined);
  assert.equal((await post('hint', { id: e.id, level: 0 })).status, 200);
  const tests = (await post('tests', { id: e.id })).value.tests;
  const grade = await post('grade', { id: e.id, code: '# blank', results: tests.map(() => ({ passed: false })) });
  assert.equal(grade.value.score, 0); assert.ok(grade.value.correctedCode.includes('input'));
  assert.equal((await post('generate', { topic: 'invalid', source: 'sample', difficulty: 'basic' })).status, 400);
  assert.equal((await post('grade', { id: e.id, code: '', results: [] })).status, 400);
  assert.equal((await post('generate', { topic: 'variables', source: 'ai', difficulty: 'basic' })).status, 503);
  assert.equal((await originalFetch(base + '/.env')).status, 404);
  process.env.APP_ACCESS_TOKEN = 'test-access';
  assert.equal((await post('hint', { id: e.id })).status, 401);
  assert.equal((await post('hint', { id: e.id }, { Authorization: 'Bearer test-access' })).status, 200);
  delete process.env.APP_ACCESS_TOKEN; process.env.OPENAI_API_KEY = 'mock-only-not-real';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.text.format.type, 'json_schema'); assert.equal(body.text.format.strict, true);
    let answer = makeExercise('functions');
    if (body.text.format.name === 'python_hint') answer = { hint: 'Xử lý n < 2 trước.' };
    if (body.text.format.name === 'python_grade') answer = { summary: 'Cần sửa return.', strengths: [], issues: [{ line: 2, explanation: 'Thiếu return.', fix: 'Trả bool.' }], correctedCode: 'def is_prime(n):\n    return n == 2', explanation: 'Sửa cách trả kết quả.' };
    return new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }), { status: 200 });
  };
  const ai = await post('generate', { topic: 'functions', source: 'ai', difficulty: 'basic' });
  assert.equal(ai.status, 200); assert.equal(ai.value.exercises[0].source, 'ai');
  const ae = ai.value.exercises[0]; ids.push(ae.id);
  assert.equal((await post('hint', { id: ae.id, level: 1 })).value.source, 'ai');
  const at = (await post('tests', { id: ae.id })).value.tests;
  const ag = await post('grade', { id: ae.id, code: 'def is_prime(n): pass', results: at.map(() => ({ passed: false })) });
  assert.equal(ag.value.source, 'ai'); assert.equal(ag.value.issues[0].line, 2);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { type: 'insufficient_quota', code: 'credit_balance_exhausted' } }), { status: 429 });
  const quota = await post('hint', { id: ae.id, level: 0 });
  assert.equal(quota.status, 429);
  assert.match(quota.value.error, /credit/);
});

