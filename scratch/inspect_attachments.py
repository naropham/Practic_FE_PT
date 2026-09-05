import urllib.request
import re

url = "https://fuoverflow.com/threads/mae101-fa25-fe.5475/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

# Find all occurrences of 239292 or attachment links
matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"', html, re.DOTALL)
print(f"Found {len(matches)} a+img pairs:")
for a_href, img_src in matches[:10]:
    print("A HREF:", a_href)
    print("IMG SRC:", img_src)
    print("-" * 50)
