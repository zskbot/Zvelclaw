# Velclaw — Deploy Pages

Trang tĩnh (GitHub Pages) giới thiệu **Velclaw** — workspace AI-native cho vòng đời phần mềm — và mô tả quy trình deploy thủ công của dự án.

🔗 **Live:** [zskbot.github.io/velclaw-cli](https://zskbot.github.io/velclaw-cli/)

> Repo này chỉ chứa trang giới thiệu/tài liệu (`index.html`), **không phải** mã nguồn CLI hay sản phẩm Velclaw. Mã nguồn sản phẩm nằm ở repo riêng (private).

---

## Nội dung trang

Trang là một single-page app tĩnh với 2 khu vực, chuyển đổi bằng JS thuần (không reload):

| Trang | Nội dung |
|---|---|
| **Tổng quan** | Giới thiệu Velclaw, 8 năng lực cốt lõi (AI Agents, Workspace, Build, Runtime, Storage, GitHub, Deployment, Developer UI), sơ đồ kiến trúc, stack công nghệ, quy trình từ issue đến deploy, lộ trình |
| **Deploy** | Khung mô tả quy trình deploy thủ công qua SSH + Docker Compose lên VPS tự quản — dùng làm tài liệu tham khảo, các chỗ đánh dấu `<...>` cần điền giá trị thật khi áp dụng |

> ⚠️ Trang **Deploy** là tài liệu minh hoạ quy trình, không phải dashboard theo dõi deploy real-time.

## Thiết kế

- **Font:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (tiêu đề), [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) (nội dung), [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) (code/log)
- **Bảng màu:** nền tối (`#12151b`), accent đỏ "claw" (`#ff4433`), accent vàng đồng "brass" (`#d4a537`)
- **Không dùng framework/build step** — thuần HTML + CSS + JS trong một file duy nhất

## Chạy thử ở local

Không cần cài đặt gì, chỉ cần mở file trực tiếp hoặc serve tĩnh:

```bash
git clone https://github.com/zskbot/velclaw-cli.git
cd velclaw-cli
# mở trực tiếp
open index.html
# hoặc serve qua http-server bất kỳ
npx serve .
```

## Deploy

Trang được publish qua **GitHub Pages** từ nhánh `main`. Push lên `main` sẽ tự cập nhật trang live (xem `.github/workflows`).

## Cấu trúc thư mục

```
.
├── .github/workflows/   # Workflow deploy GitHub Pages
├── index.html           # Toàn bộ trang (landing + deploy-doc)
├── LICENSE
└── README.md
```

## Đóng góp

Đây là trang giới thiệu công khai của một dự án private (`Velclaw/Velclaw`). Nếu bạn phát hiện lỗi hiển thị, nội dung sai, hoặc muốn đề xuất cải thiện trang, hãy mở [Issue](https://github.com/zskbot/velclaw-cli/issues).

**Không commit credentials, API key hay token deploy vào repo này.**

## Giấy phép

Phát hành theo giấy phép [MIT](./LICENSE).
