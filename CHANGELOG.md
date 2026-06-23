# Changelog

## 1.0.1 - 2026-06-24

### Fixed

- Fixed context-menu copy commands failing silently when the right-click target is inside a frame.
- Show a failure notification when a post context cannot be identified.

## 1.0.0 - 2026-06-21

ClipTogether's first stable release.

ClipTogether 首个稳定版本。

### Highlights

- Copy images and their source page URL from ordinary webpages.
- Introduced an extensible social-platform adaptation model, initially supporting X/Twitter and Weibo.
- Copy either one media item or all media belonging to a supported post.
- Support image carousels, media viewers, quoted posts, albums, search pages, hidden images, and video thumbnails.
- Preserve images and links as rich clipboard content.
- Optional plain-text URL formatting.
- Success and failure notifications.

### 主要内容

- 在一般网页中复制图片与当前网页地址。
- 建立可持续扩展的社交平台适配机制，首批支持 X/Twitter 与微博。
- 可复制单个媒体，也可复制属于同一贴文的全部媒体。
- 支持轮播图、媒体查看器、引用贴文、相册、搜索页面、隐藏图片和视频缩略图。
- 以富文本形式保留图片和链接。
- 可选择将网址改为纯文本格式。
- 提供复制成功与失败通知。

### Notes

- Built for Chromium-based browsers with Manifest V3.
- The extension requests access to HTTP and HTTPS pages to support copying from ordinary webpages.
- Browser-protected pages such as `chrome://` pages are not supported.

### 注意事项

- 基于 Manifest V3，适用于 Chromium 系浏览器。
- 为支持一般网页图片复制，扩展需要访问 HTTP 与 HTTPS 页面。
- 不支持 `chrome://` 等浏览器保护页面。
