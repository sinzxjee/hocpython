export const TOPICS = [
  { id: 'variables', name: 'Biến & toán tử', scope: 'Gán và in giá trị; input/output; đổi biến; phép toán; diện tích và chu vi.' },
  { id: 'sequences', name: 'Dữ liệu tuần tự', scope: 'List, tuple, set, string; tổng/max; đếm ký tự; chuyển đổi/thêm phần tử.' },
  { id: 'conditions', name: 'Điều kiện', scope: 'if/elif/else; chẵn lẻ; phân loại theo ngưỡng; năm nhuận; and/or.' },
  { id: 'loops', name: 'Vòng lặp', scope: 'for/while; bảng cửu chương; giai thừa; tổng số lẻ; đếm chữ số.' },
  { id: 'functions', name: 'Hàm', scope: 'def/return; bình phương; số nguyên tố; Fibonacci không vượt n; số hoàn hảo.' }
];
const str = { type: 'string' };
const object = properties => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
export const exerciseSchema = object({
  title: str, statement: str, topic: { type: 'string', enum: TOPICS.map(t => t.id) },
  difficulty: { type: 'string', enum: ['basic', 'medium'] },
  mode: { type: 'string', enum: ['script', 'function'] },
  starter: str, inputFormat: str, outputFormat: str, constraints: str,
  examples: { type: 'array', items: object({ input: str, output: str, explanation: str }) },
  hints: { type: 'array', items: str },
  tests: { type: 'array', items: object({ input: str, expression: str, expected: str }) },
  reference: str, rubric: { type: 'array', items: str }
});
export const hintSchema = object({ hint: str });
export const gradeSchema = object({
  summary: str,
  strengths: { type: 'array', items: str },
  issues: { type: 'array', items: object({ line: { type: 'integer' }, explanation: str, fix: str }) },
  correctedCode: str, explanation: str
});
export function validateExercise(e, topic) {
  if (!e || e.topic !== topic || !['script', 'function'].includes(e.mode)) throw new Error('Đề AI không đúng chủ đề hoặc kiểu bài.');
  for (const key of ['title', 'statement', 'starter', 'reference', 'inputFormat', 'outputFormat', 'constraints']) {
    if (typeof e[key] !== 'string' || e[key].length > 20000) throw new Error('Đề AI thiếu dữ liệu hoặc quá dài.');
  }
  if (!e.statement.trim() || !e.reference.trim()) throw new Error('Đề AI chưa hoàn chỉnh.');
  for (const field of ['hints', 'rubric', 'examples', 'tests']) if (!Array.isArray(e[field])) throw new Error('Đề AI thiếu ' + field);
  if (e.tests.length < 3 || e.tests.length > 12 || e.examples.length < 1 || e.examples.length > 3 || e.hints.length < 1) throw new Error('Số ví dụ hoặc bộ kiểm tra chưa phù hợp.');
  for (const t of e.tests) {
    if (!t || ['input', 'expression', 'expected'].some(k => typeof t[k] !== 'string' || t[k].length > 4000)) throw new Error('Bộ kiểm tra không hợp lệ.');
    if (e.mode === 'function' && !t.expression.trim()) throw new Error('Bài hàm thiếu lời gọi kiểm tra.');
  }
  return e;
}
export function publicExercise(e) {
  const { reference, tests, hints, ...visible } = e;
  return { ...visible, testCount: tests.length, hintCount: hints.length };
}

