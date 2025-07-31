import path from 'path';
import fs from 'fs';
import os from 'os';
import fetch from 'node-fetch';
import decompress from 'decompress';


// Функция для уведомления о прогрессе в UI
let onProgress = () => {};

// --- КОНФИГУРАЦИЯ JAVA ---
const JAVA_VERSION = 17;
// --------------------------

// Определяем ОС и архитектуру для запроса к API
function getPlatformDetails() {
    const platform = os.platform(); // 'win32', 'linux'
    const arch = os.arch(); // 'x64'
    
    let os_name = '';
    if (platform === 'win32') os_name = 'windows';
    else if (platform === 'linux') os_name = 'linux';
    else throw new Error(`Unsupported OS: ${platform}`);

    return { os_name, arch };
}

// Получаем путь к исполняемому файлу Java внутри распакованной папки
function getJavaExecutablePath(runtimeDir) {
    const platform = os.platform();
    if (platform === 'win32') {
        return path.join(runtimeDir, `jdk-${JAVA_VERSION}`, 'bin', 'javaw.exe');
    } else { // linux, macos
        return path.join(runtimeDir, `jdk-${JAVA_VERSION}`, 'bin', 'java');
    }
}


async function ensureJavaRuntime(rootPath, progressCallback) {
    onProgress = progressCallback;
    const RUNTIME_DIR = path.join(rootPath, 'runtime');
    const javaExecutable = getJavaExecutablePath(RUNTIME_DIR); 
    
    onProgress({ text: 'Проверка среды выполнения Java...' });
    
    if (fs.existsSync(javaExecutable)) {
        console.log(`Java Runtime найдена: ${javaExecutable}`);
        return javaExecutable;
    }

    console.log('Среда выполнения Java не найдена. Начинается загрузка...');
    onProgress({ text: 'Среда Java не найдена. Загрузка...' });

    try {
        const { os_name, arch } = getPlatformDetails();
        
        // Формируем URL для API Adoptium
        const api_url = `https://api.adoptium.net/v3/assets/latest/${JAVA_VERSION}/hotspot?vendor=eclipse&os=${os_name}&architecture=${arch}&image_type=jre`;
        
        onProgress({ text: 'Запрос к API Adoptium...' });
        const response = await fetch(api_url);
        const data = await response.json();
        
        const downloadUrl = data[0].binary.package.link;
        const tempFileName = path.join(rootPath, 'jre.tmp');

        onProgress({ text: `Загрузка Java JRE ${JAVA_VERSION}...` });
        const fileResponse = await fetch(downloadUrl);
        
        if (!fs.existsSync(rootPath)) {
            fs.mkdirSync(rootPath, { recursive: true });
        }
        
        const fileStream = fs.createWriteStream(tempFileName);
        await new Promise((resolve, reject) => {
            fileResponse.body.pipe(fileStream);
            fileResponse.body.on("error", reject);
            fileStream.on("finish", resolve);
        });

        onProgress({ text: 'Распаковка архива...' });
        // Распаковываем архив, удаляя первый уровень вложенности
        await decompress(tempFileName, RUNTIME_DIR, {
            // Находим и переименовываем корневую папку в `jdk-17`
            map: file => {
                const parts = file.path.split('/');
                parts[0] = `jdk-${JAVA_VERSION}`;
                file.path = parts.join('/');
                return file;
            }
        });

        onProgress({ text: 'Удаление временных файлов...' });
        fs.unlinkSync(tempFileName);

        console.log('Среда выполнения Java успешно установлена.');
        onProgress({ text: 'Java установлена.' });

        return javaExecutable;

    } catch (error) {
        console.error('Ошибка при установке Java:', error);
        onProgress({ text: `Ошибка установки Java: ${error.message}`, error: true });
        throw error;
    }
}

export { ensureJavaRuntime };