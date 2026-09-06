# Hướng Dẫn Thêm Bộ Đề Cho Môn Học 

Áp dụng khi bạn muốn thêm 1 môn học **hoàn toàn chưa có** trong app (ví dụ môn `PRN211`).

Có **4 bước**, làm đúng thứ tự, không cần sửa bất kỳ file JS/CSS nào khác.

---

## Bước 1 — Khai báo tên môn học

Mở file `js/subjects.js`, tìm object `SUBJECT_NAMES` (khoảng dòng 13), thêm 1 dòng:

```js
const SUBJECT_NAMES = {
    'MAI391': 'Toán Trí Tuệ Nhân Tạo (Artificial Intelligence Mathematics)',
    'SSG104': 'Kỹ Năng Làm Việc Nhóm (Soft Skills & Teamwork)',
    'MAE101': 'Toán Cao Cấp Cho Kỹ Thuật (Engineering Mathematics)',
    'PRN211': 'Lập Trình .NET (Basic Cross-Platform Application Programming)', // ví dụ có sẵn
    'MÃ_MÔN_MỚI': 'Tên đầy đủ của môn học'   // 👈 thêm dòng của bạn ở đây
};
```

> Bỏ qua bước này thì app vẫn chạy được, chỉ là tên môn sẽ hiển thị xấu kiểu "Môn học XYZ123" thay vì tên đầy đủ.

---

## Bước 2 — Khai báo bộ đề

Mở file `data/exams.js`, thêm 1 dòng vào mảng `EXAM_LIST`:

```js
{ id: "PRN211_FA26_FE", name: "Đề thi FA26 FE", subject: "PRN211", questionCount: 40, durationMinutes: 60 },
```

| Trường | Ý nghĩa | Lưu ý |
|---|---|---|
| `id` | Mã định danh duy nhất của đề | **Chỉ chứa chữ, số, `_`, `-`**. Không dấu chấm, không dấu cách, không ký tự đặc biệt |
| `name` | Tên hiển thị cho người dùng | Tùy ý |
| `subject` | Mã môn | Phải khớp chính xác với mã bạn khai ở Bước 1 |
| `questionCount` | Số câu hỏi | Khớp với số dòng dữ liệu ở Bước 3 |
| `durationMinutes` | Thời gian làm bài (phút) | Tùy ý |

---

## Bước 3 — Tạo file dữ liệu đáp án (CSV)

Tạo file tại đường dẫn:
```
data/data/{Mã_Môn}/{id}.csv
```
Ví dụ: `data/data/PRN211/PRN211_FA26_FE.csv`

Nội dung đúng định dạng (dùng dấu `;`, không dùng dấu `,`):
```
question_id;correct_answer
Q1;D
Q2;B
Q3;AC
```
> `correct_answer` có thể nhiều ký tự nếu câu hỏi chọn nhiều đáp án (ví dụ `AC`).

---

## Bước 4 — Thêm ảnh câu hỏi

Đặt ảnh vào đúng thư mục, đặt tên khớp với `question_id` ở Bước 3:
```
data/images/{Mã_Môn}/{id}/Q1.webp
data/images/{Mã_Môn}/{id}/Q2.webp
data/images/{Mã_Môn}/{id}/Q3.webp
...
```
Ví dụ: `data/images/PRN211/PRN211_FA26_FE/Q1.webp`

App tự động ghép đường dẫn ảnh theo đúng công thức này, không cần khai báo thủ công.

---

## Kiểm tra sau khi thêm

- [ ] Mở app, vào mục **Môn học** → thấy môn mới xuất hiện với tên đầy đủ
- [ ] Bấm vào môn mới → thấy đúng bộ đề vừa thêm
- [ ] Làm thử vài câu → ảnh hiển thị đúng, chấm điểm đúng
- [ ] Mở Console (F12) → không có lỗi đỏ nào liên quan đến môn mới

---

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
|---|---|---|
| "Bộ đề không hợp lệ hoặc không tồn tại" | `id` chứa ký tự đặc biệt, hoặc không khớp với tên file CSV | Kiểm tra lại `id` chỉ gồm chữ/số/`_`/`-`, và tên file CSV trùng khớp 100% |
| Ảnh câu hỏi không hiện | Sai tên file ảnh hoặc sai thư mục | Kiểm tra `question_id` trong CSV khớp chính xác tên file `.webp` |
| Console báo lỗi 404 file `.xlsx` | App tự thử tải `.xlsx` trước, không có thì tự chuyển sang `.csv` | Bình thường, không phải lỗi — có `.csv` là đủ, không cần tạo `.xlsx` |
| Tên môn hiển thị "Môn học XYZ123" | Quên Bước 1 | Thêm mã môn vào `SUBJECT_NAMES` trong `js/subjects.js` |
