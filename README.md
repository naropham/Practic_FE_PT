# 📚 App Luyện Đề Tối Giản

Ứng dụng luyện đề trắc nghiệm online với giao diện trực quan, hỗ trợ **làm bài theo thời gian thực** và **xem đáp án ngay lập tức**.

---

## 🚀 Thêm Môn Học & Bộ Đề Mới

Bạn có thể thêm bộ đề mới theo **1 trong 2 cách** dưới đây.

### 🔹 Cách 1 — Cào đề tự động từ FUOverflow

> Áp dụng cho các bài viết trên **FuOverflow**.

#### 1. Cấu hình bộ đề

Mở file `scrape_fuoverflow.py` và chỉnh sửa 3 dòng ở cuối file:

```python
THREAD_URL = "https://fuoverflow.com/threads/link-bai-viet-can-cao/"
SUBJECT    = "MAE101"           # Mã môn học
EXAM_ID    = "MAE101_FA25_FE"   # Mã bộ đề
```

**Ví dụ:**

* `SUBJECT`: `MAE101`, `PRN211`, ...
* `EXAM_ID`: `MAE101_FA25_FE`, ...

#### 2. Chạy tool cào dữ liệu

Mở **Terminal / Command Prompt** và chạy:

```bash
python scrape_fuoverflow.py
```

> ⚡ Tool sẽ tự động tạo thư mục, tải toàn bộ ảnh câu hỏi và tạo file CSV tương ứng.

#### 3. Điền đáp án

Mở file:

```text
data/data/{MÔN_HỌC}/{MÃ_BỘ_ĐỀ}.csv
```

Sau đó điền đáp án đúng (`A`, `B`, `C`, `D`, ...) vào cột:

```text
correct_answer
```

#### 4. Hiển thị bộ đề trên Web

Mở file:

```text
data/exams.js
```

Thêm bộ đề mới vào `EXAM_LIST`:

```javascript
const EXAM_LIST = [
    // ... các đề hiện có
    {
        id: "MAE101_FA25_FE",
        name: "Đề thi FA25 FE",
        subject: "MAE101"
    },
];
```

---

### 🔹 Cách 2 — Thêm đề thủ công

> Sử dụng khi bạn **đã có sẵn ảnh câu hỏi** hoặc tự tạo bộ đề.

#### 1. Lưu ảnh câu hỏi

Tạo thư mục:

```text
data/images/{MÔN_HỌC}/{MÃ_BỘ_ĐỀ}/
```

Đặt tên ảnh theo thứ tự:

```text
Q1.webp
Q2.webp
Q3.webp
...
```

Có thể sử dụng các định dạng:

```text
.webp
.jpg
.png
```

#### 2. Tạo file đáp án CSV

Tạo file:

```text
data/data/{MÔN_HỌC}/{MÃ_BỘ_ĐỀ}.csv
```

Nội dung mẫu:

```csv
question_id,correct_answer
Q1,A
Q2,B
Q3,C
```

#### 3. Khai báo bộ đề

Mở:

```text
data/exams.js
```

Thêm bộ đề mới vào `EXAM_LIST` tương tự **Bước 4 của Cách 1**.

---

## 💻 Chạy ứng dụng

Không cần cài đặt server phức tạp.

Chỉ cần:

1. Mở thư mục project.
2. **Bấm đúp vào `index.html`**.
3. Chọn trình duyệt muốn sử dụng:

   * 🌐 Chrome
   * 🌐 Microsoft Edge
   * 🌐 Firefox
   * ...

🎉 **Ứng dụng sẽ chạy trực tiếp trên trình duyệt!**
