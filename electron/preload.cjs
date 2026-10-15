const { contextBridge, webUtils } = require('electron');

// XML'e dosyanın gerçek yolunu yazabilmek için (Premiere'de medya offline gelmesin)
contextBridge.exposeInMainWorld('kisaKes', {
  getPathForFile: (file) => webUtils.getPathForFile(file)
});
