# ClipTogether

Copy images together with their source link across the web, with site-specific support for social platforms.

在网页中将图片与来源链接一起复制到剪贴板，并针对不同社交平台持续扩展专用适配。

X/Twitter and Weibo are currently supported with post-aware features. More social platforms are planned.

目前已完成 X/Twitter 与微博的贴文级适配，后续将继续支持更多社交平台。

## Why ClipTogether? / 为什么制作 ClipTogether？

Images are often separated from their creators and original context when they are shared or saved. ClipTogether makes it easier to keep a verifiable source trail by copying the image together with its source page or post link. This helps preserve information that can be used to identify and credit the image's creator when sharing or documenting it.

图片在分享或记录过程中，很容易与作者及原始语境分离。ClipTogether 会将图片与其来源网页或贴文链接一同复制，尽量保留可追溯、可核实的出处线索，方便在分享和记录时查明并标注图片作者与来源。

The extension preserves source links; whether a page clearly identifies the original creator still depends on the source itself.

本扩展负责保留来源链接；页面是否明确标示原作者，仍取决于来源页面本身。

## Features / 功能

- Copy a right-clicked image together with the current page URL on ordinary webpages.
- Use site-specific adapters to identify media and canonical post URLs on supported social platforms.
- Copy all media belonging to one post by right-clicking a non-image area where supported.
- Handle X media viewers, quoted posts, carousels, and media-library views.
- Handle Weibo feeds, search results, albums, viewers, hidden images, and video thumbnails.
- Preserve rich clipboard content for editors that accept images and links.
- Optionally strip link formatting while keeping images and the URL.
- Show success or failure notifications after a copy attempt.
- Follow the browser language automatically.

---

- 在一般网页中右击图片，同时复制图片与当前网页地址。
- 通过社交平台专用适配识别媒体及其正式贴文链接。
- 在已适配平台的贴文非图片区域右击，可复制属于该贴文的全部媒体与贴文链接。
- 支持 X 的媒体查看器、引用贴文、轮播图和媒体库视图。
- 支持微博信息流、搜索结果、相册、图片查看器、隐藏图片及视频缩略图。
- 默认保留富文本剪贴板内容，可直接粘贴到支持图片与链接的编辑器。
- 可选择丢掉链接格式，仅保留图片和纯文本网址。
- 复制成功或失败后显示临时通知。
- 自动跟随浏览器语言。

## Installation / 安装

This extension is currently installed as an unpacked Chrome-compatible extension:

1. Download the repository and extract it.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted `ClipTogether` folder.

当前可通过 Chrome 兼容浏览器的“加载已解压扩展程序”方式安装：

1. 下载并解压本仓库。
2. 打开 `chrome://extensions/`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择解压后的 `ClipTogether` 文件夹。

## Usage / 使用方法

### Ordinary webpages / 一般网页

Right-click an image and select **Copy image + source link**. The clipboard will contain the image and the current page URL.

右击图片并选择“复制图片 + 来源链接”，剪贴板中将同时包含图片与当前网页地址。

### Supported social platforms / 已适配社交平台

Current platform adapters:

- X/Twitter
- Weibo

More social platforms will be added over time.

当前已适配：

- X/Twitter
- 微博

后续将继续增加其他社交平台。

- Right-click an image or video thumbnail to copy that media item and its post URL.
- Right-click another area of a supported post to copy all media from that post and its post URL.
- In thumbnail overview modes, only the single-media command is shown where copying all media would be ambiguous.

---

- 右击图片或视频缩略图，复制该媒体及其对应贴文链接。
- 右击受支持贴文的其他区域，复制该贴文全部媒体及贴文链接。
- 在无法明确判断“全部媒体”范围的缩略图一览模式中，只显示单媒体复制功能。

## Clipboard formatting / 剪贴板格式

Open the extension popup to toggle **Strip formatting**.

- Off: the URL is copied as a clickable link.
- On: the URL is copied as plain text.
- Images are retained in both modes.

打开扩展弹出窗口可切换“丢掉格式信息”：

- 关闭：网址以可点击链接形式复制。
- 开启：网址以纯文本形式复制。
- 两种模式都会保留图片。

## Languages / 语言

English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch.

## Permissions and privacy / 权限与隐私

ClipTogether needs access to HTTP and HTTPS pages so its context-menu copy function can work on ordinary webpages. Clipboard access is used only when you invoke a copy command. Settings are stored through the browser extension storage API.

The extension does not include analytics, advertising, or a remote data-collection service.

ClipTogether 需要访问 HTTP 与 HTTPS 页面，才能在一般网页中提供右键复制功能。剪贴板权限仅在用户主动执行复制命令时使用，设置通过浏览器扩展存储 API 保存。

本扩展不包含统计分析、广告或远程数据收集服务。

## Compatibility / 兼容性

Built for Chromium-based browsers using Manifest V3. Browser-protected pages such as `chrome://` pages do not allow ordinary content scripts and are therefore unsupported.

本扩展基于 Manifest V3，面向 Chromium 系浏览器。`chrome://` 等浏览器保护页面不允许普通内容脚本运行，因此不受支持。

## License / 许可证

[MIT License](LICENSE)
