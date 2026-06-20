const stripFormattingInput = document.querySelector('#stripFormatting');
const status = document.querySelector('#status');
const version = document.querySelector('.version');
let statusTimer = 0;

document.documentElement.lang = chrome.i18n.getUILanguage();
version.textContent = `v${chrome.runtime.getManifest().version}`;
document.querySelectorAll('[data-i18n]').forEach(element => {
  element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
});

function showSavedStatus() {
  status.textContent = chrome.i18n.getMessage('settingsSaved');
  status.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    status.classList.remove('is-visible');
    status.textContent = '';
  }, 1500);
}

chrome.storage.sync.get({ stripFormatting: false }, settings => {
  stripFormattingInput.checked = settings.stripFormatting === true;
});

stripFormattingInput.addEventListener('change', async () => {
  await chrome.storage.sync.set({ stripFormatting: stripFormattingInput.checked });
  showSavedStatus();
});
