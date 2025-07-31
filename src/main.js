import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { ensureJavaRuntime } from './java-manager.js';
import { ensureForgeInstaller, startGame, syncMods } from './launcher.js';
import { updateElectronApp } from 'update-electron-app';
if (require('electron-squirrel-startup')) {
    app.quit();
}
const USER_DATA_PATH = app.getPath('userData');
const ROOT_PATH = path.join(USER_DATA_PATH, 'minecraft');
// Создаем хранилище для настроек
const store = new Store();
let mainWindow;
let loadingWindow;
// Конфигурация нашей сборки
const HATCHUP_CREATE_PROFILE = {
    name: "HATCHUP CREATE",
    minecraftVersion: "1.20.1",
    forgeVersion: "47.4.4",
    serverIp: "server.hatchup.ru", // IP вашего сервера
    modsUrl: "https://map.hatchup.ru/downloads/create/mods/mods_manifest.json",
    forgeInstallerName: "forge-installer.jar",
    forgeInstallerUrl: "https://map.hatchup.ru/downloads/create/forge-installer.jar"
};
const createLoadingWindow = () => {
    loadingWindow = new BrowserWindow({
        width: 300,
        height: 200,
        frame: false,
        resizable: false,
        webPreferences: {
            // Webpack требует preload для вставки CSS
            preload: LOADING_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    });
    // Используем правильную переменную и loadURL
    loadingWindow.loadURL(LOADING_WINDOW_WEBPACK_ENTRY);
};
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 900,
        minHeight: 600,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        // -----------------------
        icon: path.join(__dirname, 'assets', 'icon.ico'),

        resizable: true, // Временно поставим true для удобства отладки
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    });

    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    mainWindow.setMenu(null);

    // --- ИЗМЕНЕНИЕ: Принудительно открываем DevTools для отладки ---
    // Это будет работать только в режиме разработки (`npm start`)
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

};
ipcMain.on('renderer-ready', () => {
    console.log('Received renderer-ready signal. Showing main window.');
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});
app.on('ready', () => {
    updateElectronApp({
        repo: 'hatchup-dev/hatchup-launcher', // ЗАМЕНИТЬ на ваше
        updateInterval: '1 hour'
    });
    createLoadingWindow();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});
ipcMain.on('restore-window', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});
// === Обработчики событий от интерфейса (Renderer) ===

// Получение прогресса и отправка в окно
const sendToRenderer = (channel, data) => {
    BrowserWindow.getAllWindows()[0].webContents.send(channel, data);
};

// Запуск игры
ipcMain.handle('launch-game', async (event, { nickname }) => {
    try {
        const defaults = {
            ram: 4,
            window: { width: 1024, height: 768 },
            fullscreen: false,
            autoConnect: true,
        };
        const settings = { ...defaults, ...store.get('settings') };
        // Вызываем менеджер Java
        const javaPath = await ensureJavaRuntime(ROOT_PATH, (progress) => {
            sendToRenderer('update-status', progress);
        });
        const forgeInstallerPath = await ensureForgeInstaller(HATCHUP_CREATE_PROFILE, ROOT_PATH, (progress) => {
            sendToRenderer('update-status', progress);
        });
        sendToRenderer('update-status', { text: 'Синхронизация модов...' });
        await syncMods(HATCHUP_CREATE_PROFILE.modsUrl, ROOT_PATH, (progress) => {
            sendToRenderer('update-status', progress);
        });

        sendToRenderer('update-status', { text: 'Запуск игры...' });
        const launchOptions = {
            nickname: nickname,
            javaPath: javaPath,
            forgeInstallerPath: forgeInstallerPath,
            rootPath: ROOT_PATH, 
            ram: settings.ram,
            window: settings.window,
            fullscreen: settings.fullscreen,
            autoConnect: settings.autoConnect
        };
        await startGame(HATCHUP_CREATE_PROFILE, launchOptions, (progress) => { // <-- ИЗМЕНЕНИЕ
            sendToRenderer('update-status', progress);
        });

        return { success: true };
    } catch (error) {
        console.error(error);
        sendToRenderer('update-status', { text: `Критическая ошибка: ${error.message}`, error: true });
        return { success: false, error: error.message };
    }
});

// Сохранение и загрузка настроек
ipcMain.handle('get-store-value', (event, key) => {
    return store.get(key);
});
ipcMain.handle('set-store-value', (event, { key, value }) => {
    store.set(key, value);
});
ipcMain.on('open-game-folder', () => {
    shell.openPath(ROOT_PATH);
});