import os
import re
import csv
import urllib.request
import urllib.parse
import http.cookiejar
from html.parser import HTMLParser

class FuOverflowFullImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.full_img_links = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        # Chỉ lấy thẻ <a href="..."> bọc ngoài ảnh, đây là đường dẫn đến ẢNH GỐC NÉT CAO (Full HD)
        if tag == 'a' and 'href' in attrs_dict:
            href = attrs_dict['href']
            # Đường dẫn ảnh gốc đính kèm chứa /attachments/ và có hash fuo_h
            if '/attachments/' in href or 'fuo_h=' in href:
                full_url = urllib.parse.urljoin("https://fuoverflow.com", href)
                if full_url not in self.full_img_links:
                    self.full_img_links.append(full_url)

def extract_q_number(url):
    """Trích xuất số câu hỏi từ URL để sắp xếp đúng thứ tự (Q1 -> Q50)"""
    match = re.search(r'q(\d+)', url, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 9999

def scrape_fuoverflow_thread(thread_url, subject, exam_id):
    """
    Cào hình ảnh GỐC NÉT CAO (Full HD) từ 1 thread bài viết FuOverflow.
    Giải quyết triệt để vấn đề ảnh bị mờ (do lấy nhầm ảnh thumbnail thu nhỏ)
    và tránh lỗi 403 Forbidden bằng cách duy trì Session Cookie + Referer Header.
    """
    print(f"[*] Đang kết nối tới bài viết: {thread_url}...")
    
    # Tạo thư mục lưu hình ảnh & file dữ liệu
    img_dir = os.path.join("data", "images", subject, exam_id)
    data_dir = os.path.join("data", "data", subject)
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(data_dir, exist_ok=True)
    
    # Sử dụng CookieJar để lưu Session Cookie của trình duyệt (Bắt buộc để tải ảnh nét gốc không bị lỗi 403)
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }

    # Lấy Cookie từ biến môi trường (Bảo mật: Không hard-code credential trong source code)
    session_cookie = os.getenv('FUOVERFLOW_SESSION_COOKIE') or os.getenv('FUOVERFLOW_COOKIE')
    if session_cookie:
        headers['Cookie'] = session_cookie
    else:
        print("[!] CẢNH BÁO: Chưa thiết lập biến môi trường FUOVERFLOW_SESSION_COOKIE.")
        print("    Nếu bài viết yêu cầu đăng nhập, hãy chạy: set FUOVERFLOW_SESSION_COOKIE=\"<cookie-value>\"")
    
    # 1. Truy cập bài viết để lấy HTML & Lưu Session Cookie
    req = urllib.request.Request(thread_url, headers=headers)
    try:
        with opener.open(req) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        print(f"[!] Lỗi khi kết nối bài viết: {e}")
        return

    # 2. Parse HTML tìm tất cả thẻ <a> trỏ tới ảnh FULL HD gốc
    parser = FuOverflowFullImageParser()
    parser.feed(html)
    raw_links = parser.full_img_links

    if not raw_links:
        print("[!] Không tìm thấy liên kết ảnh đính kèm gốc nào.")
        return

    # Sắp xếp các đường dẫn ảnh theo thứ tự câu Q1, Q2, Q3... Q50
    sorted_links = sorted(raw_links, key=extract_q_number)

    print(f"[+] Tìm thấy {len(sorted_links)} ảnh GỐC NÉT CAO (Full Resolution). Đang bắt đầu tải...")
    
    csv_rows = []
    
    # 3. Tải từng ảnh NÉT GỐC với Cookie + Referer
    for idx, img_url in enumerate(sorted_links, start=1):
        # Xác định số câu dựa trên tên file hoặc thứ tự
        q_num = extract_q_number(img_url)
        if q_num != 9999:
            q_name = f"Q{q_num}"
        else:
            q_name = f"Q{idx}"
            
        img_filename = f"{q_name}.webp"
        save_path = os.path.join(img_dir, img_filename)
        
        print(f" -> Tải câu {q_name} (Ảnh sắc nét gốc)...")
        
        # Header tải ảnh bắt buộc phải chứa Referer bài viết để không bị 403 Forbidden
        img_headers = headers.copy()
        img_headers['Referer'] = thread_url
        
        try:
            img_req = urllib.request.Request(img_url, headers=img_headers)
            with opener.open(img_req) as resp, open(save_path, 'wb') as f:
                f.write(resp.read())
        except Exception as err:
            print(f"   [!] Lỗi khi tải {q_name}: {err}")
            
        csv_rows.append({"question_id": q_name, "correct_answer": ""})

    # Sắp xếp lại danh sách câu trong CSV theo đúng Q1, Q2... Q50
    csv_rows = sorted(csv_rows, key=lambda x: extract_q_number(x['question_id']))

    # 4. Lưu file CSV
    csv_file_path = os.path.join(data_dir, f"{exam_id}.csv")
    try:
        with open(csv_file_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["question_id", "correct_answer"])
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"\n[✓] THÀNH CÔNG! Đã tải toàn bộ {len(sorted_links)} ảnh GỐC NÉT CAO vào thư mục: {img_dir}")
        print(f"[✓] Đã tạo file CSV: {csv_file_path}")
        print("=> Hãy mở file CSV và điền đáp án đúng (A, B, C, D) cho từng câu!")
    except PermissionError:
        print(f"\n[!] CẢNH BÁO: File {csv_file_path} đang bị mở trong Excel.")
        print("=> Vui lòng ĐÓNG EXCEL rồi chạy lại lệnh `python scrape_fuoverflow.py`!")

if __name__ == "__main__":
    THREAD_URL = "https://fuoverflow.com/threads/mae101-su26-re.7212/"
    SUBJECT = "MAE101"
    EXAM_ID = "MAE101_SU26_RE"
    
    scrape_fuoverflow_thread(THREAD_URL, SUBJECT, EXAM_ID)
