import { practice } from './practice.js';
import { makeExercise } from './bank.js';
const $ = id => document.getElementById(id);
const KEY = 'hocpython:v3';
const topicData = {
  home: { title: 'Tổng quan', subtitle: 'Không gian luyện Python của bạn.' },
  variables: { title: 'Biến & toán tử', subtitle: 'Bắt đầu với các giá trị, phép tính và một chương trình nhỏ.', tags: 'input · print · toán tử', text: 'input() trả về chuỗi. Dùng int() hoặc float() để tính toán. +, -, *, /, //, %, ** lần lượt là cộng, trừ, nhân, chia, chia nguyên, chia dư và lũy thừa.', code: 'gia = float(input())\nso_luong = int(input())\nprint(gia * so_luong)' },
  sequences: { title: 'Dữ liệu tuần tự', subtitle: 'Danh sách, chuỗi, tuple và set: giữ dữ liệu ở đúng chỗ.', tags: 'list · string · tuple · set', text: 'List có thể sửa và thêm phần tử. Tuple không thay đổi tại chỗ. Set loại trùng và không bảo đảm thứ tự. String là chuỗi ký tự. sum(), max(), count() hỗ trợ xử lý dữ liệu.', code: 'a = list(map(int, input().split()))\nprint(sum(a), max(a))\na.append(10)\nt = tuple(a)\ns = set(a)' },
  conditions: { title: 'Điều kiện', subtitle: 'Phân loại và lựa chọn bằng if, elif, else.', tags: 'if · elif · else · and/or', text: 'Nhánh if đúng sẽ chạy trước; elif xét khi nhánh trước sai. else xử lý trường hợp còn lại. == so sánh bằng, = dùng để gán. Chú ý các giá trị đúng tại ngưỡng.', code: 'diem = float(input())\nif diem >= 8:\n    print("Giỏi")\nelif diem >= 6.5:\n    print("Khá")\nelse:\n    print("Cần cố gắng")' },
  loops: { title: 'Vòng lặp', subtitle: 'Dùng for và while để chương trình làm việc lặp lại.', tags: 'for · while · range', text: 'range(a, b) không bao gồm b. Khởi tạo biến tích lũy trước vòng lặp. Với while, cập nhật điều kiện trong vòng lặp để tránh chạy vô hạn. 0! = 1 và số 0 có một chữ số.', code: 'n = int(input())\ntong = 0\nfor i in range(1, n + 1):\n    tong += i\nprint(tong)' },
  functions: { title: 'Hàm', subtitle: 'Định nghĩa một lần, gọi lại khi cần.', tags: 'def · tham số · return', text: 'def định nghĩa hàm; return trả kết quả cho nơi gọi. print chỉ in ra màn hình. Với bài hàm, đúng tên hàm và kiểu trả về rất quan trọng. Số nhỏ hơn 2 không phải số nguyên tố.', code: 'def binh_phuong(n):\n    return n ** 2\n\nprint(binh_phuong(5))' },
  exam: { title: 'Thi thử giữa kỳ', subtitle: 'Một bài kiểm tra với đủ 5 chủ đề. 60 phút. 10 điểm.' }
};
function restore() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && v.sessions && typeof v.sessions === 'object' && !Array.isArray(v.sessions) && Array.isArray(v.history)) return v;
  } catch {}
  return { topic: 'home', sessions: {}, history: [], exerciseNumbers: {} };
}
const state = restore();
if (!topicData[state.topic]) state.topic = 'home';
let busy = false, cancelRunner = null, toastTimeout, saveTimeout;
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('Không thể lưu tiến độ trên trình duyệt này.'); }
}
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').hidden = true, 5500);
}
function session() { return state.sessions[state.topic]; }
function current() { return session()?.items?.[session().index || 0]; }
function setBusy(value, label = '') {
  busy = value;
  $('generate').classList.toggle('loading-skeleton',value && state.topic!=='home');
  ['generate', 'run', 'submit', 'submit-all', 'hint', 'reset', 'exercise-number'].forEach(id => $(id).disabled = value);
  document.querySelectorAll('[data-topic]').forEach(button => button.disabled = value);
  $('code').disabled = value || Boolean(session()?.ended);
  if (label) $('runtime-status').textContent = label;
  if (!value) {
    $('runtime-status').textContent = 'Python / sẵn sàng khi chạy';
    $('hint').disabled = Boolean(session()?.ended) || (current()?.hints?.length || 0) >= (current()?.exercise?.hintCount || 0);
    $('generate').textContent = state.topic === 'exam' ? 'Tạo đề 5 câu ↗' : 'Mở bài ↗';
    $('submit').textContent = 'Nộp & xem kết quả ↗';
    $('cancel-run').hidden = true;
  }
}
async function api(path, data) { return practice(path, data); }
function showStats() {
  $('completed').textContent = state.history.length + ' bài đã nộp';
  const scores = state.history.map(h => h.score);
  $('best').textContent = scores.length ? Math.max(...scores).toFixed(1) + '/10 điểm cao nhất' : '— điểm cao nhất';
}
const topicKeys = ['variables','sequences','conditions','loops','functions'];
const fieldByTopic = {variables:'Tài chính',sequences:'Kế toán',conditions:'Marketing',loops:'Kinh tế vĩ mô',functions:'Tài chính'};
const difficultyByNumber = ['Dễ','Dễ','Dễ','Trung bình','Trung bình','Trung bình','Trung bình','Khó','Khó','Khó'];
function exerciseMeta(topic,n,exercise){const text=(exercise.title+' '+exercise.statement).toLowerCase();let field=fieldByTopic[topic];if(/doanh thu|khách hàng|chiến dịch|tỉ lệ chuyển đổi/.test(text))field='Marketing';if(/thuế|hóa đơn|kế toán|tồn kho|giao dịch|mã hàng/.test(text))field='Kế toán';if(/lạm phát|gdp|tăng trưởng|tỷ giá|lãi suất|ngoại tệ/.test(text))field='Kinh tế vĩ mô';if(/lương|lãi|vốn|đầu tư|cổ phiếu|giảm giá|lợi nhuận/.test(text))field='Tài chính';return{difficulty:difficultyByNumber[n-1]||'Trung bình',field};}
function openExercise(topic,number){state.topic=topic;state.exerciseNumbers[topic]=number;save();render();if(!state.sessions[topic]||state.sessions[topic].items?.[0]?.exercise?.exerciseNumber!==number)generate();}
function renderDashboard(){const total=state.history.length,best=total?Math.max(...state.history.map(h=>h.score||0)):0;const dates=new Set(state.history.map(h=>new Date(h.at).toLocaleDateString('sv-SE')));let streak=0,day=new Date();if(!dates.has(day.toLocaleDateString('sv-SE')))day.setDate(day.getDate()-1);while(dates.has(day.toLocaleDateString('sv-SE'))&&streak<365){streak++;day.setDate(day.getDate()-1);}$('dashboard-stats').innerHTML='<div><b>'+total+'</b><span>bài đã nộp</span></div><div><b>'+best.toFixed(1)+'</b><span>điểm cao nhất / 10</span></div><div><b>'+streak+' ngày</b><span>chuỗi học liên tiếp</span></div><div><b>50</b><span>bài trong 5 chủ đề</span></div>';$('progress-list').innerHTML=topicKeys.map(key=>{const ids=new Set(state.history.filter(h=>h.topic===key).map(h=>h.id));const pct=Math.min(100,ids.size*10);return '<div class="progress-row"><div><span>'+escape(topicData[key].title)+'</span><small>'+ids.size+'/10 bài</small></div><div class="progress-track"><i style="width:'+pct+'%"></i></div></div>';}).join('');let pick;outer:for(const topic of topicKeys){for(let n=1;n<=10;n++){const ex=makeExercise(topic,'basic',n);if(!state.history.some(h=>h.id===ex.id&&h.score===10)){pick={topic,n,ex};break outer;}}}if(!pick){const h=[...state.history].reverse().find(x=>x.score<10),m=h?.id.match(/^bank-(variables|sequences|conditions|loops|functions)-(\d+)$/);if(m)pick={topic:m[1],n:+m[2],ex:makeExercise(m[1],'basic',+m[2])};}$('recommendation').innerHTML=pick?'<button class="recommend-card" data-open-topic="'+pick.topic+'" data-open-number="'+pick.n+'"><span class="eyebrow">'+escape(topicData[pick.topic].title)+' · BÀI '+String(pick.n).padStart(2,'0')+'</span><b>'+escape(pick.ex.title)+'</b><span>'+escape(pick.ex.statement)+'</span><i>Bắt đầu bài này ↗</i></button>':'<p>Bạn đã hoàn thành cả 50 bài với điểm tối đa.</p>';$('recent-list').innerHTML=state.history.length?[...state.history].reverse().slice(0,6).map(h=>{const m=(h.id||'').match(/^bank-(variables|sequences|conditions|loops|functions)-(\d+)$/);if(!m)return '';const ex=makeExercise(m[1],'basic',+m[2]);return '<button class="recent-row" data-open-topic="'+m[1]+'" data-open-number="'+m[2]+'"><span>'+escape(ex.title)+'<small>'+escape(topicData[m[1]].title)+' · '+new Date(h.at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})+'</small></span><b>'+Number(h.score||0).toFixed(1)+'</b></button>';}).join(''):'<p class="muted">Bài đã nộp sẽ xuất hiện ở đây.</p>';const filter=()=>{const q=$('finder-search').value.trim().toLowerCase(),topic=$('finder-topic').value,level=$('finder-level').value,field=$('finder-field').value;let rows=[];for(const key of topicKeys){if(topic!=='all'&&topic!==key)continue;for(let n=1;n<=10;n++){const ex=makeExercise(key,'basic',n),meta=exerciseMeta(key,n,ex),blob=[ex.title,ex.statement,ex.inputFormat,ex.outputFormat,ex.reference,ex.hints.join(' '),key,meta.field].join(' ').toLowerCase();if(q&&!blob.includes(q))continue;if(level!=='all'&&level!==meta.difficulty)continue;if(field!=='all'&&field!==meta.field)continue;rows.push('<button class="finder-card" data-open-topic="'+key+'" data-open-number="'+n+'"><span>'+escape(topicData[key].title)+' · '+meta.difficulty+' · '+meta.field+'</span><b>'+String(n).padStart(2,'0')+' / '+escape(ex.title)+'</b><small>'+escape(ex.statement)+'</small></button>');}}$('finder-results').innerHTML=rows.length?rows.join(''):'<p class="empty-result">Không tìm thấy bài phù hợp.</p>';};['finder-search','finder-topic','finder-level','finder-field'].forEach(id=>$(id).oninput=filter);$('finder-results').onclick=$('recommendation').onclick=$('recent-list').onclick=e=>{const b=e.target.closest('[data-open-topic]');if(b)openExercise(b.dataset.openTopic,Number(b.dataset.openNumber));};}

