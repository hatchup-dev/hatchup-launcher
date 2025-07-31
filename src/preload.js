const { contextBridge, ipcRenderer } = require('electron');
const ramConfigArg = process.argv.find(arg => arg.startsWith('--ram-config='));
const ramConfigJSON = ramConfigArg ? ramConfigArg.split('=')[1] : '{}';
const ramConfig = JSON.parse(ramConfigJSON);
contextBridge.exposeInMainWorld('api', {
    // Запуск игры
    launchGame: (args) => ipcRenderer.invoke('launch-game', args),

    // Сохранение и загрузка настроек
    getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
    setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', { key, value }),

    // Получение событий от main процесса
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    openGameFolder: () => ipcRenderer.send('open-game-folder'),
    notifyMainWhenReady: () => ipcRenderer.send('renderer-ready'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    restoreWindow: () => ipcRenderer.send('restore-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    getRamConfiguration: () => ramConfig,
});