import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { TOPICS, validateExercise, publicExercise } from './lib/schema.mjs';
import { makeExercise, makeExam } from './lib/bank.mjs';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const dataRoot = fileURLToPath(new URL('./.data/', import.meta.url));
const limiter = new Map();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100000) throw new HttpError(413, 'Dữ liệu quá dài.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
}
function rateLimit(req) {
  const key = req.socket.remoteAddress || 'unknown'; const now = Date.now();
  if (limiter.size > 1000) for (const [k, v] of limiter) if (now - v.start > 60000) limiter.delete(k);
  let record = limiter.get(key);
  if (!record || now - record.start > 60000) { record = { start: now, count: 0 }; limiter.set(key, record); }
  if (++record.count > 30) throw new HttpError(429, 'Bạn thao tác quá nhanh. Chờ một phút rồi thử lại.');
}
async function saveExercise(e, source) {
  const stored = { ...e, id: randomUUID(), source, createdAt: Date.now() };
  await mkdir(dataRoot, { recursive: true });
  await writeFile(resolve(dataRoot, stored.id + '.json'), JSON.stringify(stored));
  return publicExercise(stored);
}
async function getExercise(id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, 'Mã bài không hợp lệ.');
  try { return JSON.parse(await readFile(resolve(dataRoot, id + '.json'), 'utf8')); }
  catch { throw new HttpError(404, 'Không tìm thấy bài. Hãy tạo bài mới.'); }
}
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; style-src 'self'; worker-src 'self'; connect-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/config' && req.method === 'GET') {
        return send(res, 200, { topics: TOPICS });
      }
      if (url.pathname.startsWith('/api/')) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Yêu cầu từ nguồn không hợp lệ.');
        rateLimit(req);
        if (req.method !== 'POST') throw new HttpError(405, 'Phương thức không hỗ trợ.');
        const body = await readBody(req);
        if (url.pathname === '/api/generate') {
          const topics = body.exam ? TOPICS.map(t => t.id) : [body.topic];
          if (!topics.every(id => TOPICS.some(t => t.id === id))) throw new HttpError(400, 'Chủ đề không hợp lệ.');
          const generated = body.exam
            ? makeExam().map(e => saveExercise(validateExercise(e, e.topic), 'sample'))
            : [saveExercise(validateExercise(makeExercise(body.topic, 'basic', body.exerciseNumber), body.topic), 'sample')];
          return send(res, 200, { exercises: await Promise.all(generated) });
        }
        const exercise = await getExercise(body.id);
        if (url.pathname === '/api/tests') return send(res, 200, { tests: exercise.tests, mode: exercise.mode });
        if (url.pathname === '/api/hint') {
          const level = Math.max(0, Math.min(2, Number.isInteger(body.level) ? body.level : 0));
          return send(res, 200, { hint: exercise.hints[Math.min(level, exercise.hints.length - 1)], source: 'bank' });
        }
        if (url.pathname === '/api/grade') {
          if (typeof body.code !== 'string' || body.code.length > 20000 || !Array.isArray(body.results) || body.results.length !== exercise.tests.length) throw new HttpError(400, 'Bài nộp hoặc kết quả kiểm tra chưa đầy đủ.');
          const results = body.results.map((r, i) => ({ passed: r?.passed === true, error: String(r?.error || '').slice(0, 3000), stdout: String(r?.stdout || '').slice(0, 3000), expected: exercise.tests[i].expected }));
          const passed = results.filter(r => r.passed).length;
          const score = Math.round(passed / results.length * 100) / 10;
          const failed = results.find(r => !r.passed);
          return send(res, 200, { score, passed, total: results.length, source: 'bank', summary: passed === results.length ? 'Code vượt qua toàn bộ bộ kiểm tra.' : 'Một số bộ kiểm tra chưa đạt. Xem đầu ra để tìm chỗ cần sửa.',
            strengths: passed ? ['Đúng ' + passed + '/' + results.length + ' bộ kiểm tra.'] : [],
            issues: failed ? [{ line: 0, explanation: failed.error || 'Kết quả chưa khớp định dạng hoặc giá trị mong đợi.', fix: exercise.hints.at(-1) }] : [],
            correctedCode: exercise.reference, explanation: 'Lời giải tham khảo được biên soạn sẵn. Điểm tính theo tỷ lệ bộ test đạt.' });
        }
        throw new HttpError(404, 'Không có API này.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Phương thức không hỗ trợ.');
      const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new HttpError(403, 'Đường dẫn không hợp lệ.');
      let file; try { file = await readFile(path); } catch { throw new HttpError(404, 'Không tìm thấy trang.'); }
      res.setHeader('Content-Type', (mime[extname(path)] || 'application/octet-stream') + '; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : file);
    } catch (error) {
      if (!res.headersSent) send(res, error.status || 500, { error: error.message || 'Có lỗi xảy ra.' });
      else res.end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('hocpython → http://' + (process.env.HOST || '127.0.0.1') + ':' + (process.env.PORT || 3000)));
}


