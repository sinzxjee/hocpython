# hocpython

Web luyện Python cho sinh viên khối ngành kinh tế với 5 chủ đề: biến/toán tử, dữ liệu tuần tự, điều kiện, vòng lặp và hàm.

- UI mono đơn sắc, sáng/tối, responsive; không framework hoặc font tải ngoài.
- 50 bài được biên soạn sẵn: 10 bài trong mỗi chủ đề, kèm gợi ý và lời giải tham khảo.
- Chạy Python thật trong Web Worker bằng Pyodide, đối chiếu nhiều test.
- Thi thử 5 câu / 60 phút / 10 điểm; tự khóa và chấm khi hết giờ.
- Lưu code, hint, bài đang làm và lịch sử trên trình duyệt.
- Thi thử gồm 5 câu, lấy một câu ngẫu nhiên từ mỗi chủ đề.

## Chạy trên máy

Cần **Node.js 22.9+**. Không có dependency npm, không cần build.

```powershell
git clone https://github.com/sinzxjee/hocpython.git
cd hocpython
node server.mjs
```

Mở **http://127.0.0.1:3000**. Có thể dùng `npm start` nếu máy có npm.

## Chạy trên hosting

Đặt `HOST=0.0.0.0` trên hosting hỗ trợ Node.js. GitHub Pages không chạy máy chủ Node. Web không cần API key hoặc tài khoản AI.

Có Dockerfile để chạy trên hosting hỗ trợ container:

```sh
docker build -t hocpython .
docker run -p 3000:3000 -e HOST=0.0.0.0 hocpython
```

Lưu thư mục `.data` trên hosting nếu muốn giữ ID bài qua các lần redeploy.

## Sử dụng

1. Chọn một trong 10 bài ở chủ đề đang học.
2. Đọc định dạng nhập/xuất. Bài script dùng input/print; mỗi input nhận một dòng, chỉ in kết quả. Bài hàm giữ tên hàm, dùng return, nhập lời gọi hàm để chạy thử.
3. Chạy với input riêng. Python tải từ CDN khi chạy lần đầu, nên cần kết nối internet.
4. Mở gợi ý nếu cần. Khi nộp, web chạy bộ test có sẵn, tính điểm và hiển thị lời giải tham khảo để bạn tự sửa.
5. Thi thử có 5 câu, mỗi chủ đề một câu, làm trong 60 phút. Nộp toàn bộ hoặc hết giờ sẽ khóa bài.

Điểm tính theo tỷ lệ test đạt. Đây là công cụ **tự luyện**, không phải nền tảng thi chống gian lận: thực thi và kết quả nằm trên trình duyệt.

## Kiến trúc

```text
public/
  app.js              điều hướng, editor, timer và tiến độ
  worker.js           tải Pyodide, thực thi code trong worker riêng
  runner-core.js      input/stdout, so sánh test và giới hạn bước
server.mjs            static server + chọn bài/gợi ý/test/chấm tự động
lib/schema.mjs        phạm vi 5 chủ đề và xác thực cấu trúc bài
lib/bank.mjs          ngân hàng 50 bài soạn sẵn
.data/                đề đầy đủ trên máy chủ, không public/Git
test/                 kiểm tra API và Python harness
```

Code người học không chạy trên máy chủ Node. Mỗi lượt chạy dùng worker riêng, namespace mới cho từng test, giới hạn 250.000 bước Python, output 64 KB và timeout 8 giây sau khi runtime sẵn sàng. Pyodide 0.27.7 được cố định và tải từ jsDelivr; trình duyệt cache file runtime.

Code của người học chạy trong trình duyệt bằng Pyodide; server chỉ cấp đề, gợi ý, bộ test và lời giải tham khảo. Tham khảo: [Pyodide Web Workers](https://pyodide.org/en/stable/usage/webworker.html).

## Kiểm tra

Cần Python 3 và Node.js:

```sh
node --test
```

Test kiểm tra lời giải mẫu và trường hợp biên, code vô hạn, thiếu input, output quá dài, bool trả về, tạo đủ bài theo chủ đề, thi thử, gợi ý và chấm tự động.

