import './styles.css';
import launcherLogoSrc from './assets/launcher-logo.png';
import settingsIconSrc from './assets/settings-icon.svg';
import serverLogoSrc from './assets/logo.png';
import folderIconSrc from './assets/folder-icon.svg';
import arrowLeftSrc from './assets/arrow-left.svg';
import arrowRightSrc from './assets/arrow-right.svg';
import './assets/background-day.png';
import './assets/background-night.png';
document.addEventListener('DOMContentLoaded', () => {
    // --- Выборка DOM элементов ---
    const nicknameInput = document.getElementById('nickname');
    const playButton = document.getElementById('play-button');
    const folderButton = document.getElementById('folder-button');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const backgroundImage = document.getElementById('background-image');
    const settingsIconImg = document.getElementById('settings-icon-img');
    const serverLogoImg = document.getElementById('server-logo-img');
    const folderIconImg = document.getElementById('folder-icon-img');
    const arrowLeftImg = document.getElementById('arrow-left-img');
    const arrowRightImg = document.getElementById('arrow-right-img');
    const launcherLogoImg = document.getElementById('launcher-logo-img');

    const titleBarIcon = document.getElementById('title-bar-icon');
    const minimizeButton = document.getElementById('minimize-button');
    const closeButton = document.getElementById('close-button');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const saveSettingsButton = document.getElementById('save-settings-button');

    const ramSlider = document.getElementById('ram-slider');
    const ramInput = document.getElementById('ram-input');
    const ramValueLabel = document.getElementById('ram-value-label');
    const windowWidthInput = document.getElementById('window-width-input');
    const windowHeightInput = document.getElementById('window-height-input');
    const fullscreenCheckbox = document.getElementById('fullscreen-checkbox');
    const autoconnectCheckbox = document.getElementById('autoconnect-checkbox');



    launcherLogoImg.src = launcherLogoSrc;
    settingsIconImg.src = settingsIconSrc;
    serverLogoImg.src = serverLogoSrc;
    folderIconImg.src = folderIconSrc;
    arrowLeftImg.src = arrowLeftSrc;
    arrowRightImg.src = arrowRightSrc;
    titleBarIcon.src = launcherLogoSrc;

    minimizeButton.addEventListener('click', () => {
        window.api.minimizeWindow();
    });
    closeButton.addEventListener('click', () => {
        window.api.closeWindow();
    });
    serverLogoImg.addEventListener('mouseenter', () => {
        backgroundImage.classList.add('zoomed');
    });
    serverLogoImg.addEventListener('mouseleave', () => {
        backgroundImage.classList.remove('zoomed');
    });
    async function loadSettings() {
        let settings = await window.api.getStoreValue('settings');
        if (!settings) {
            settings = { // Значения по умолчанию
                ram: 4,
                window: { width: 1024, height: 768 },
                fullscreen: false,
                autoConnect: true,
            };
        }

        // Применяем значения в UI
        ramSlider.value = settings.ram;
        ramInput.value = settings.ram;
        ramValueLabel.textContent = `${settings.ram} GB`;
        windowWidthInput.value = settings.window.width;
        windowHeightInput.value = settings.window.height;
        fullscreenCheckbox.checked = settings.fullscreen;
        autoconnectCheckbox.checked = settings.autoConnect;
    }
    const showModal = () => settingsModal.classList.remove('hidden');
    const hideModal = () => settingsModal.classList.add('hidden');
    // Функция для сохранения настроек
    function saveSettings() {
        const settings = {
            ram: parseInt(ramSlider.value, 10),
            window: {
                width: parseInt(windowWidthInput.value, 10),
                height: parseInt(windowHeightInput.value, 10),
            },
            fullscreen: fullscreenCheckbox.checked,
            autoConnect: autoconnectCheckbox.checked,
        };
        window.api.setStoreValue('settings', settings);
        hideModal();
    }

    settingsButton.addEventListener('click', showModal);
    closeSettingsButton.addEventListener('click', hideModal);
    saveSettingsButton.addEventListener('click', saveSettings);
    // Закрытие по клику на фон
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideModal();
    });

    // Связываем ползунок и поле ввода ОЗУ
    ramSlider.addEventListener('input', () => {
        ramInput.value = ramSlider.value;
        ramValueLabel.textContent = `${ramSlider.value} GB`;
    });
    ramInput.addEventListener('input', () => {
        ramSlider.value = ramInput.value;
        ramValueLabel.textContent = `${ramInput.value} GB`;
    });

    // --- Динамический фон ---
    function updateBackground() {
        const hour = new Date().getHours();
        // С 6 утра до 7 вечера - день
        if (hour >= 7 && hour < 21) {
            backgroundImage.classList.add('day');
            backgroundImage.classList.remove('night');
        } else {
            backgroundImage.classList.add('night');
            backgroundImage.classList.remove('day');
        }
    }
    updateBackground(); // Первый запуск
    setInterval(updateBackground, 60000); // Проверяем каждую минуту

    // --- Загрузка сохраненных настроек ---
    window.api.getStoreValue('nickname').then(value => {
        if (value) nicknameInput.value = value;
    });

    // --- Обработчики событий ---
    folderButton.addEventListener('click', () => {
        window.api.openGameFolder();
    });

    playButton.addEventListener('click', async () => {
        const nickname = nicknameInput.value;

        if (!nickname || !/^[a-zA-Z0-9_]{3,16}$/.test(nickname)) {
            statusText.textContent = 'Ошибка: Неверный никнейм (3-16 символов, только буквы, цифры и _).';
            return;
        }
        window.api.setStoreValue('nickname', nickname);

        playButton.disabled = true;
        playButton.textContent = 'ЗАПУСК...';
        statusText.textContent = 'Подготовка к запуску...';
        progressBar.style.width = '0%';
        hideModal();
        settingsButton.classList.add("disabled");
        settingsIconImg.classList.add("disabled");
        const result = await window.api.launchGame({ nickname });

        if (!result.success) {
            statusText.textContent = `Ошибка: ${result.error}`;
            playButton.disabled = false;
            playButton.textContent = 'Начать игру';
            settingsButton.classList.remove(".disabled");
            settingsIconImg.classList.remove("disabled");
        }
    });
    loadSettings();
    // --- Прослушивание событий от Main процесса ---
    window.api.on('update-status', (status) => {
        statusText.textContent = status.text;
        if (status.progress) {
            progressBar.style.width = `${status.progress}%`;
        }
        if (status.launched) {
            progressBar.style.width = '100%';
            playButton.textContent = 'ИГРА ЗАПУЩЕНА';
            playButton.disabled = true;
            settingsButton.classList.add("disabled");
            settingsIconImg.classList.add("disabled");
            setTimeout(() => window.api.minimizeWindow(), 2000);


        }
        if (status.finished || status.error) {
            playButton.disabled = false;
            settingsButton.classList.remove("disabled");
            settingsIconImg.classList.remove("disabled");
            playButton.textContent = 'Начать игру';
            progressBar.style.width = '0%';
            window.api.restoreWindow();
        }
    });
    const loadImage = (imgElement) => {
        return new Promise((resolve, reject) => {
            // Если src уже присвоен и картинка закэширована, она может быть уже загружена
            if (imgElement.complete) {
                return resolve();
            }
            imgElement.onload = () => resolve();
            imgElement.onerror = (err) => reject(err);
        });
    };

    // 2. Собираем все асинхронные задачи в один массив промисов
    const initializationPromises = [
        loadSettings(), // Ваша асинхронная функция загрузки настроек
        loadImage(launcherLogoImg),
        loadImage(settingsIconImg),
        loadImage(serverLogoImg),
        loadImage(folderIconImg),
        loadImage(arrowLeftImg),
        loadImage(arrowRightImg),
    ];

    // 3. Ждем, пока ВСЕ задачи завершатся
    Promise.all(initializationPromises)
        .then(() => {
            // Когда все картинки и настройки загружены...
            console.log('Renderer is fully ready. Notifying main process.');
            // ...отправляем сигнал в main.js!
            setTimeout(() => window.api.notifyMainWhenReady(), 2000);

        })
        .catch(error => {
            console.error('Failed to initialize renderer:', error);
            // Даже если есть ошибка, лучше показать окно, чем оставить вечную загрузку
            window.api.notifyMainWhenReady();
        });
});