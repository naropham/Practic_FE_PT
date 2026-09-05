import urllib.request
import urllib.parse
import http.cookiejar
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'vi,en-US;q=0.7,en;q=0.3',
}

thread_url = "https://fuoverflow.com/threads/mae101-fa25-fe.5475/"
req = urllib.request.Request(thread_url, headers=headers)
with opener.open(req) as resp:
    html = resp.read().decode('utf-8')

# Find full attachment links: e.g. href="/attachments/q1-webp.239292/?fuo_h=...&fuo_e=..."
attachment_links = re.findall(r'href="([^"]*attachments/[^"]+)"', html)
print(f"Found {len(attachment_links)} attachment links:")

for link in attachment_links[:5]:
    full_url = urllib.parse.urljoin("https://fuoverflow.com", link)
    print("Testing download:", full_url)
    img_headers = headers.copy()
    img_headers['Referer'] = thread_url
    img_req = urllib.request.Request(full_url, headers=img_headers)
    try:
        with opener.open(img_req) as resp:
            data = resp.read()
            print(f"  SUCCESS! Downloaded {len(data)} bytes")
    except Exception as e:
        print(f"  FAILED: {e}")
