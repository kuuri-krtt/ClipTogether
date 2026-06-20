const COPY_IMAGE_MENU_ID = 'xisc-copy-image-source';
const COPY_POST_MENU_ID = 'xisc-copy-post-images-source';

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: COPY_IMAGE_MENU_ID,
      title: chrome.i18n.getMessage('copyImageMenu'),
      contexts: ['image', 'video']
    });

    chrome.contextMenus.create({
      id: COPY_POST_MENU_ID,
      title: chrome.i18n.getMessage('copyAllMenu'),
      contexts: ['page', 'selection'],
      documentUrlPatterns: [
        'https://x.com/*',
        'https://twitter.com/*',
        'https://weibo.com/*',
        'https://www.weibo.com/*',
        'https://s.weibo.com/*',
        'https://m.weibo.cn/*'
      ]
    });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (![COPY_IMAGE_MENU_ID, COPY_POST_MENU_ID].includes(info.menuItemId)) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'XISC_COPY_CONTEXT',
    context: info.menuItemId === COPY_IMAGE_MENU_ID ? 'image' : 'post',
    srcUrl: info.srcUrl
  }).catch(error => {
    console.warn('[ClipTogether] Context-menu copy failed.', error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'XISC_OPEN_SOURCE_POST' || !message.url) return false;

  chrome.tabs.create({
    url: message.url,
    active: true,
    openerTabId: sender.tab?.id
  }).then(tab => {
    sendResponse({ ok: true, tabId: tab.id });
  }).catch(error => {
    console.error('[ClipTogether] Failed to open source post tab.', error);
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});
