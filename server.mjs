import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { TOPICS, exerciseSchema, hintSchema, gradeSchema, validateExercise, publicExercise } from './lib/schema.mjs';
import { makeExercise } from './lib/bank.mjs';
import { askAI, generateInstructions } from './lib/ai.mjs';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const dataRoot = fileURLToPath(new URL('./.data/', import.meta.url));
const limiter = new Map();
let activeAI = 0;
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
function authorize(req) {
  const token = process.env.APP_ACCESS_TOKEN;
  if (!token) return;
  const provided = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = Buffer.from(provided), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Nhập mã truy cập trong Cài đặt để tiếp tục.');
}
function rateLimit(req) {
  const key = req.socket.remoteAddress || 'unknown'; const now = Date.now();
  if (limiter.size > 1000) for (const [k, v] of limiter) if (now - v.start > 60000) limiter.delete(k);
  let record = limiter.get(key);
  if (!record || now - record.start > 60000) { record = { start: now, count: 0 }; limiter.set(key, record); }
  if (++record.count > 30) throw new HttpError(429, 'Bạn thao tác quá nhanh. Chờ một phút rồi thử lại.');
}
async function aiCall(...args) {
  if (activeAI >= 4) throw new HttpError(429, 'AI đang xử lý nhiều yêu cầu. Thử lại sau.');
  activeAI++;
  try { return await askAI(...args); } finally { activeAI--; }
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
        return send(res, 200, { aiConfigured: Boolean(process.env.OPENAI_API_KEY), tokenRequired: Boolean(process.env.APP_ACCESS_TOKEN), topics: TOPICS });
      }
      if (url.pathname.startsWith('/api/')) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Yêu cầu từ nguồn không hợp lệ.');
        authorize(req); rateLimit(req);
        if (req.method !== 'POST') throw new HttpError(405, 'Phương thức không hỗ trợ.');
        const body = await readBody(req);
        if (url.pathname === '/api/generate') {
          const topics = body.exam ? TOPICS.map(t => t.id) : [body.topic];
          if (!topics.every(id => TOPICS.some(t => t.id === id))) throw new HttpError(400, 'Chủ đề không hợp lệ.');
          if (!['basic', 'medium'].includes(body.difficulty)) throw new HttpError(400, 'Độ khó không hợp lệ.');
          if (!['ai', 'sample'].includes(body.source)) throw new HttpError(400, 'Nguồn đề không hợp lệ.');
          const generateOne = async topic => {
            const e = body.source === 'sample' ? makeExercise(topic, body.difficulty) : await aiCall(exerciseSchema, 'python_exercise', generateInstructions, {
              topic, difficulty: body.difficulty, scope: TOPICS.find(t => t.id === topic).scope, randomSeed: randomUUID()
            });
            return saveExercise(validateExercise(e, topic), body.source);
          };
          const generated = [];
          for (let i = 0; i < topics.length; i += 2) {
            generated.push(...await Promise.all(topics.slice(i, i + 2).map(generateOne)));
          }
          return send(res, 200, { exercises: generated });
        }
        const exercise = await getExercise(body.id);
        if (url.pathname === '/api/tests') return send(res, 200, { tests: exercise.tests, mode: exercise.mode });
        if (url.pathname === '/api/hint') {
          const level = Math.max(0, Math.min(2, Number.isInteger(body.level) ? body.level : 0));
          if (exercise.source === 'sample') return send(res, 200, { hint: exercise.hints[Math.min(level, exercise.hints.length - 1)], source: 'sample' });
          const result = await aiCall(hintSchema, 'python_hint', 'Đưa đúng một gợi ý theo cấp độ 1–3. Cấp 1 gợi hướng, cấp 2 chỉ logic, cấp 3 chỉ cấu trúc/công thức. Không đưa lời giải hoàn chỉnh. Gợi ý đúng vấn đề trong code hiện tại nếu có.', { exercise: publicExercise(exercise), reference: exercise.reference, level: level + 1, code: String(body.code || '').slice(0, 20000) });
          return send(res, 200, { ...result, source: 'ai' });
        }
        if (url.pathname === '/api/grade') {
          if (typeof body.code !== 'string' || body.code.length > 20000 || !Array.isArray(body.results) || body.results.length !== exercise.tests.length) throw new HttpError(400, 'Bài nộp hoặc kết quả kiểm tra chưa đầy đủ.');
          const results = body.results.map((r, i) => ({ passed: r?.passed === true, error: String(r?.error || '').slice(0, 3000), stdout: String(r?.stdout || '').slice(0, 3000), expected: exercise.tests[i].expected }));
          const passed = results.filter(r => r.passed).length;
          const score = Math.round(passed / results.length * 100) / 10;
          if (exercise.source === 'sample') {
            const failed = results.find(r => !r.passed);
            return send(res, 200, { score, passed, total: results.length, source: 'sample', summary: passed === results.length ? 'Code vượt qua toàn bộ bộ kiểm tra mẫu.' : 'Một số bộ kiểm tra chưa đạt. Xem đầu ra và lỗi bên dưới.',
              strengths: passed ? ['Đúng ' + passed + '/' + results.length + ' bộ kiểm tra.'] : [],
              issues: failed ? [{ line: 0, explanation: failed.error || 'Kết quả chưa khớp định dạng hoặc giá trị mong đợi.', fix: exercise.hints.at(-1) }] : [],
              correctedCode: exercise.reference, explanation: 'Đây là lời giải mẫu, chưa có nhận xét AI. Điểm phản ánh số bộ kiểm tra đạt; xem thêm yêu cầu cấu trúc trong đề.' });
          }
          const result = await aiCall(gradeSchema, 'python_grade', 'Đọc đề, rubric, lời giải tham khảo, code người học và kết quả kiểm tra. Không tự nhận đã chạy code. Nhận xét các lỗi logic/cú pháp/vi phạm yêu cầu (ví dụ dùng sum khi đề yêu cầu for), chỉ dòng lỗi bằng số dòng 1-based; line=0 nếu lỗi chung. Đưa code sửa hoàn chỉnh, giải thích dễ hiểu. Không thay đổi định dạng input/output. Điểm kiểm tra sẽ do máy chủ tính, không sinh điểm.', { exercise: publicExercise(exercise), reference: exercise.reference, code: body.code, results });
          return send(res, 200, { ...result, score, passed, total: results.length, source: 'ai' });
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
      if (!res.headersSent) send(res, error.status || 502, { error: error.name === 'TimeoutError' ? 'AI phản hồi quá lâu. Hãy thử lại.' : error.message || 'Có lỗi xảy ra.' });
      else res.end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('hocpython → http://' + (process.env.HOST || '127.0.0.1') + ':' + (process.env.PORT || 3000)));
}

