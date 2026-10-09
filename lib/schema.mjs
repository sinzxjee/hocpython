export const TOPICS = [
  { id: 'variables', name: 'Biến & toán tử', scope: 'Gán/hiển thị giá trị, input/output và phép toán.' },
  { id: 'sequences', name: 'Dữ liệu tuần tự', scope: 'Danh sách, chuỗi, tuple, set và thao tác dữ liệu.' },
  { id: 'conditions', name: 'Điều kiện', scope: 'if/elif/else, so sánh, and/or và phân loại theo ngưỡng.' },
  { id: 'loops', name: 'Vòng lặp', scope: 'for/while, range, biến tích lũy và đếm.' },
  { id: 'functions', name: 'Hàm', scope: 'def, tham số, return và các hàm xử lý số cơ bản.' }
];

export function validateExercise(e, topic) {
  if (!e || e.topic !== topic || !['script', 'function'].includes(e.mode)) throw new Error('Bài tập không khớp chủ đề hoặc kiểu bài.');
  for (const key of ['title', 'statement', 'starter', 'reference', 'inputFormat', 'outputFormat', 'constraints']) {
    if (typeof e[key] !== 'string' || e[key].length > 20000) throw new Error('Bài tập thiếu dữ liệu hoặc quá dài.');
  }
  if (!e.statement.trim() || !e.reference.trim()) throw new Error('Bài tập chưa hoàn chỉnh.');
  for (const field of ['hints', 'rubric', 'examples', 'tests']) if (!Array.isArray(e[field])) throw new Error('Bài tập thiếu ' + field);
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

