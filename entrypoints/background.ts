export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return;
    const helpUrl = chrome.runtime.getURL('/help.html');
    void chrome.tabs.create({ url: helpUrl });
  });
});
