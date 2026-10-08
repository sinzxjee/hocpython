import { randomInt } from 'node:crypto';
const scriptTest = (input, expected) => ({ input, expression: '', expected });
const functionTest = (expression, expected) => ({ input: '', expression, expected });
export function makeExercise(topic, difficulty = 'basic') {
  const n = randomInt(3, 9);
  const base = { topic, difficulty, mode: 'script', starter: '# Viết chương trình ở đây\n', inputFormat: 'Nhập dữ liệu theo từng dòng.', outputFormat: 'Chỉ in kết quả, không in nhãn.', constraints: 'Dữ liệu đầu vào luôn hợp lệ.', hints: [], rubric: [], examples: [], tests: [] };
  let item;
  if (topic === 'variables') {
    const tax = randomInt(5, 13);
    item = {
      title: 'Hóa đơn cửa hàng · VAT ' + tax + '%',
      statement: 'Nhập đơn giá, số lượng và phần trăm giảm giá. Tính thành tiền sau giảm giá, rồi cộng VAT ' + tax + '%. In số tiền phải trả, làm tròn 2 chữ số thập phân.',
      inputFormat: '3 dòng: đơn giá (float), số lượng (int), phần trăm giảm giá (float).',
      outputFormat: 'Một số thực với 2 chữ số sau dấu thập phân.',
      constraints: '0 ≤ đơn giá ≤ 10⁹; 1 ≤ số lượng ≤ 1000; 0 ≤ giảm giá ≤ 100. VAT tính trên giá đã giảm.',
      hints: ['Thành tiền ban đầu bằng đơn giá nhân số lượng.', 'Sau giảm giá: thành tiền × (1 - giảm_giá / 100).', 'Nhân kết quả với (1 + ' + tax + ' / 100), rồi dùng :.2f để in.'],
      rubric: ['Đọc đúng kiểu dữ liệu.', 'Giảm giá trước khi tính VAT.', 'In kết quả đúng định dạng.'],
      reference: 'p = float(input())\nq = int(input())\nd = float(input())\nprint(f"{p * q * (1 - d / 100) * (1 + ' + tax + ' / 100):.2f}")',
      tests: [[100000, 3, 10], [1, 1, 0], [30000, 5, 100], [0, 8, 20], [12500, 2, 15], [19.95, 7, 12.5]].map(([p, q, d]) => scriptTest([p, q, d].join('\n'), (p * q * (1 - d / 100) * (1 + tax / 100)).toFixed(2)))
    };
  } else if (topic === 'sequences') {
    item = {
      title: 'Báo cáo doanh thu ' + n + ' ngày',
      statement: 'Nhập doanh thu của ' + n + ' ngày trên một dòng. In tổng doanh thu, doanh thu lớn nhất và số giá trị doanh thu khác nhau, mỗi kết quả một dòng.',
      inputFormat: n + ' số nguyên không âm, cách nhau bởi khoảng trắng.',
      outputFormat: '3 dòng lần lượt: tổng, lớn nhất, số giá trị khác nhau.',
      constraints: 'Mỗi doanh thu từ 0 đến 10⁹. Có thể có giá trị trùng nhau.',
      hints: ['Tách dòng bằng split(), rồi đổi từng giá trị sang int.', 'sum() tính tổng; max() tìm số lớn nhất.', 'set() loại giá trị trùng; len() cho biết số phần tử còn lại.'],
      rubric: ['Tạo danh sách số nguyên.', 'Tính đúng tổng và giá trị lớn nhất.', 'Dùng set để đếm các giá trị khác nhau.'],
      reference: 'values = list(map(int, input().split()))\nprint(sum(values))\nprint(max(values))\nprint(len(set(values)))',
      tests: Array.from({ length: 6 }, (_, i) => {
        const a = Array.from({ length: n }, (_, j) => i === 0 ? 0 : i === 1 ? 100 : ((i * j + j % 2) % 5) * 1000);
        return scriptTest(a.join(' '), [a.reduce((s, v) => s + v, 0), Math.max(...a), new Set(a).size].join('\n'));
      })
    };
  } else if (topic === 'conditions') {
    const threshold = n * 100000;
    item = {
      title: 'Chính sách giảm giá đơn hàng',
      statement: 'Nhập giá trị đơn hàng và mã khách hàng (VIP hoặc NORMAL). VIP được giảm 10%; NORMAL được giảm 5% khi giá trị đơn hàng từ ' + threshold + ' đồng trở lên, còn lại không giảm. In số tiền phải trả với 2 chữ số thập phân.',
      inputFormat: 'Dòng 1: giá trị đơn hàng (float). Dòng 2: VIP hoặc NORMAL.',
      outputFormat: 'Một số thực với 2 chữ số sau dấu thập phân.',
      constraints: '0 ≤ giá trị đơn hàng ≤ 10⁹. Các mức giảm không cộng dồn.',
      hints: ['Kiểm tra VIP trước, vì mức giảm không phụ thuộc giá trị đơn hàng.', 'Dùng elif để xét khách thường và ngưỡng ' + threshold + '.', 'Tiền phải trả = giá trị đơn × (1 - mức giảm).'],
      rubric: ['Dùng if/elif/else.', 'Xử lý đúng tại ngưỡng.', 'Không cộng dồn mức giảm.'],
      reference: 'amount = float(input())\nkind = input().strip()\nif kind == "VIP":\n    rate = 0.1\nelif amount >= ' + threshold + ':\n    rate = 0.05\nelse:\n    rate = 0\nprint(f"{amount * (1 - rate):.2f}")',
      tests: [[threshold - 1, 'NORMAL'], [threshold, 'NORMAL'], [threshold + 1, 'NORMAL'], [100, 'VIP'], [0, 'VIP'], [threshold * 2, 'VIP']].map(([a, k]) => scriptTest(a + '\n' + k, (a * (1 - (k === 'VIP' ? 0.1 : a >= threshold ? 0.05 : 0))).toFixed(2)))
    };
  } else if (topic === 'loops') {
    const variant = randomInt(0, 2);
    item = variant ? {
      title: 'Đếm chữ số của mã giao dịch',
      statement: 'Nhập một số nguyên không âm. Dùng vòng lặp while và phép chia nguyên để đếm số chữ số. Không chuyển số sang chuỗi và không dùng len(). Số 0 có một chữ số.',
      inputFormat: 'Một số nguyên không âm.',
      outputFormat: 'Một số nguyên: số chữ số.',
      constraints: '0 ≤ n ≤ 10¹⁸.',
      hints: ['Mỗi phép n // 10 loại đi một chữ số ở cuối.', 'Lặp khi số còn lớn hơn 0 và tăng biến đếm.', 'Xử lý riêng n = 0: kết quả là 1.'],
      rubric: ['Dùng while và //.', 'Không dùng str hoặc len.', 'Xử lý số 0.'],
      reference: 'n = int(input())\ncount = 1 if n == 0 else 0\nwhile n > 0:\n    count += 1\n    n //= 10\nprint(count)',
      tests: [0, 1, 324, 1000, 123456789, 1000000000000000000].map(v => scriptTest(String(v), String(String(v).length)))
    } : {
      title: 'Tổng các số lẻ từ 1 đến n',
      statement: 'Nhập số nguyên không âm n. Dùng vòng lặp for để tính tổng các số lẻ từ 1 đến n, tính cả n nếu n là số lẻ. Không dùng công thức tính nhanh hoặc sum().',
      inputFormat: 'Một số nguyên n.', outputFormat: 'Một số nguyên: tổng cần tính.', constraints: '0 ≤ n ≤ 10000.',
      hints: ['Khởi tạo tổng bằng 0.', 'range(1, n + 1, 2) đi qua các số lẻ.', 'Trong vòng lặp, cộng mỗi số vào biến tổng.'],
      rubric: ['Dùng for.', 'Không dùng sum hoặc công thức.', 'Xử lý đúng n = 0 và n chẵn/lẻ.'],
      reference: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1, 2):\n    total += i\nprint(total)',
      tests: [0, 1, 2, 7, 10, 999].map(v => scriptTest(String(v), String(Math.ceil(v / 2) ** 2)))
    };
  } else if (topic === 'functions') {
    item = {
      title: 'Hàm kiểm tra số nguyên tố',
      statement: 'Viết hàm is_prime(n) trả về True nếu số nguyên n là số nguyên tố, ngược lại trả về False. Hàm phải trả về kết quả bằng return; không nhập dữ liệu hoặc print trong hàm.',
      mode: 'function', starter: 'def is_prime(n):\n    # Viết lời giải ở đây\n    pass\n',
      inputFormat: 'Hệ thống gọi is_prime(n) với một số nguyên.',
      outputFormat: 'Giá trị trả về kiểu bool: True hoặc False.', constraints: '-100 ≤ n ≤ 10000. Số nguyên tố lớn hơn 1 và chỉ có hai ước dương.',
      hints: ['Các số nhỏ hơn 2 không phải số nguyên tố.', 'Nếu tìm thấy i mà n % i == 0, trả về False.', 'Sau khi thử các ước, trả về True. Có thể chỉ thử đến căn bậc hai.'],
      rubric: ['Đúng tên hàm và tham số.', 'Trả về bool bằng return.', 'Xử lý n < 2 và số chính phương.'],
      reference: 'def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True',
      tests: [[-5, false], [0, false], [1, false], [2, true], [3, true], [9, false], [49, false], [97, true]].map(([v, expected]) => functionTest('is_prime(' + v + ')', JSON.stringify(expected)))
    };
  } else throw new Error('Chủ đề không hợp lệ.');
  const result = { ...base, ...item };
  const first = result.tests[0];
  const second = result.tests[Math.min(3, result.tests.length - 1)];
  result.examples = [first, second].map(t => ({ input: result.mode === 'function' ? t.expression : t.input, output: t.expected, explanation: 'Kết quả theo yêu cầu và định dạng đầu ra.' }));
  return result;
}

