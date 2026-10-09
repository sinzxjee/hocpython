import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
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
test('API serves ten authored exercises per topic and a five topic exam', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const originalFetch = globalThis.fetch, originalToken = process.env.APP_ACCESS_TOKEN;
  delete process.env.APP_ACCESS_TOKEN;
  const ids = [];
  const post = async (path, body, headers = {}) => {
    const r = await originalFetch(base + '/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: r.status, value: await r.json() };
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.APP_ACCESS_TOKEN; else process.env.APP_ACCESS_TOKEN = originalToken;
    await new Promise(resolve => server.close(resolve));
    for (const id of ids) await rm(new URL('../.data/' + id + '.json', import.meta.url), { force: true });
  });
  assert.deepEqual(Object.keys(await originalFetch(base + '/api/config').then(r => r.json())).sort(), ['topics']);
  const exam = await post('generate', { exam: true });
  assert.equal(exam.status, 200); assert.equal(exam.value.exercises.length, 5);
  ids.push(...exam.value.exercises.map(e => e.id));
  const e = exam.value.exercises[0];
  assert.equal(e.reference, undefined);
  assert.equal((await post('hint', { id: e.id, level: 0 })).status, 200);
  const tests = (await post('tests', { id: e.id })).value.tests;
  const grade = await post('grade', { id: e.id, code: '# blank', results: tests.map(() => ({ passed: false })) });
  assert.equal(grade.value.score, 0); assert.ok(grade.value.correctedCode.includes('input'));
  assert.equal((await post('generate', { topic: 'invalid' })).status, 400);
  assert.equal((await post('grade', { id: e.id, code: '', results: [] })).status, 400);
  for (const topic of TOPICS) {
    for (let number = 1; number <= 10; number++) {
      const response = await post('generate', { topic: topic.id, exerciseNumber: number });
      assert.equal(response.status, 200);
      assert.equal(response.value.exercises[0].exerciseNumber, number);
      ids.push(response.value.exercises[0].id);
    }
  }
  assert.equal((await originalFetch(base + '/.env')).status, 404);
  assert.equal((await post('hint', { id: e.id, level: 0 })).status, 200);
});


