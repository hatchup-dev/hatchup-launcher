import { contextBridge, ipcRenderer } from 'electron';

// Мы извлекаем конфигурацию ОЗУ, как и раньше
const ramConfigArg = process.argv.find(arg => arg.startsWith('--ram-config='));
const ramConfigJSON = ramConfigArg ? ramConfigArg.split('=')[1] : '{}';
const ramConfig = JSON.parse(ramConfigJSON);

// "Мост" между изолированным миром Electron и вашим renderer-кодом
contextBridge.exposeInMainWorld('api', {

    // --- ФУНКЦИИ, СВЯЗАННЫЕ С ИГРОЙ ---
    launchGame: (args) => ipcRenderer.invoke('launch-game', args),
    openGameFolder: () => ipcRenderer.send('open-game-folder'),
    getPlayerData: (uuid, token) => ipcRenderer.invoke('get-player-data', { uuid, token }),
    getItemIcon: (itemId) => ipcRenderer.invoke('get-item-icon', itemId),

    // --- ФУНКЦИИ, СВЯЗАННЫЕ С АВТОРИЗАЦИЕЙ (НОВЫЕ) ---
    startDiscordAuth: () => ipcRenderer.send('start-discord-auth'),
    processDiscordAuth: (code) => ipcRenderer.invoke('process-discord-auth', code),
    registerNickname: (data) => ipcRenderer.invoke('register-nickname', data), 
    verifySession: (token) => ipcRenderer.invoke('verify-session', token),
    logout: (token) => ipcRenderer.invoke('logout', token),
    openSkinDialog: () => ipcRenderer.invoke('open-skin-dialog'),
    uploadSkin: (data) => ipcRenderer.invoke('upload-skin', data),

    // --- ФУНКЦИИ ДЛЯ РАБОТЫ С НАСТРОЙКАМИ ---
    getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
    setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', { key, value }),
    getRamConfiguration: () => ramConfig,
    
    // --- ФУНКЦИИ УПРАВЛЕНИЯ ОКНОМ ---
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    restoreWindow: () => ipcRenderer.send('restore-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    openMapWindow: (url) => ipcRenderer.send('open-map-window', url),

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ОТ ГЛАВНОГО ПРОЦЕССА ---
    
    // Сигнал о том, что renderer полностью готов к показу
    notifyMainWhenReady: () => ipcRenderer.send('renderer-ready'),
    
    // Универсальный обработчик для подписки на любые события из main
    on: (channel, callback) => {
        // Создаем "белый список" каналов, которые renderer может слушать, для безопасности
        const validChannels = [
            'update-status', 
            'update-server-status',
            'discord-auth-code' // <-- Наш новый канал для кода авторизации
        ];
        if (validChannels.includes(channel)) {
            // Безопасно передаем вызов в ipcRenderer
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
});