import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import { ensureJavaRuntime } from './java-manager.js';
import { ensureForgeInstaller, startGame, syncMods } from './launcher.js';
if (require('electron-squirrel-startup')) {
  app.quit();
}
// Создаем хранилище для настроек
const store = new Store();

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

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 900,
        minHeight: 600,
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

    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });
};

app.on('ready', createWindow);

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
        const javaPath = await ensureJavaRuntime((progress) => {
            sendToRenderer('update-status', progress);
        });
        const forgeInstallerPath = await ensureForgeInstaller(HATCHUP_CREATE_PROFILE, (progress) => {
            sendToRenderer('update-status', progress);
        });
        sendToRenderer('update-status', { text: 'Синхронизация модов...' });
        await syncMods(HATCHUP_CREATE_PROFILE.modsUrl, (progress) => {
            sendToRenderer('update-status', progress);
        });

        sendToRenderer('update-status', { text: 'Запуск игры...' });
        const launchOptions = {
            nickname: nickname,
            javaPath: javaPath,
            forgeInstallerPath: forgeInstallerPath,
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
    const rootPath = path.join(process.cwd(), 'minecraft');
    // Безопасно открываем путь в системном файловом менеджере
    shell.openPath(rootPath);
});