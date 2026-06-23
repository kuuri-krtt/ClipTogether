(() => {
  'use strict';

  const X_MEDIA_PATH_RE = /\/([^/]+)\/status\/(\d+)\/photo\/\d+/;
  const X_STATUS_PATH_RE = /\/([^/]+)\/status\/(\d+)/;
  const WEIBO_DETAIL_PATH_RE = /^\/(?:detail|status)\/([A-Za-z0-9]+)\/?$/;
  const WEIBO_DESKTOP_POST_PATH_RE = /^\/(?:u\/)?(\d+)\/([A-Za-z0-9]+)\/?$/;

  let stripFormatting = false;
  let contextTarget = null;
  let contextMediaUrl = null;
  const PENDING_WEIBO_COPY_KEY = 'pendingWeiboPostCopy';

  function t(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
  }

  function isX() {
    return location.hostname === 'x.com' || location.hostname === 'twitter.com';
  }

  function isWeibo() {
    return location.hostname === 'weibo.com'
      || location.hostname === 'www.weibo.com'
      || location.hostname === 's.weibo.com'
      || location.hostname === 'm.weibo.cn';
  }

  function normalizeXImageUrl(url) {
    if (url.hostname !== 'pbs.twimg.com') return null;
    const isPostImage = url.pathname.startsWith('/media/');
    const isVideoPoster = /\/(?:amplify_video_thumb|ext_tw_video_thumb)\//.test(url.pathname);
    if (!isPostImage && !isVideoPoster) return null;
    if (isPostImage) url.searchParams.set('name', 'orig');
    return url.toString();
  }

  function normalizeWeiboImageUrl(url) {
    if (!/(^|\.)sinaimg\.(?:cn|com)$/i.test(url.hostname)) return null;

    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      parts[1] = 'large';
      url.pathname = parts.join('/');
    }
    url.search = '';
    return url.toString();
  }

  function normalizeImageUrl(src) {
    try {
      const url = new URL(src, location.href);
      if (isX()) return normalizeXImageUrl(url);
      if (isWeibo()) return normalizeWeiboImageUrl(url);
      return ['http:', 'https:', 'data:', 'blob:'].includes(url.protocol)
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }

  function xStatusUrlFromPath(pathname) {
    const match = pathname.match(X_STATUS_PATH_RE);
    return match ? `${location.origin}/${match[1]}/status/${match[2]}` : null;
  }

  function normalizeWeiboPostUrl(href) {
    try {
      const url = new URL(href, location.origin);
      const detailMatch = url.pathname.match(WEIBO_DETAIL_PATH_RE);
      if (detailMatch) return `${url.origin}/detail/${detailMatch[1]}`;

      const desktopMatch = url.pathname.match(WEIBO_DESKTOP_POST_PATH_RE);
      if (desktopMatch) return `https://weibo.com/${desktopMatch[1]}/${desktopMatch[2]}`;

      return null;
    } catch {
      return null;
    }
  }

  function findPostContainer(element) {
    if (isX()) return element.closest('article');

    if (isWeibo()) {
      return element.closest([
        'article',
        '[role="article"]',
        '[action-type="feed_list_item"]',
        '[class*="Feed_wrap"]',
        '[class*="card-wrap"]',
        '.card'
      ].join(','));
    }

    return null;
  }

  function findWeiboAlbum(element) {
    if (!isWeibo()) return null;
    const album = element.closest('[class*="_album_"]');
    if (album) return album;

    const picture = element.closest('.woo-picture-main');
    if (!picture || findPostContainer(element)) return null;

    const main = picture.closest('main');
    const pageText = main?.textContent || '';
    return pageText.includes('相册') || pageText.includes('全部图片') ? main : null;
  }

  function findWeiboMediaViewer(element) {
    if (!isWeibo()) return null;

    const legacyViewer = element.closest([
      '[class*="_showPictureViewer_"]',
      '[class*="_originalWrap_"]',
      '[class*="_previewList_"]'
    ].join(','));
    if (legacyViewer) return legacyViewer;

    const url = new URL(location.href);
    if (url.searchParams.get('tabtype') !== 'album' || !url.searchParams.has('index')) return null;

    const viewerArticle = element.closest('article');
    if (viewerArticle?.querySelector('footer[class*="_isInViewer_"]')) {
      return viewerArticle.closest('[class*="_right_100l0_"], [class*="_right_box_"]')
        || viewerArticle;
    }

    const rightPanel = element.closest('[class*="_right_100l0_"], [class*="_right_box_"]');
    if (rightPanel?.querySelector('article footer[class*="_isInViewer_"]')) {
      return rightPanel;
    }

    const currentImage = findCurrentWeiboAlbumViewerImage();
    if (!currentImage) return null;

    let scope = currentImage.parentElement;
    for (let depth = 0; scope && depth < 14; depth += 1, scope = scope.parentElement) {
      if (scope.contains(element) && findWeiboPostUrlNearImage(
        normalizeImageUrl(currentImage.currentSrc || currentImage.src)
      )) {
        return scope;
      }
    }

    return currentImage.closest('main') || document.body;
  }

  function getXPostUrl(element) {
    const mediaDialog = findXMediaDialog(element);
    const dialogStatusUrl = getXMediaDialogPostUrl(mediaDialog);
    if (dialogStatusUrl) return dialogStatusUrl;

    const mediaLink = element.closest('a[href*="/status/"]');
    if (mediaLink) {
      const url = new URL(mediaLink.getAttribute('href'), location.origin);
      const postUrl = xStatusUrlFromPath(url.pathname);
      if (postUrl) return postUrl;
    }

    const quoteCard = findXQuoteCard(element);
    const quoteStatusLink = quoteCard?.querySelector('a[href*="/status/"]');
    if (quoteStatusLink) {
      const url = new URL(quoteStatusLink.getAttribute('href'), location.origin);
      const postUrl = xStatusUrlFromPath(url.pathname);
      if (postUrl) return postUrl;
    }

    const mediaMatch = location.pathname.match(X_MEDIA_PATH_RE);
    if (mediaMatch) return `${location.origin}/${mediaMatch[1]}/status/${mediaMatch[2]}`;

    const pageStatusUrl = xStatusUrlFromPath(location.pathname);
    if (pageStatusUrl) return pageStatusUrl;

    const article = findPostContainer(element);
    const timeLink = article?.querySelector('time')?.closest('a[href*="/status/"]');
    const statusLink = timeLink || article?.querySelector('a[href*="/status/"]');
    if (statusLink) {
      const url = new URL(statusLink.getAttribute('href'), location.origin);
      const postUrl = xStatusUrlFromPath(url.pathname);
      if (postUrl) return postUrl;
    }

    return location.href.split(/[?#]/)[0];
  }

  function findXMediaDialog(element) {
    if (!isX()) return null;
    const dialog = element.closest('[role="dialog"][aria-labelledby="modal-header"]');
    return dialog?.querySelector('[aria-roledescription="carousel"]') ? dialog : null;
  }

  function getXMediaDialogPostUrl(dialog) {
    if (!dialog) return null;

    const statusLink = dialog.querySelector('a[href*="/status/"][href$="/analytics"]')
      || dialog.querySelector('a[href*="/status/"]');
    if (!statusLink) return null;

    const url = new URL(statusLink.getAttribute('href'), location.origin);
    return xStatusUrlFromPath(url.pathname);
  }

  function getXMediaDialogImages(dialog) {
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll('[aria-roledescription="carousel"] img[src*="pbs.twimg.com/media/"]'))
      .map(img => normalizeImageUrl(img.currentSrc || img.src))
      .filter(Boolean);
  }

  function findXQuoteCard(element) {
    if (!isX()) return null;

    let current = element;
    while (current && current !== element.closest('article')) {
      if (current.getAttribute?.('role') === 'link'
        && current.querySelector('[data-testid="tweetText"]')
        && current.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function getWeiboPostUrl(element) {
    const pageUrl = normalizeWeiboPostUrl(location.href);
    if (pageUrl) return pageUrl;

    const viewer = findWeiboMediaViewer(element);
    if (viewer) {
      const viewerLinks = Array.from(viewer.querySelectorAll('a[href]'));
      for (const link of viewerLinks) {
        const postUrl = normalizeWeiboPostUrl(link.href);
        if (postUrl) return postUrl;
      }

      const nearbyContainer = viewer.closest('article, [role="article"], [class*="card-wrap"]');
      const nearbyTimeLink = nearbyContainer?.querySelector('a[class*="_time_"][href], .from a[href]');
      if (nearbyTimeLink) {
        const postUrl = normalizeWeiboPostUrl(nearbyTimeLink.href);
        if (postUrl) return postUrl;
      }
    }

    const container = findPostContainer(element);
    if (container) {
      const retweet = element.closest('.retweet');
      const retweetTimeLink = retweet?.querySelector('a[class*="_time_"][href]');
      if (retweetTimeLink) {
        const postUrl = normalizeWeiboPostUrl(retweetTimeLink.href);
        if (postUrl) return postUrl;
      }

      const timeLink = container.querySelector('a[class*="_time_"][href]');
      if (timeLink) {
        const postUrl = normalizeWeiboPostUrl(timeLink.href);
        if (postUrl) return postUrl;
      }

      const links = Array.from(container.querySelectorAll('a[href]'));
      for (const link of links) {
        const postUrl = normalizeWeiboPostUrl(link.href);
        if (postUrl) return postUrl;
      }
    }

    return location.href.split(/[?#]/)[0];
  }

  function getCanonicalPostUrl(element) {
    if (isX()) return getXPostUrl(element);
    if (isWeibo()) return getWeiboPostUrl(element);
    return location.href.split('#')[0];
  }

  function isCurrentPageUrl(url) {
    return url === location.href.split(/[?#]/)[0];
  }

  function getImageFileName(imageUrl) {
    try {
      return new URL(imageUrl).pathname.split('/').pop()?.toLowerCase() || '';
    } catch {
      return '';
    }
  }

  function findCurrentWeiboAlbumViewerImage() {
    const candidates = Array.from(document.images)
      .filter(img => {
        const url = normalizeImageUrl(img.currentSrc || img.src);
        if (!url) return false;
        const rect = img.getBoundingClientRect();
        return rect.width >= 240
          && rect.height >= 240
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth;
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
      });

    return candidates[0] || null;
  }

  function getWeiboAlbumOwnerId() {
    const queryId = new URL(location.href).searchParams.get('uid');
    if (queryId) return queryId;
    return location.pathname.match(/^\/u\/(\d+)/)?.[1] || null;
  }

  function isExpectedWeiboAlbumPost(postUrl) {
    const ownerId = getWeiboAlbumOwnerId();
    if (!ownerId) return true;
    try {
      return new URL(postUrl).pathname.split('/')[1] === ownerId;
    } catch {
      return false;
    }
  }

  function findWeiboPostUrlNearImage(imageUrl) {
    const fileName = getImageFileName(imageUrl);
    if (!fileName) return null;

    const matchingImages = Array.from(document.images).filter(candidate => {
      const candidateUrl = normalizeImageUrl(candidate.currentSrc || candidate.src);
      return getImageFileName(candidateUrl) === fileName;
    });

    for (const image of matchingImages.reverse()) {
      let scope = image.parentElement;
      for (let depth = 0; scope && depth < 12; depth += 1, scope = scope.parentElement) {
        const links = Array.from(scope.querySelectorAll('a[href]'));
        for (const link of links) {
          const postUrl = normalizeWeiboPostUrl(link.href);
          if (postUrl && isExpectedWeiboAlbumPost(postUrl)) return postUrl;
        }
      }
    }

    return null;
  }

  function findWeiboPostContainerByUrl(postUrl) {
    if (!postUrl) return null;

    const normalizedTarget = normalizeWeiboPostUrl(postUrl);
    if (!normalizedTarget) return null;

    const matchingLinks = Array.from(document.querySelectorAll('a[href]')).filter(link =>
      normalizeWeiboPostUrl(link.href) === normalizedTarget
    );

    for (const link of matchingLinks) {
      const container = findPostContainer(link);
      if (container) return container;
    }

    return null;
  }

  async function waitForWeiboAlbumPost(imageUrl, previousUrl, timeout = 3500) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const postUrl = findWeiboPostUrlNearImage(imageUrl);
      if (postUrl) return postUrl;

      if (location.href !== previousUrl) {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const link of links) {
          const candidate = normalizeWeiboPostUrl(link.href);
          if (candidate && isExpectedWeiboAlbumPost(candidate)) return candidate;
        }
      }

      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    return null;
  }

  function hasMediaSource(img) {
    if (!normalizeImageUrl(img.currentSrc || img.src)) return false;
    if (!isWeibo()) return true;

    return Boolean(img.closest([
      '.picture',
      '.woo-picture-main',
      '[node-type="fl_pic_list"]',
      '.media-piclist',
      '[action-type="fl_pics"]',
      '[class*="_album_"]',
      '[class*="_box_"]',
      '[class*="_pic_"]',
      '[class*="_poster_"]',
      '.vjs-poster'
    ].join(',')));
  }

  function getPosterUrlFromElement(element) {
    if (isX()) {
      const videoPlayer = element.closest('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      const poster = videoPlayer?.querySelector('video[poster]')?.poster;
      return poster ? normalizeImageUrl(poster) : null;
    }

    const poster = element.closest([
      '.vjs-poster',
      '.wbpv-poster',
      '[class*="_poster_"]',
      '[class*="_videoBox_"]'
    ].join(','));
    if (!poster) return null;

    const image = poster.matches('img') ? poster : poster.querySelector('img');
    const imageUrl = normalizeImageUrl(image?.currentSrc || image?.src);
    if (imageUrl) return imageUrl;

    const candidates = [poster, ...poster.querySelectorAll('*')];
    for (const candidate of candidates) {
      const backgroundImage = getComputedStyle(candidate).backgroundImage;
      const match = backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);
      const backgroundUrl = match ? normalizeImageUrl(match[1]) : null;
      if (backgroundUrl) return backgroundUrl;
    }

    return null;
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  async function copyImagesAndSource(imageUrls, postUrl) {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    container.setAttribute('aria-hidden', 'true');
    container.className = 'xisc-copy-buffer';

    if (stripFormatting) {
      imageUrls.forEach(imageUrl => {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = '';
        container.append(image, document.createElement('br'));
      });
      container.append(document.createTextNode(postUrl));
    } else {
      imageUrls.forEach(imageUrl => {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = '';

        const imageLine = document.createElement('div');
        imageLine.appendChild(image);
        container.appendChild(imageLine);
      });

      const linkLine = document.createElement('div');
      const link = document.createElement('a');
      link.href = postUrl;
      link.textContent = postUrl;
      linkLine.appendChild(link);
      container.appendChild(linkLine);
    }

    document.body.appendChild(container);

    try {
      const expectedImages = container.querySelectorAll('img').length;
      const hasPostUrl = stripFormatting
        ? container.textContent.includes(postUrl)
        : container.querySelector('a')?.href === postUrl;

      if (expectedImages !== imageUrls.length || !hasPostUrl) {
        throw new Error('Clipboard payload validation failed.');
      }

      const selection = window.getSelection();
      const savedRanges = [];
      for (let i = 0; i < selection.rangeCount; i += 1) {
        savedRanges.push(selection.getRangeAt(i).cloneRange());
      }

      const range = document.createRange();
      range.selectNodeContents(container);
      selection.removeAllRanges();
      selection.addRange(range);

      const copied = document.execCommand('copy');

      selection.removeAllRanges();
      savedRanges.forEach(savedRange => selection.addRange(savedRange));

      if (!copied) throw new Error('Native rich-text copy was rejected.');
    } finally {
      container.remove();
    }
  }

  function showCopyToast(message, type) {
    document.querySelector('.xisc-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = `xisc-toast xisc-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('xisc-toast-visible'));
    window.setTimeout(() => {
      toast.classList.remove('xisc-toast-visible');
      window.setTimeout(() => toast.remove(), 180);
    }, 1800);
  }

  function getImageIdentity(imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (/(^|\.)sinaimg\.(?:cn|com)$/i.test(url.hostname)) {
        return `weibo:${url.pathname.split('/').pop()?.toLowerCase()}`;
      }
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  async function copyImages(imageUrls, postUrl) {
    const seen = new Set();
    const uniqueImageUrls = imageUrls.filter(imageUrl => {
      if (!imageUrl) return false;
      const identity = getImageIdentity(imageUrl);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
    if (!uniqueImageUrls.length) return false;

    try {
      await copyImagesAndSource(uniqueImageUrls, postUrl);
      showCopyToast(t('copiedImages', String(uniqueImageUrls.length)), 'success');
      return true;
    } catch (error) {
      console.warn('[XISC] Image clipboard failed, falling back to text.', error);
      try {
        await copyText(postUrl);
        showCopyToast(t('imageCopyFallback'), 'error');
        return false;
      } catch (fallbackError) {
        console.warn('[XISC] Text clipboard failed.', fallbackError);
        showCopyToast(t('copyFailed'), 'error');
        return false;
      }
    }
  }

  function copyForImage(img) {
    const imageUrl = normalizeImageUrl(img.currentSrc || img.src);
    const postUrl = isX() ? getXPostUrl(img) : getCanonicalPostUrl(img);
    if (!imageUrl || !postUrl) {
      showCopyToast(t('identifyImageLinkFailed'), 'error');
      return Promise.resolve(false);
    }
    return copyImages([imageUrl], postUrl);
  }

  async function copyForWeiboAlbumImage(img) {
    const imageUrl = normalizeImageUrl(img.currentSrc || img.src);
    const album = findWeiboAlbum(img);
    if (!imageUrl || !album) {
      showCopyToast(t('identifyAlbumImageFailed'), 'error');
      return false;
    }

    showCopyToast(t('openingImageDetails'), 'pending');

    const previousUrl = location.href;
    const clickable = img.closest('.woo-picture-main, [class*="_box_"]') || img;
    clickable.click();

    const postUrl = await waitForWeiboAlbumPost(imageUrl, previousUrl);
    if (!postUrl || isCurrentPageUrl(postUrl)) {
      showCopyToast(t('confirmPostLinkFailed'), 'error');
      return false;
    }

    return await copyImages([imageUrl], postUrl);
  }

  function getPostImageUrls(container) {
    if (isX()) {
      const mediaItems = Array.from(container.querySelectorAll('[data-testid="tweetPhoto"]'))
        .filter(item => !item.parentElement?.closest('[data-testid="tweetPhoto"]'));

      return mediaItems
        .map(item => {
          const video = item.querySelector('video[poster]');
          if (video?.poster) return normalizeImageUrl(video.poster);

          const image = item.querySelector('img[src*="pbs.twimg.com/media/"]');
          return normalizeImageUrl(image?.currentSrc || image?.src);
        })
        .filter(Boolean);
    }

    const domUrls = Array.from(container.querySelectorAll([
      '.picture img',
      '.woo-picture-main img',
      '[node-type="fl_pic_list"] img',
      '.media-piclist img',
      '[action-type="fl_pics"] img',
      'img[class*="_pic_"]',
      '[class*="_poster_"] img',
      '.vjs-poster img',
      '.wbpv-poster img',
      '[class*="_previewList_"] img'
    ].join(',')))
      .map(img => normalizeImageUrl(img.currentSrc || img.src))
      .filter(Boolean);

    const backgroundPosterUrls = Array.from(container.querySelectorAll([
      '.wbpv-poster',
      '.vjs-poster',
      '[class*="_poster_"]'
    ].join(',')))
      .map(element => {
        const backgroundImage = getComputedStyle(element).backgroundImage;
        const match = backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);
        return match ? normalizeImageUrl(match[1]) : null;
      })
      .filter(Boolean);

    const dataPosterUrls = Array.from(container.querySelectorAll('[data-str]'))
      .map(element => {
        const data = element.getAttribute('data-str') || '';
        const match = data.match(/\bposter\s*:\s*['"]([^'"]+)['"]/i);
        return match ? normalizeImageUrl(match[1].replaceAll('&amp;', '&')) : null;
      })
      .filter(Boolean);

    const picList = container.querySelector('[node-type="fl_pic_list"][action-data*="pic_ids="]');
    const actionData = picList?.getAttribute('action-data') || '';
    const params = new URLSearchParams(actionData.replaceAll('&amp;', '&'));
    const picIds = (params.get('pic_ids') || '').split(',').filter(Boolean);
    const dataUrls = picIds.map(picId => `https://wx1.sinaimg.cn/large/${picId}.jpg`);

    return [...domUrls, ...backgroundPosterUrls, ...dataPosterUrls, ...dataUrls];
  }

  function getWeiboViewerImageUrls(viewer) {
    const pageUrl = new URL(location.href);
    const isAlbumViewer = pageUrl.searchParams.get('tabtype') === 'album'
      && pageUrl.searchParams.has('index');
    const currentImage = findCurrentWeiboAlbumViewerImage();
    const currentUrl = normalizeImageUrl(currentImage?.currentSrc || currentImage?.src);
    const postUrl = currentUrl ? findWeiboPostUrlNearImage(currentUrl) : null;

    if (isAlbumViewer && currentImage && postUrl) {
      const postContainer = findWeiboPostContainerByUrl(postUrl);
      if (postContainer) {
        const urls = getPostImageUrls(postContainer);
        if (urls.length) return urls;
      }

      const fileName = getImageFileName(currentUrl);
      const matchingImages = Array.from(document.images).filter(image => {
        const imageUrl = normalizeImageUrl(image.currentSrc || image.src);
        return getImageFileName(imageUrl) === fileName;
      });

      for (const image of matchingImages) {
        const postContainer = findPostContainer(image);
        if (!postContainer) continue;

        const containerPostUrl = getWeiboPostUrl(image);
        if (containerPostUrl !== postUrl) continue;

        const urls = getPostImageUrls(postContainer);
        if (urls.length) return urls;
      }

      return [currentUrl];
    }

    const selectorUrls = Array.from(viewer.querySelectorAll([
      'img[class*="_pic_"]',
      '[class*="_previewList_"] img',
      '.woo-picture-img'
    ].join(',')))
      .map(img => normalizeImageUrl(img.currentSrc || img.src))
      .filter(Boolean);

    if (selectorUrls.length > 1) return selectorUrls;

    return selectorUrls;
  }

  function waitForElement(root, selector, timeout = 2000) {
    const existing = root.querySelector(selector);
    if (existing) return Promise.resolve(existing);

    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        const found = root.querySelector(selector);
        if (!found) return;
        observer.disconnect();
        clearTimeout(timer);
        resolve(found);
      });

      const timer = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);

      observer.observe(root, { childList: true, subtree: true });
    });
  }

  function getXCarouselPosition(dialog) {
    const candidates = Array.from(dialog.querySelectorAll('span, div[dir="ltr"]'));
    for (const element of candidates) {
      const text = element.textContent?.trim() || '';
      const match = text.match(/^.*?(\d+)\s*\/\s*(\d+).*$/);
      if (match) return { current: Number(match[1]), total: Number(match[2]) };
    }
    return null;
  }

  async function waitForXCarouselPage(dialog, previousPage, timeout = 1800) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const position = getXCarouselPosition(dialog);
      if (position && position.current !== previousPage) {
        await new Promise(resolve => window.setTimeout(resolve, 160));
        return position;
      }
      await new Promise(resolve => window.setTimeout(resolve, 40));
    }
    return getXCarouselPosition(dialog);
  }

  async function collectAllXMediaDialogImages(dialog) {
    const initial = getXCarouselPosition(dialog);
    const urls = new Set(getXMediaDialogImages(dialog));
    if (!initial || initial.total <= 1) return [...urls];

    let position = initial;
    while (position.current < position.total) {
      const next = dialog.querySelector('[data-testid="Carousel-NavRight"] button');
      if (!next) break;

      const previousPage = position.current;
      next.click();
      position = await waitForXCarouselPage(dialog, previousPage);
      getXMediaDialogImages(dialog).forEach(url => urls.add(url));
      if (!position || position.current === previousPage) break;
    }

    if (urls.size < initial.total) {
      throw new Error(`Expected ${initial.total} images, collected ${urls.size}.`);
    }

    return [...urls];
  }

  async function revealHiddenWeiboImages(container) {
    if (!isWeibo()) return null;

    const count = container.querySelector('[class*="_picNum_"]');
    const mask = count?.closest('[class*="_mask_"]');
    if (!mask) return null;

    mask.click();
    return await waitForElement(container, '[class*="_showPictureViewer_"]');
  }

  function collapseWeiboViewer(viewer) {
    const collapse = Array.from(viewer.querySelectorAll('[class*="_toolItem_"]'))
      .find(element => element.textContent.includes('收起'));
    collapse?.click();
  }

  async function copyForPostElement(element) {
    const mediaDialog = findXMediaDialog(element);
    if (mediaDialog) {
      try {
        const imageUrls = await collectAllXMediaDialogImages(mediaDialog);
        return await copyImages(imageUrls, getCanonicalPostUrl(element));
      } catch (error) {
        console.warn('[XISC] Failed to load all carousel images.', error);
        showCopyToast(t('loadAllFailed'), 'error');
        return false;
      }
    }

    const weiboViewer = findWeiboMediaViewer(element);
    if (weiboViewer) {
      const viewerArticle = element.closest('article')
        || weiboViewer.querySelector('article:has(footer[class*="_isInViewer_"])');
      const viewerTimeLink = viewerArticle?.querySelector('a[class*="_time_"][href]');
      const viewerPostUrl = viewerTimeLink
        ? normalizeWeiboPostUrl(viewerTimeLink.href)
        : null;

      const currentImage = findCurrentWeiboAlbumViewerImage();
      const currentUrl = normalizeImageUrl(currentImage?.currentSrc || currentImage?.src);
      const postUrl = viewerPostUrl
        || (currentUrl ? findWeiboPostUrlNearImage(currentUrl) : null)
        || getCanonicalPostUrl(element);

      if (!postUrl || isCurrentPageUrl(postUrl)) {
        showCopyToast(t('confirmWeiboLinkFailed'), 'error');
        return false;
      }

      await chrome.storage.local.set({
        [PENDING_WEIBO_COPY_KEY]: {
          postUrl,
          createdAt: Date.now()
        }
      });
      showCopyToast(t('openingSourcePost'), 'pending');
      const response = await chrome.runtime.sendMessage({
        type: 'XISC_OPEN_SOURCE_POST',
        url: postUrl
      });
      if (!response?.ok) {
        await chrome.storage.local.remove(PENDING_WEIBO_COPY_KEY);
        showCopyToast(t('openSourceTabFailed'), 'error');
        return false;
      }
      return true;
    }

    if (findWeiboAlbum(element) && !findPostContainer(element)) {
      showCopyToast(t('albumSingleOnly'), 'error');
      return false;
    }

    const container = findXQuoteCard(element) || findPostContainer(element);
    if (!container) return false;

    let viewer = null;
    let imageUrls = getPostImageUrls(container);

    if (isWeibo() && container.querySelector('[class*="_picNum_"]')) {
      viewer = await revealHiddenWeiboImages(container);
      if (viewer) imageUrls = getPostImageUrls(container);
    }

    try {
      return await copyImages(imageUrls, getCanonicalPostUrl(element));
    } finally {
      if (viewer) collapseWeiboViewer(viewer);
    }
  }

  document.addEventListener('contextmenu', event => {
    contextTarget = event.target instanceof Element ? event.target : null;
    contextMediaUrl = contextTarget ? getPosterUrlFromElement(contextTarget) : null;
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'XISC_GET_CONTEXT_MENU_STATE') {
      const target = contextTarget?.isConnected ? contextTarget : null;
      const inMediaLibrary = isX() && /\/media\/?$/.test(location.pathname);
      const inMediaViewer = Boolean(target && findXMediaDialog(target));
      sendResponse({ hideCopyAll: inMediaLibrary && !inMediaViewer });
      return false;
    }

    if (message?.type !== 'XISC_COPY_CONTEXT') return false;

    const target = contextTarget?.isConnected ? contextTarget : null;
    let img = target instanceof HTMLImageElement && hasMediaSource(target) ? target : null;

    const mediaDialog = target ? findXMediaDialog(target) : null;
    if (mediaDialog && message.context === 'image' && img) {
      void copyImages(
        [normalizeImageUrl(img.currentSrc || img.src)],
        getCanonicalPostUrl(target)
      ).then(ok => sendResponse({ ok })).catch(error => {
        console.error('[XISC] X media-dialog copy failed.', error);
        showCopyToast(t('copyFailed'), 'error');
        sendResponse({ ok: false, error: String(error) });
      });
      return true;
    }

    const weiboViewer = target ? findWeiboMediaViewer(target) : null;
    if (weiboViewer && message.context === 'image' && img) {
      const imageUrl = normalizeImageUrl(img.currentSrc || img.src);
      const postUrl = findWeiboPostUrlNearImage(imageUrl) || getCanonicalPostUrl(target);
      void copyImages(
        [imageUrl],
        postUrl
      ).then(ok => sendResponse({ ok })).catch(error => {
        console.error('[XISC] Weibo viewer copy failed.', error);
        showCopyToast(t('copyFailed'), 'error');
        sendResponse({ ok: false, error: String(error) });
      });
      return true;
    }

    if (contextMediaUrl && target) {
      void copyImages([contextMediaUrl], getCanonicalPostUrl(target))
        .then(ok => sendResponse({ ok }))
        .catch(error => {
          console.error('[XISC] Media-poster copy failed.', error);
          showCopyToast(t('copyFailed'), 'error');
          sendResponse({ ok: false, error: String(error) });
        });
      return true;
    }

    if (message.context === 'image' && !img && message.srcUrl) {
      const normalizedSource = normalizeImageUrl(message.srcUrl);
      img = Array.from(document.images).find(candidate =>
        normalizeImageUrl(candidate.currentSrc || candidate.src) === normalizedSource
      ) || null;
    }

    if (message.context === 'image' && img) {
      if (isWeibo()) showCopyToast(t('processingWeiboImage'), 'pending');
      const operation = isWeibo() && findWeiboAlbum(img) && !findWeiboMediaViewer(img)
        ? copyForWeiboAlbumImage(img)
        : copyForImage(img);
      void operation.then(ok => sendResponse({ ok })).catch(error => {
        console.error('[XISC] Single-image copy failed.', error);
        showCopyToast(t('copyFailed'), 'error');
        sendResponse({ ok: false, error: String(error) });
      });
      return true;
    }

    if (message.context === 'image') {
      showCopyToast(t('identifyContextImageFailed'), 'error');
      sendResponse({ ok: false, error: 'Unable to identify the context image.' });
      return false;
    }

    if (!target || (
      !findPostContainer(target)
      && !findXMediaDialog(target)
      && !findWeiboMediaViewer(target)
    )) {
      showCopyToast(t('copyFailed'), 'error');
      sendResponse({ ok: false, error: 'Post context not found.' });
      return false;
    }

    void copyForPostElement(target).then(ok => sendResponse({ ok })).catch(error => {
      console.error('[XISC] Post copy failed.', error);
      showCopyToast(t('copyFailed'), 'error');
      sendResponse({ ok: false, error: String(error) });
    });
    return true;
  });

  chrome.storage.sync.get({ stripFormatting: false }, settings => {
    stripFormatting = settings.stripFormatting === true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.stripFormatting) {
      stripFormatting = changes.stripFormatting.newValue === true;
    }
  });

  async function runPendingWeiboPostCopy() {
    if (!isWeibo()) return;

    const stored = await chrome.storage.local.get(PENDING_WEIBO_COPY_KEY);
    const pending = stored[PENDING_WEIBO_COPY_KEY];
    if (!pending) return;

    if (Date.now() - pending.createdAt > 30000) {
      await chrome.storage.local.remove(PENDING_WEIBO_COPY_KEY);
      return;
    }

    const currentPostUrl = normalizeWeiboPostUrl(location.href);
    if (currentPostUrl !== normalizeWeiboPostUrl(pending.postUrl)) return;

    const deadline = Date.now() + 6000;
    let container = null;
    while (Date.now() < deadline) {
      container = Array.from(document.querySelectorAll([
        'article',
        '[role="article"]',
        '[action-type="feed_list_item"]',
        '[class*="card-wrap"]'
      ].join(','))).find(candidate =>
        getWeiboPostUrl(candidate) === currentPostUrl
        && getPostImageUrls(candidate).length > 0
      ) || null;
      if (container) break;
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }

    await chrome.storage.local.remove(PENDING_WEIBO_COPY_KEY);

    if (!container) {
      showCopyToast(t('sourceLoadFailed'), 'error');
      return;
    }

    const imageUrls = getPostImageUrls(container);
    if (!imageUrls.length) {
      showCopyToast(t('sourceNoImages'), 'error');
      return;
    }

    await copyImages(imageUrls, currentPostUrl);
  }

  void runPendingWeiboPostCopy().catch(error => {
    console.error('[XISC] Pending Weibo post copy failed.', error);
    showCopyToast(t('sourceCopyFailed'), 'error');
    void chrome.storage.local.remove(PENDING_WEIBO_COPY_KEY);
  });
})();
