# hocpython

Web luyện Python cho sinh viên khối ngành kinh tế với 5 chủ đề: biến/toán tử, dữ liệu tuần tự, điều kiện, vòng lặp và hàm.

- UI mono đơn sắc, sáng/tối, responsive; không framework hoặc font tải ngoài.
- AI tạo bài mới, 3 cấp hint, nhận xét lỗi theo dòng và code đã sửa.
- Chạy Python thật trong Web Worker bằng Pyodide, đối chiếu nhiều test.
- Thi thử 5 câu / 60 phút / 10 điểm; tự khóa và chấm khi hết giờ.
- Lưu code, hint, bài đang làm và lịch sử trên trình duyệt.
- Khi chưa có AI key: bài mẫu ngẫu nhiên, hint và lời giải mẫu; phân biệt rõ với AI.

## Chạy trên máy

Cần **Node.js 22.9+**. Không có dependency npm, không cần build.

```powershell
git clone https://github.com/sinzxjee/hocpython.git
cd hocpython
Copy-Item .env.example .env
# Điền API key vào .env để bật AI.
node --env-file-if-exists=.env server.mjs
```

Mở **http://127.0.0.1:3000**. Có thể dùng `npm start` nếu máy có npm.

## Cấu hình AI

File `.env` chỉ nằm trên máy chủ và được gitignore:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
HOST=127.0.0.1
APP_ACCESS_TOKEN=
```

AI dùng OpenAI Responses API với Structured Outputs. Đổi model bằng `OPENAI_MODEL` nếu model hỗ trợ Responses + JSON schema. Chưa có key thì nguồn **Bài mẫu ngẫu nhiên** vẫn luyện được ngay. Nếu AI lỗi, web báo để thử lại hoặc đổi nguồn bài; bài mẫu không bị gắn nhãn AI.

Khi hosting: đặt `HOST=0.0.0.0`, cấu hình key trong biến môi trường của hosting. Nên đặt `APP_ACCESS_TOKEN` nếu chia sẻ công khai để giới hạn truy cập API AI; người học nhập mã này trong Cài đặt. Mã chỉ lưu trong sessionStorage. Reverse proxy cần cho phép request dài khi tạo 5 câu và bổ sung auth/rate limit cho nhiều người dùng. Không dùng GitHub Pages cho tính năng AI vì Pages không chạy máy chủ Node.

Có Dockerfile để chạy trên hosting hỗ trợ container:

```sh
docker build -t hocpython .
docker run -p 3000:3000 --env-file .env -e HOST=0.0.0.0 hocpython
```

Lưu thư mục `.data` trên hosting nếu muốn giữ ID bài qua các lần redeploy.

## Sử dụng

1. Chọn chủ đề, độ khó và nguồn bài rồi tạo bài.
2. Đọc định dạng nhập/xuất. Bài script dùng input/print; mỗi input nhận một dòng, chỉ in kết quả. Bài hàm giữ tên hàm, dùng return, nhập lời gọi hàm để chạy thử.
3. Chạy với input riêng. Python tải từ CDN khi chạy lần đầu, nên cần kết nối internet.
4. Mở hint nếu cần. Khi nộp, web chạy mọi test rồi AI nhận xét nếu bài do AI tạo. Sửa code và nộp lại.
5. Thi thử tạo đủ 5 câu, mỗi câu 2 điểm. Nộp toàn bộ hoặc hết giờ sẽ khóa bài. Nếu chấm AI lỗi, code/kết quả test vẫn giữ để chấm lại.

Điểm tính theo tỷ lệ test đạt. AI nhận xét thêm về cách làm như yêu cầu dùng while hoặc không dùng sum; nhận xét này không tự thay điểm test. Đây là công cụ **tự luyện**, không phải nền tảng thi chống gian lận: thực thi và kết quả nằm trên trình duyệt. Đề/test AI có thể có sai sót; đối chiếu ví dụ và nhận xét khi thấy bất hợp lý.

## Kiến trúc

```text
public/
  app.js              điều hướng, editor, timer và tiến độ
  worker.js           tải Pyodide, thực thi code trong worker riêng
  runner-core.js      input/stdout, so sánh test và giới hạn bước
server.mjs            static server + generate/hint/tests/grade
lib/ai.mjs            proxy OpenAI, structured output
lib/schema.mjs        phạm vi 5 chủ đề và schema
lib/bank.mjs          bài mẫu có tham số ngẫu nhiên
.data/                đề đầy đủ trên máy chủ, không public/Git
test/                 kiểm tra API và Python harness
```

Code người học không chạy trên máy chủ Node. Mỗi lượt chạy dùng worker riêng, namespace mới cho từng test, giới hạn 250.000 bước Python, output 64 KB và timeout 8 giây sau khi runtime sẵn sàng. Pyodide 0.27.7 được cố định và tải từ jsDelivr; trình duyệt cache file runtime.

Code của bài AI được gửi đến OpenAI khi xin hint/chấm. Request dùng `store: false`. API key không gửi xuống frontend. Tham khảo: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Pyodide Web Workers](https://pyodide.org/en/stable/usage/webworker.html).

## Kiểm tra

Cần Python 3 và Node.js:

```sh
node --test
```

Test kiểm tra lời giải mẫu và trường hợp biên, code vô hạn, thiếu input, output quá dài, bool trả về, tạo đề/thi thử/hint/chấm, kiểm soát truy cập và hợp đồng AI qua mock. Kiểm tra mock không xác nhận API key/model thật hoạt động.
