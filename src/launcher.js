import { Client, Authenticator } from 'minecraft-launcher-core';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';

const launcher = new Client();
const AUTH_BACKEND_URL = 'https://auth.hatchup.ru/authserver';
Authenticator.changeApiUrl(AUTH_BACKEND_URL);
async function ensureForgeInstaller(profile, rootPath, onProgress) {
    onProgress({ text: 'Проверка установщика Forge...' });
    const installerName = profile.forgeInstallerName;
    // Используем path.join для кроссплатформенности
    const installerPath = path.join(rootPath, installerName);

    // Если файл уже есть, ничего не делаем
    if (fs.existsSync(installerPath)) {
        console.log('Установщик Forge найден локально.');
        onProgress({ text: 'Установщик Forge найден.' });
        return installerPath;
    }

    // Если файла нет, скачиваем его
    console.log('Установщик Forge не найден, начинается загрузка...');
    onProgress({ text: 'Загрузка установщика Forge...' });

    try {
        const response = await fetch(profile.forgeInstallerUrl);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }
        const fileBuffer = await response.buffer();
        fs.writeFileSync(installerPath, fileBuffer);

        console.log('Установщик Forge успешно загружен.');
        onProgress({ text: 'Установщик Forge загружен.' });
        return installerPath;
    } catch (error) {
        console.error('Не удалось скачать установщик Forge:', error);
        onProgress({ text: `Ошибка загрузки Forge: ${error.message}`, error: true });
        throw error;
    }
}

async function ensureAuthLib(profile, rootPath, onProgress) {
    onProgress({ text: 'Проверка AuthLib...' });
    const libName = profile.authLibName;
    // Используем path.join для кроссплатформенности
    const libPath = path.join(rootPath, libName);

    // Если файл уже есть, ничего не делаем
    if (fs.existsSync(libPath)) {
        console.log('AuthLib найден локально.');
        onProgress({ text: 'AuthLib найден.' });
        return libPath;
    }

    // Если файла нет, скачиваем его
    console.log('AuthLib не найден, начинается загрузка...');
    onProgress({ text: 'Загрузка AuthLib...' });

    try {
        const response = await fetch(profile.authLibUrl);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }
        const fileBuffer = await response.buffer();
        fs.writeFileSync(libPath, fileBuffer);

        console.log('AuthLib успешно загружен.');
        onProgress({ text: 'AuthLib загружен.' });
        return libPath;
    } catch (error) {
        console.error('Не удалось скачать AuthLib:', error);
        onProgress({ text: `Ошибка загрузки AuthLib: ${error.message}`, error: true });
        throw error;
    }
}

// Функция для синхронизации модов
async function syncMods(manifestUrl, rootPath, onProgress) {
    const modsDir = path.join(rootPath, 'mods');
    if (!fs.existsSync(modsDir)) {
        fs.mkdirSync(modsDir, { recursive: true });
    }

    onProgress({ text: 'Загрузка манифеста модов...' });
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    const requiredFiles = manifest.files;

    const existingFiles = fs.readdirSync(modsDir);
    const requiredFileNames = requiredFiles.map(f => f.name);

    // 1. Удаление лишних модов
    for (const file of existingFiles) {
        if (!requiredFileNames.includes(file)) {
            onProgress({ text: `Удаление лишнего файла: ${file}` });
            fs.unlinkSync(path.join(modsDir, file));
        }
    }

    // 2. Проверка и загрузка нужных модов
    for (const requiredFile of requiredFiles) {
        const filePath = path.join(modsDir, requiredFile.name);
        let needsDownload = false;

        if (!fs.existsSync(filePath)) {
            needsDownload = true;
        } else {
            const hash = crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
            if (hash !== requiredFile.sha1) {
                needsDownload = true;
            }
        }

        if (needsDownload) {
            onProgress({ text: `Загрузка: ${requiredFile.name}` });
            const fileResponse = await fetch(requiredFile.url);
            const fileBuffer = await fileResponse.buffer();
            fs.writeFileSync(filePath, fileBuffer);
        }
    }
    onProgress({ text: 'Синхронизация модов завершена.' });
}

// Функция для запуска игры
async function startGame(profile, options, onProgress) {
    const authorization = await Authenticator.getAuth(options.nickname, options.sessionToken);
    const opts = {
        javaPath: options.javaPath,
        authorization: authorization,
        root: options.rootPath,
        version: {
            number: profile.minecraftVersion,
            type: "release"
        },
        forge: options.forgeInstallerPath,
        memory: {
            max: `${options.ram}G`,
            min: "1G"
        },
        window: {
            width: options.window.width,
            height: options.window.height,
            fullscreen: options.fullscreen
        },
        customArgs: [
            "-javaagent:"+options.authLibPath+"=https://auth.hatchup.ru"
        ]
    };
    if (options.autoConnect) {
        opts.quickPlay = {
            type: "multiplayer",
            identifier: profile.serverIp
        };
    }

    console.log("--- ЗАПУСК С ОПЦИЯМИ ---");
    console.log(opts);
    console.log("------------------------");

    launcher.launch(opts);
    launcher.on('progress', (e) => {
        const progressData = {
            text: `Загрузка: ${e.type}`,
            progress: (e.task / e.total * 100).toFixed(0)
        };
        onProgress(progressData);
    });
    launcher.once('data', (e) => {
        onProgress({ text: 'Приятной игры!', launched: true });
    });
    launcher.on('close', (e) => {
        onProgress({ text: 'Игра закрыта. Готов к запуску!', progress: 0, finished: true });
    });

    launcher.on('error', (err) => {
        console.error(err);
        onProgress({ text: `Ошибка: ${err.message}`, error: true });
    });
}

export { ensureForgeInstaller, ensureAuthLib, startGame, syncMods };