function updateLines() {
  const n = $('code').value.split('\n').length;
  $('line-numbers').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
  $('code-info').textContent = n + ' dòng';
  $('line-numbers').scrollTop = $('code').scrollTop;
}
function renderFeedback(item) {
  const f = item?.grade;
  $('feedback').hidden = !f;
  if (!f) return;
  const issues = Array.isArray(f.issues) ? f.issues : [];
  $('feedback').innerHTML = '<div class="feedback-top"><div><p class="eyebrow">KẾT QUẢ BỘ TEST</p><h2>' + escape(f.summary) + '</h2><p class="muted">' + f.passed + '/' + f.total + ' bộ kiểm tra đạt. Điểm tính tự động từ kết quả chạy code.</p></div><div class="score">' + f.score.toFixed(1) + '<small> / 10</small></div></div>' +
    (f.strengths?.length ? '<ul>' + f.strengths.map(s => '<li>' + escape(s) + '</li>').join('') + '</ul>' : '') +
    issues.map(i => '<div class="issue"><strong>' + (i.line > 0 ? 'Dòng ' + i.line : 'Cần xem lại') + '</strong><p>' + escape(i.explanation) + '</p><p class="muted">' + escape(i.fix) + '</p></div>').join('') +
    '<p>' + escape(f.explanation) + '</p><details><summary>Xem lời giải tham khảo</summary><pre>' + escape(f.correctedCode) + '</pre><button class="outline" id="copy-solution">Sao chép code</button></details>';
  $('copy-solution').onclick = async () => {
    try { await navigator.clipboard.writeText(f.correctedCode); toast('Đã sao chép lời giải.'); }
    catch { toast('Không sao chép được. Bạn có thể chọn code và sao chép thủ công.'); }
  };
}
function renderTests(item) {
  const results = item?.results || [];
  $('checks').hidden = !results.length;
  $('test-results').innerHTML = results.map((r, i) => '<details class="check"><summary>' + (r.passed ? '✓' : '×') + ' Test ' + String(i + 1).padStart(2, '0') + ' / ' + (r.passed ? 'đạt' : 'chưa đạt') + '</summary><pre>' +
    escape('Đầu vào: ' + (item.tests?.[i]?.expression || item.tests?.[i]?.input || '(rỗng)') + '\nMong đợi: ' + (item.tests?.[i]?.expected || '') + '\nThực tế: ' + r.stdout + (r.error ? '\nLỗi: ' + r.error : '')) + '</pre></details>').join('');
}
function renderExamSummary() {
  const s = session();
  if (state.topic !== 'exam' || !s?.submitted) { $('exam-result').hidden = true; return; }
  const all = s.items.every(i => i.grade && i.gradedCode === i.code);
  const score = s.items.reduce((sum, i) => sum + (i.grade?.score || 0) / 5, 0);
  $('exam-result').hidden = false;
  $('exam-result').innerHTML = '<p class="eyebrow">KẾT QUẢ THI THỬ</p><h2>' + (all ? score.toFixed(1) + ' / 10 điểm' : 'Một số câu chưa chấm xong') + '</h2>' +
    s.items.map((item, i) => '<p>Câu ' + (i + 1) + ' / ' + escape(topicData[item.exercise.topic].title) + ': ' + (item.grade ? (item.grade.score / 5).toFixed(1) + '/2 điểm' : 'chưa chấm — có thể nộp lại') + '</p>').join('') +
    '<p class="muted">Điểm được tính bằng bộ test chạy trong trình duyệt. Mở từng câu để xem lời giải tham khảo và tự đối chiếu.</p>';
}
function render() {
  const t = topicData[state.topic]; const s = session(); const item = current(); const e = item?.exercise; const home = state.topic === 'home';
  $('dashboard').hidden = !home; ['page-heading','toolbar','notice','theory','exam-intro','exam-bar','workspace','feedback','exam-result','empty'].forEach(id => { $(id).hidden = home; });
  document.querySelectorAll('[data-topic]').forEach(b => { b.classList.toggle('active', b.dataset.topic === state.topic); b.setAttribute('aria-current', b.dataset.topic === state.topic ? 'page' : 'false'); });
  $('title').textContent = t.title + '_';
  $('subtitle').textContent = t.subtitle;
  $('eyebrow').textContent = state.topic === 'exam' ? 'THI THỬ / KHỐI NGÀNH KINH TẾ' : 'PYTHON / CHỦ ĐỀ ' + String(topicKeys.indexOf(state.topic) + 1).padStart(2, '0');
  $('generate').textContent = state.topic === 'exam' ? 'Tạo đề 5 câu ↗' : 'Mở bài ↗';
  $('mode-note').textContent = state.topic === 'exam' ? '5 câu · 60 phút · 10 điểm' : '10 bài soạn sẵn trong chủ đề.';
  $('exercise-number').hidden = state.topic === 'exam' || home; $('mode-note').hidden=home; $('generate').hidden=home;
  if (state.topic !== 'exam') {
    const selected = state.exerciseNumbers[state.topic] || 1;
    $('exercise-number').innerHTML = Array.from({ length: 10 }, (_, i) => '<option value="' + (i + 1) + '">Bài ' + String(i + 1).padStart(2, '0') + '</option>').join('');
    $('exercise-number').value = String(selected);
  }
  $('theory').hidden = state.topic === 'exam' || home;
  if (t.text) {
    $('theory-tags').textContent = t.tags;
    $('theory-content').innerHTML = '<p>' + escape(t.text) + '</p><pre>' + escape(t.code) + '</pre>';
  }
  $('exam-intro').hidden = home || state.topic !== 'exam' || Boolean(s);
  $('exam-bar').hidden = home || state.topic !== 'exam' || !s;
  $('empty').hidden = home || Boolean(e) || state.topic === 'exam';
  $('workspace').hidden = home || !e;
  $('feedback').hidden = true;
  $('exam-result').hidden = true;
  showStats();
  if (!e) return;
  $('problem-meta').textContent = state.topic === 'exam' ? 'CÂU ' + String(s.index + 1).padStart(2, '0') + ' / ' + topicData[e.topic].title : 'BÀI TẬP / ' + topicData[e.topic].title;
  $('problem-source').textContent = 'Bài ' + String(e.exerciseNumber || 1).padStart(2, '0') + ' / 10';
  $('problem-title').textContent = e.title; $('statement').textContent = e.statement;
  $('input-format').textContent = e.inputFormat; $('output-format').textContent = e.outputFormat;
  $('constraints').textContent = e.constraints;
  $('rubric').innerHTML = e.rubric.map(r => '<li>' + escape(r) + '</li>').join('');
  $('examples').innerHTML = e.examples.map((x, i) => '<div class="example"><h3>Ví dụ ' + (i + 1) + '</h3><div class="example-grid"><div><small>đầu vào / lời gọi</small><pre>' + escape(x.input) + '</pre></div><div><small>đầu ra</small><pre>' + escape(x.output) + '</pre></div></div><p>' + escape(x.explanation) + '</p></div>').join('');
  $('code').value = item.code; $('code').disabled = busy || Boolean(s.ended); updateLines();
  $('stdin').value = item.stdin;
  $('stdin').placeholder = e.mode === 'function' ? 'is_prime(7)' : 'Dữ liệu cho input(), mỗi giá trị một dòng';
  $('stdin-note').textContent = e.mode === 'function' ? 'lời gọi hàm, ví dụ is_prime(7)' : 'mỗi input() nhận một dòng';
  $('output').textContent = item.output || 'Chạy thử để kiểm tra chương trình.';
  $('output').classList.toggle('error', Boolean(item.outputError));
  $('hints').innerHTML = item.hints.map(h => '<li>' + escape(h) + '</li>').join('');
  $('hint-note').hidden = Boolean(item.hints.length);
  const hintCount = item.exercise.hintCount || 0;
  $('hint').textContent = item.hints.length >= hintCount ? 'Đã mở hết gợi ý' : 'Mở gợi ý ' + (item.hints.length + 1) + ' / ' + hintCount;
  $('hint').disabled = busy || Boolean(s.ended) || item.hints.length >= hintCount;
  renderFeedback(item); renderTests(item);
  if (state.topic === 'exam') {
    $('question-tabs').innerHTML = s.items.map((q, i) => '<button data-index="' + i + '" class="' + (i === s.index ? 'active' : '') + '">Câu ' + (i + 1) + (q.grade ? ' ✓' : '') + '</button>').join('');
    $('question-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { if (busy) return; s.index = Number(b.dataset.index); save(); render(); });
    $('submit-all').textContent = s.submitted ? 'Kiểm tra lại câu chưa xong' : 'Nộp toàn bộ';
    renderExamSummary(); updateTimer();
  }
}
function itemFrom(exercise) { return { exercise, code: exercise.starter, stdin: exercise.examples[0]?.input || '', hints: [], results: [], output: '', grade: null }; }
async function generate() {
  if (busy) return;
  const old = session();
  if (old?.items.some(i => i.code !== i.exercise.starter) && !confirm('Tạo bài mới sẽ thay bài hiện tại trong chủ đề này. Tiếp tục?')) return;
  setBusy(true); $('generate').textContent = state.topic === 'exam' ? 'Đang tạo 5 câu…' : 'Đang tạo bài…';
  try {
    const response = await api('generate', { topic: state.topic, exam: state.topic === 'exam', exerciseNumber: Number($('exercise-number').value) });
    state.sessions[state.topic] = { items: response.exercises.map(itemFrom), index: 0, deadline: state.topic === 'exam' ? Date.now() + 3600000 : null, ended: false, submitted: false };
    if (state.topic !== 'exam') state.exerciseNumbers[state.topic] = Number($('exercise-number').value);
    save(); render();
    toast(state.topic === 'exam' ? 'Đề đã sẵn sàng. Đồng hồ bắt đầu.' : 'Bài mới đã sẵn sàng.');
  } catch (error) { toast(error.message); } finally { setBusy(false); }
}
function runPython(code, tests, mode) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    let done = false;
    let timeout = setTimeout(() => finish(new Error('Không tải được Python. Kiểm tra mạng hoặc CDN rồi thử lại.')), 90000);
    function finish(error, result) {
      if (done) return;
      done = true; clearTimeout(timeout); worker.terminate(); cancelRunner = null;
      $('cancel-run').hidden = true;
      if (error) reject(error); else resolve(result);
    }
    cancelRunner = () => finish(new Error('Đã dừng chạy code.'));
    $('cancel-run').hidden = false;
    $('runtime-status').textContent = 'Đang tải Python…';
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(timeout); timeout = setTimeout(() => finish(new Error('Code chạy quá 8 giây. Kiểm tra vòng lặp hoặc giảm dữ liệu.')), 8000);
        $('runtime-status').textContent = 'Đang chạy…';
      } else if (data.type === 'result') { $('runtime-status').textContent = 'Python / đã chạy'; finish(null, data.results); }
      else if (data.type === 'error') finish(new Error(data.error));
    };
    worker.onerror = () => finish(new Error('Không khởi tạo được Python worker. Kiểm tra mạng rồi thử lại.'));
    worker.postMessage({ code, tests, mode });
  });
}
async function run() {
  const item = current();
  if (busy || !item) return;
  setBusy(true);
  try {
    const test = { input: item.exercise.mode === 'script' ? $('stdin').value : '', expression: item.exercise.mode === 'function' ? $('stdin').value : '', expected: '' };
    if (item.exercise.mode === 'function' && !test.expression.trim()) throw new Error('Nhập lời gọi hàm vào ô đầu vào để chạy thử.');
    const [result] = await runPython(item.code, [test], item.exercise.mode);
    item.output = result.error || result.stdout || '(Chương trình không in kết quả)';
    item.outputError = Boolean(result.error); save(); render();
  } catch (error) { item.output = error.message; item.outputError = true; save(); render(); }
  finally { setBusy(false); }
}
async function gradeItem(item) {
  if (!item.code.trim()) throw new Error('Bạn chưa viết code.');
  if (item.gradedCode === item.code && item.grade) return item.grade;
  if (!item.tests) item.tests = (await api('tests', { id: item.exercise.id })).tests;
  if (item.testedCode !== item.code || item.results.length !== item.tests.length) {
    item.results = await runPython(item.code, item.tests, item.exercise.mode); item.testedCode = item.code;
  }
  item.output = item.results.filter(r => r.passed).length + '/' + item.results.length + ' bộ kiểm tra đạt.';
  item.outputError = false; save(); render();
  $('runtime-status').textContent = 'Đang tính điểm từ bộ test…';
  const grade = await api('grade', { id: item.exercise.id, code: item.code, results: item.results });
  item.grade = grade; item.gradedCode = item.code;
  state.history.push({ id: item.exercise.id, title:item.exercise.title, score: grade.score, topic: item.exercise.topic, at: Date.now() });
  state.history = state.history.slice(-200); save();
  return grade;
}
async function submit() {
  if (busy || !current()) return;
  setBusy(true); $('submit').textContent = 'Đang kiểm tra…';
  try { await gradeItem(current()); render(); $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  catch (error) { toast(error.message); }
  finally { setBusy(false); }
}
async function submitAll(automatic = false) {
  const s = session();
  if (!s || busy) return;
  if (!automatic && !s.ended && !confirm('Nộp toàn bộ sẽ kết thúc lượt thi và khóa bài làm. Nộp ngay?')) return;
  s.ended = true; s.submitted = true; s.autoSubmitted = true; save(); setBusy(true);
  const failures = [];
  try {
    for (let i = 0; i < s.items.length; i++) {
      s.index = i; render(); $('submit-all').textContent = 'Đang kiểm tra câu ' + (i + 1) + '…';
      try { await gradeItem(s.items[i]); }
      catch (error) { failures.push('Câu ' + (i + 1) + ': ' + error.message); }
    }
    render();
    if (failures.length) toast(failures.join(' / ')); else toast('Đã kiểm tra toàn bộ bài thi.');
    $('exam-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } finally { setBusy(false); }
}
async function hint() {
  const item = current(); if (busy || !item || item.hints.length >= (item.exercise.hintCount || 0)) return;
  setBusy(true); $('hint').textContent = 'Đang mở gợi ý…';
  try {
    const result = await api('hint', { id: item.exercise.id, level: item.hints.length, code: item.code });
    item.hints.push(result.hint); save(); render();
  } catch (error) { toast(error.message); } finally { setBusy(false); }
}
function updateTimer() {
  const s = state.sessions.exam;
  if (!s?.deadline) return;
  const seconds = Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000));
  if (state.topic === 'exam') $('timer').textContent = s.ended ? 'Đã kết thúc' : String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  if (seconds === 0 && !s.ended) { s.ended = true; save(); if (state.topic === 'exam') render(); toast('Hết 60 phút. Bài làm đã khóa, đang kiểm tra.'); }
  if (s.ended && !s.autoSubmitted && !busy) {
    s.autoSubmitted = true; save();
    const oldTopic = state.topic; state.topic = 'exam'; render(); submitAll(true);
    if (oldTopic !== 'exam') toast('Bài thi đã hết giờ. Đang chấm các câu đã lưu.');
  }
}
document.querySelectorAll('[data-topic]').forEach(button => button.onclick = () => { if (busy) return; state.topic = button.dataset.topic; save(); render(); });
$('start-learning').onclick=()=>openExercise('variables',state.exerciseNumbers.variables||1);
$('hero-run').onclick=async()=>{const b=$('hero-run'),out=$('hero-output');b.disabled=true;out.textContent='Đang chạy Python…';try{const [r]=await runPython($('hero-code').value,[{input:$('hero-input').value,expected:''}],'script');out.textContent=r.error||r.stdout||'(Không có kết quả)';out.classList.toggle('error',Boolean(r.error));}catch(e){out.textContent=e.message;out.classList.add('error');}finally{b.disabled=false;}};
$('generate').onclick = generate; $('run').onclick = run; $('submit').onclick = submit; $('hint').onclick = hint;
$('exercise-number').onchange = () => { state.exerciseNumbers[state.topic] = Number($('exercise-number').value); save(); generate(); };
$('submit-all').onclick = () => submitAll(); $('cancel-run').onclick = () => cancelRunner?.();
$('code').addEventListener('input', () => { const item = current(); if (!item) return; item.code = $('code').value; item.grade = null; item.results = []; updateLines(); $('feedback').hidden = true; $('checks').hidden = true; clearTimeout(saveTimeout); saveTimeout = setTimeout(save, 300); });
$('code').addEventListener('scroll', () => $('line-numbers').scrollTop = $('code').scrollTop);
$('code').addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault(); const editor = $('code'); const start = editor.selectionStart, end = editor.selectionEnd;
    editor.setRangeText('    ', start, end, 'end'); editor.dispatchEvent(new Event('input'));
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); }
});
$('stdin').oninput = () => { if (current()) { current().stdin = $('stdin').value; save(); } };
window.addEventListener('pagehide', save);
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
$('reset').onclick = () => {
  if (session()?.ended) return toast('Lượt thi đã kết thúc. Tạo đề mới để luyện tiếp.');
  if (!current() || !confirm('Đặt lại code về phần khởi đầu?')) return;
  current().code = current().exercise.starter; current().grade = null; current().results = []; save(); render();
};
$('download').onclick = () => {
  if (!current()) return;
  const url = URL.createObjectURL(new Blob([current().code], { type: 'text/x-python;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'main.py'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let theme=localStorage.getItem('hocpython:theme:v2')||'light';
function applyTheme(){document.documentElement.dataset.theme=theme;$('theme').setAttribute('aria-checked',String(theme==='dark'));$('theme-label').textContent=theme==='dark'?'Giao diện tối':'Giao diện sáng';}
applyTheme();
$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';applyTheme();localStorage.setItem('hocpython:theme:v2',theme);};
async function init() {
  if (!localStorage.getItem('hocpython:visited')) { state.topic='home'; localStorage.setItem('hocpython:visited','1'); save(); }
  render();
  try {
    $('connection').textContent = 'bài soạn sẵn · tự chấm';
    $('notice').hidden = state.topic === 'home';
    $('notice').textContent = 'Mỗi chủ đề có 10 bài do mình biên soạn. Chạy và nộp bài được kiểm tra bằng bộ test có sẵn; không cần AI hay API key.';
    if (!session() && !['exam','home'].includes(state.topic)) await generate();
  } catch (error) { toast(error.message); }
  setInterval(updateTimer, 1000);
}
init();


