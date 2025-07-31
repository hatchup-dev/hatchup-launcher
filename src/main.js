import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import Store from 'electron-store';
import fetch from 'node-fetch';
import { ensureJavaRuntime } from './java-manager.js';
import { ensureForgeInstaller, startGame, syncMods } from './launcher.js';
import { updateElectronApp } from 'update-electron-app';
import RPC from 'discord-rpc';
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


const clientId = '1400609868129374328';
const rpc = new RPC.Client({ transport: 'ipc' });

let rpcReady = false;
let inGame = false;
let onlinePlayers = 0;
let maxPlayers = 0;
let activityStartTime;

function updateRPC() {
    // Не делаем ничего, если RPC не подключен
    if (!rpcReady) return;
    if (!activityStartTime) {
        activityStartTime = new Date();
    }
    let activity;

    if (inGame) {
        // Статус "В игре"
        activity = {
            details: 'Играет на HATCHUP CREATE',
            state: 'Строит заводы',
            startTimestamp: activityStartTime,
            partySize: onlinePlayers,
            partyMax: maxPlayers,
            largeImageKey: 'server_logo',
            largeImageText: 'HATCHUP CREATE',
            instance: false,
        };
    } else {
        // Статус "В лаунчере"
        activity = {
            details: 'Отдыхает в лаунчере',
            state: 'Готовится к смене на заводе',
            startTimestamp: activityStartTime,
            largeImageKey: 'launcher_logo',
            largeImageText: 'HATCHUP Launcher',
            instance: false,
        };
    }

    rpc.setActivity(activity).catch(console.error);
}
function setGameState(newInGameStatus) {
    if (inGame === newInGameStatus) return;

    inGame = newInGameStatus;
    activityStartTime = new Date();
    updateRPC();
}
async function connectToDiscord() {
    try {
        await rpc.login({ clientId });
        console.log('Successfully connected to Discord RPC.');
    } catch (error) {
        // Ошибка, если Discord не запущен. Повторяем попытку через 20 секунд.
        console.log('Could not connect to Discord, retrying in 20 seconds...');
        setTimeout(connectToDiscord, 20000);
    }
}
rpc.on('ready', () => {
    rpcReady = true;
    console.log('Discord RPC is ready. Setting initial activity.');
    setGameState(false);
    updateRPC(); // Устанавливаем начальный статус

    setInterval(() => {
        if (inGame) {
            updateRPC();
        }
    }, 15000);
});

// Запускаем первую попытку подключения
connectToDiscord();


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
        minHeight: 720,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        // -----------------------
        icon: path.join(__dirname, 'assets', 'icon.ico'),

        resizable: true, // Временно поставим true для удобства отладки
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            additionalArguments: [`--ram-config=${JSON.stringify(getRamConfiguration())}`]
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

async function checkServerStatus() {
    // Если главного окна нет, ничего не делаем
    if (!mainWindow) return;

    const serverAddress = HATCHUP_CREATE_PROFILE.serverIp;
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${serverAddress}`;

    try {
        const response = await fetch(apiUrl);
        const serverStatus = await response.json();
        if (serverStatus.online) {
            onlinePlayers = serverStatus.players.online;
            maxPlayers = serverStatus.players.max;
        } else {
            onlinePlayers = 0;
            maxPlayers = 0;
        }
        mainWindow.webContents.send('update-server-status', serverStatus);
    } catch (error) {
        // Если произошла сетевая ошибка, отправляем "пустой" оффлайн-статус
        console.error('Failed to get server status from mcstatus.io:', error.message);
        mainWindow.webContents.send('update-server-status', { online: false });
    }
}
function getRamConfiguration() {
    // Получаем общий объем ОЗУ в байтах и конвертируем в гигабайты
    const totalRamGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));

    let defaultRam = Math.floor(totalRamGB / 2);
    if (defaultRam > 6) defaultRam = 6;
    if (defaultRam < 2) defaultRam = 2;

    return {
        min: 2, // Жестко заданный минимум
        max: totalRamGB, // Максимум - это вся память ПК
        default: defaultRam, // Наше расчетное значение по умолчанию
    };
}
ipcMain.on('renderer-ready', () => {
    console.log('Received renderer-ready signal. Showing main window.');
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        checkServerStatus();
        setInterval(checkServerStatus, 30000);
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
            if (progress.launched) {
                setGameState(true);
            }

            if (progress.finished || progress.error) {
                setGameState(false);
            }
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
    if (key === 'settings') {
        const ramConfig = getRamConfiguration();
        const storedSettings = store.get('settings');

        // Если настроек нет, создаем их с правильным значением RAM по умолчанию
        if (!storedSettings) {
            return {
                ram: ramConfig.default,
                window: { width: 1024, height: 768 },
                fullscreen: false,
                autoConnect: true,
            };
        }
        return storedSettings;
    }
    return store.get(key);
});
ipcMain.handle('set-store-value', (event, { key, value }) => {
    store.set(key, value);
});
ipcMain.on('open-game-folder', () => {
    shell.openPath(ROOT_PATH);
});