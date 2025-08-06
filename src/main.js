import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron';
import path from 'path';
import os from 'os';
import Store from 'electron-store';
import fetch from 'node-fetch';
import { ensureJavaRuntime } from './java-manager.js';
import { ensureForgeInstaller, ensureAuthLib, startGame, syncMods } from './launcher.js';
import { updateElectronApp } from 'update-electron-app';
import http from 'http';
import url from 'url';
import fs from 'fs'
import FormData from 'form-data';
import RPC from 'discord-rpc';
import { v4 as uuidv4 } from 'uuid';
if (require('electron-squirrel-startup')) {
    app.quit();
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {

    console.log('Another instance is already running. Quitting.');
    app.quit();
} else {

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore(); // Если окно было свернуто, восстанавливаем его
            mainWindow.focus(); // Активируем окно
        }
    });




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
        authLibName: "authlib-injector.jar",
        authLibUrl: "https://map.hatchup.ru/downloads/create/authlib-injector.jar"
    };


    const clientId = '1400609868129374328';
    const rpc = new RPC.Client({ transport: 'ipc' });

    let iconCache = {};
    let rpcReady = false;
    let inGame = false;
    let onlinePlayers = 0;
    let maxPlayers = 0;
    let activityStartTime;
    function ensureClientToken() {
        let clientToken = store.get('clientToken');
        if (!clientToken) {
            clientToken = uuidv4();
            store.set('clientToken', clientToken);
            console.log('Generated new clientToken:', clientToken);
        }
        return clientToken;
    }
    const clientToken = ensureClientToken();
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
    function loadIconCache() {
        const cachePath = path.join(ROOT_PATH, 'launcher_data', 'icons.json');
        try {
            if (fs.existsSync(cachePath)) {
                const data = fs.readFileSync(cachePath, 'utf8');
                iconCache = JSON.parse(data);
                console.log(`Icon cache loaded. Found ${Object.keys(iconCache).length} icons.`);
            } else {
                console.log('Icon cache not found. It will be generated on next game launch.');
            }
        } catch (error) {
            console.error('Failed to load icon cache:', error);
        }
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

    const DISCORD_CLIENT_ID = clientId;
    const AUTH_BACKEND_URL = 'https://auth.hatchup.ru';

    function startDiscordAuth() {
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A53135%2Fcallback&response_type=code&scope=identify%20guilds`;
        shell.openExternal(discordAuthUrl);
    }
    let authResponseServer;
    // Запускаем временный сервер для перехвата ответа от Discord
    function createAuthServer() {
        http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const { code } = parsedUrl.query;

            // Если пришел код, значит это заход от Discord.
            // Сохраняем response-объект и ждем, пока main-процесс его обработает.
            if (code) {
                authResponseServer = res; // Сохраняем res, чтобы ответить на него позже
                mainWindow.webContents.send('discord-auth-code', code);
            } else {
                // Если зашли без кода, это ошибка
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>Некорректный запрос.</h1>');
            }
        }).listen(53135, '127.0.0.1');
    }


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
    function createMapWindow(mapUrl) {
        // Проверяем, не открыто ли уже окно карты, чтобы избежать дублирования
        let mapWindow = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Веб-карта');
        if (mapWindow) {
            mapWindow.loadURL(mapUrl);
            mapWindow.focus();
            return;
        }

        mapWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            title: 'Веб-карта',
            icon: path.join(__dirname, 'assets', 'icon.ico'),
            webPreferences: {
                preload: null
            }
        });

        // Загружаем URL карты
        mapWindow.loadURL(mapUrl);

        // Можно оставить стандартное меню для навигации (Назад, Вперед, Обновить)
        mapWindow.setMenu(null);
    }
    ipcMain.on('open-map-window', (event, url) => {
        createMapWindow(url);
    });
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
            repo: 'hatchup-dev/hatchup-launcher',
            updateInterval: '1 hour'
        });
        loadIconCache();
        createAuthServer();
        createLoadingWindow();
        createWindow();
    });
    app.whenReady().then(() => {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "script-src 'self' 'unsafe-eval';",
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
                        "font-src 'self' https://fonts.gstatic.com;",
                        "img-src 'self' data: https://auth.hatchup.ru;",
                        "connect-src 'self' ws: https://auth.hatchup.ru;",
                        "default-src 'self';"
                    ].join(' ')
                }
            });
        });
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
    ipcMain.on('start-discord-auth', () => {
        startDiscordAuth();
    });
    ipcMain.handle('get-item-icon', (event, itemId) => {
        return iconCache[itemId] || null; // Возвращаем Base64 или null
    });
    ipcMain.handle('open-skin-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Выберите файл скина',
            filters: [{ name: 'Изображения', extensions: ['png'] }],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null; // Пользователь отменил выбор
        } else {
            return result.filePaths[0]; // Возвращаем путь к выбранному файлу
        }
    });
    ipcMain.handle('upload-skin', async (event, { filePath, uuid, sessionToken }) => {
        const form = new FormData();
        form.append('uuid', uuid);
        form.append('sessionToken', sessionToken);
        form.append('skin', fs.createReadStream(filePath));
        try {
            // 4. Отправляем запрос
            const response = await fetch(`${AUTH_BACKEND_URL}/skins/upload`, {
                method: 'POST',
                body: form,
                // 5. Передаем заголовки, сгенерированные библиотекой form-data.
                //    Они будут содержать правильный Content-Type: multipart/form-data; boundary=...
                headers: form.getHeaders(),
            });

            return await response.json();

        } catch (error) {
            console.error('Failed to upload skin:', error);
            return { status: 'error', error: 'Failed to read file or contact server.' };
        }
    });
    ipcMain.handle('process-discord-auth', async (event, code) => {
        try {
            // 1. Обращаемся к нашему бэкенду
            const response = await fetch(`${AUTH_BACKEND_URL}/auth/discord`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const backendResponse = await response.json();

            // 2. Анализируем ответ бэкенда и отвечаем в браузер
            if (backendResponse.status === 'ok' || backendResponse.status === 'register_needed') {
                // Если все хорошо или нужна регистрация, показываем страницу успеха
                const successPagePath = path.join(__dirname, 'static', 'callback-success.html');
                const pageData = fs.readFileSync(successPagePath);
                authResponseServer.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                authResponseServer.end(pageData);
            } else if (backendResponse.status === 'guild_member_required') {
                // Если пользователь не на сервере, показываем страницу ошибки
                const failurePagePath = path.join(__dirname, 'static', 'callback-failure.html');
                const pageData = fs.readFileSync(failurePagePath);
                authResponseServer.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                authResponseServer.end(pageData);
            } else {
                // Другие ошибки бэкенда
                throw new Error(backendResponse.message || 'Unknown backend error');
            }

            // 3. Возвращаем результат в renderer, чтобы он обновил свой UI
            return backendResponse;

        } catch (error) {
            console.error("Error processing discord auth:", error);
            // Если произошла ошибка, сообщаем об этом и в браузер, и в renderer
            if (authResponseServer) {
                authResponseServer.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                authResponseServer.end('<h1>Ошибка сервера авторизации.</h1>');
            }
            return { status: 'error', message: 'Не удалось связаться с сервером авторизации.' };
        }
    });
    ipcMain.handle('register-nickname', async (event, data) => {
        try {
            const response = await fetch(`${AUTH_BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const responseData = await response.json();
            // Добавляем статус ответа, чтобы renderer мог понять, был ли запрос успешным
            responseData.httpStatus = response.status;
            return responseData;
        } catch (error) {
            console.error("Error registering nickname:", error);
            return {
                status: 'error',
                message: 'Не удалось связаться с сервером регистрации.',
                httpStatus: 500
            };
        }
    });
    ipcMain.handle('verify-session', async (event, token) => {
        try {
            const response = await fetch(`${AUTH_BACKEND_URL}/auth/verify-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: token }),
            });
            return await response.json();
        } catch (error) {
            return { status: 'error', message: 'Не удалось связаться с сервером.' };
        }
    });
    ipcMain.handle('logout', async (event, token) => {
        try {
            await fetch(`${AUTH_BACKEND_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: token }),
            });
            return { success: true };
        } catch (error) {
            console.error("Logout request failed:", error);
            return { success: false };
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
    ipcMain.handle('launch-game', async (event, { nickname, sessionToken }) => {
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
            const authLibPath = await ensureAuthLib(HATCHUP_CREATE_PROFILE, ROOT_PATH, (progress) => {
                sendToRenderer('update-status', progress);
            });
            sendToRenderer('update-status', { text: 'Синхронизация модов...' });
            await syncMods(HATCHUP_CREATE_PROFILE.modsUrl, ROOT_PATH, (progress) => {
                sendToRenderer('update-status', progress);
            });

            sendToRenderer('update-status', { text: 'Запуск игры...' });
            const launchOptions = {
                nickname: nickname,
                sessionToken: sessionToken,
                javaPath: javaPath,
                forgeInstallerPath: forgeInstallerPath,
                authLibPath: authLibPath,
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
    ipcMain.handle('get-player-data', async (event, { uuid, token }) => {
        try {
            const response = await fetch(`${AUTH_BACKEND_URL}/playerdata/${uuid}`, {
                headers: {
                    // Отправляем токен сессии для авторизации
                    'Authorization': `Bearer ${token}`
                }
            });
            const playerData = await response.json();
            const textureProperty = playerData.properties?.find(p => p.name === 'textures');
            if (textureProperty) {
                try {
                    // Buffer доступен в main процессе "из коробки"
                    const decodedValue = Buffer.from(textureProperty.value, 'base64').toString('utf8');
                    const textureData = JSON.parse(decodedValue);

                    // Добавляем новый, удобный ключ в наш объект
                    playerData.decodedTextures = textureData;
                } catch (e) {
                    console.error("Failed to decode texture property:", e);
                    playerData.decodedTextures = null;
                }
            }
            return playerData;
        } catch (error) {
            console.error("Error fetching player data:", error);
            return { status: 'error', message: 'Не удалось связаться с сервером.' };
        }
    });
    ipcMain.on('open-game-folder', () => {
        shell.openPath(ROOT_PATH);
    });
}