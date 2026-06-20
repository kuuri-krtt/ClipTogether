# Changelog

## 1.0.0 - 2026-06-21

ClipTogether's first stable release.

ClipTogether 首个稳定版本。

### Highlights

- Copy images and their source page URL from ordinary webpages.
- Specialized post-aware copying for X/Twitter and Weibo.
- Copy either one media item or all media belonging to a supported post.
- Support image carousels, media viewers, quoted posts, albums, search pages, hidden images, and video thumbnails.
- Preserve images and links as rich clipboard content.
- Optional plain-text URL formatting.
- Success and failure notifications.
- Automatic browser-language selection with eight languages:
  - English
  - Simplified Chinese
  - Traditional Chinese
  - Japanese
  - Korean
  - Spanish
  - French
  - German

### 主要内容

- 在一般网页中复制图片与当前网页地址。
- 针对 X/Twitter 与微博提供贴文识别和专用复制逻辑。
- 可复制单个媒体，也可复制属于同一贴文的全部媒体。
- 支持轮播图、媒体查看器、引用贴文、相册、搜索页面、隐藏图片和视频缩略图。
- 以富文本形式保留图片和链接。
- 可选择将网址改为纯文本格式。
- 提供复制成功与失败通知。
- 自动跟随浏览器语言，支持英语、简体中文、繁体中文、日语、韩语、西班牙语、法语和德语。

### Notes

- Built for Chromium-based browsers with Manifest V3.
- The extension requests access to HTTP and HTTPS pages to support copying from ordinary webpages.
- Browser-protected pages such as `chrome://` pages are not supported.

### 注意事项

- 基于 Manifest V3，适用于 Chromium 系浏览器。
- 为支持一般网页图片复制，扩展需要访问 HTTP 与 HTTPS 页面。
- 不支持 `chrome://` 等浏览器保护页面。
