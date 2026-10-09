import { makeExercise, makeExam } from './bank.js';

function exerciseFor(id) {
  const match = /^bank-(variables|sequences|conditions|loops|functions)-(\d+)$/.exec(id || '');
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 10) throw new Error('Mã bài không hợp lệ. Hãy mở bài mới.');
  return makeExercise(match[1], 'basic', Number(match[2]));
}
function visible(e) {
  const { reference, tests, hints, ...rest } = e;
  return { ...rest, testCount: tests.length, hintCount: hints.length };
}
export async function practice(path, data) {
  if (path === 'generate') return { exercises: (data.exam ? makeExam() : [makeExercise(data.topic, 'basic', data.exerciseNumber)]).map(visible) };
  const e = exerciseFor(data.id);
  if (path === 'tests') return { tests: e.tests, mode: e.mode };
  if (path === 'hint') return { hint: e.hints[Math.min(Math.max(0, data.level || 0), e.hints.length - 1)] };
  if (path === 'grade') {
    if (!Array.isArray(data.results) || data.results.length !== e.tests.length) throw new Error('Kết quả kiểm tra chưa đầy đủ.');
    const passed = data.results.filter(r => r.passed).length;
    const failed = data.results.find(r => !r.passed);
    return { source: 'bank', score: Math.round(passed / e.tests.length * 100) / 10, passed, total: e.tests.length,
      summary: failed ? 'Một số bộ kiểm tra chưa đạt. Xem kết quả để tìm chỗ cần sửa.' : 'Code vượt qua toàn bộ bộ kiểm tra.',
      strengths: passed ? [`Đúng ${passed}/${e.tests.length} bộ kiểm tra.`] : [],
      issues: failed ? [{ line: 0, explanation: failed.error || 'Kết quả chưa khớp với đầu ra mong đợi.', fix: e.hints.at(-1) }] : [],
      correctedCode: e.reference, explanation: 'Lời giải tham khảo được biên soạn sẵn. Điểm tính theo tỷ lệ bộ test đạt.' };
  }
  throw new Error('Thao tác không hợp lệ.');
}

