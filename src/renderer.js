import './styles.css';
import launcherLogoSrc from './assets/launcher-logo.png';
import settingsIconSrc from './assets/settings-icon.svg';
import serverLogoSrc from './assets/logo.png';
import folderIconSrc from './assets/folder-icon.svg';
import logoutIconSrc from './assets/logout-icon.svg';
import arrowLeftSrc from './assets/arrow-left.svg';
import arrowRightSrc from './assets/arrow-right.svg';
import discordLogoSrc from './assets/discord-logo.svg';
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
    const logoutIconImg = document.getElementById('logout-icon-img');
    const arrowLeftImg = document.getElementById('arrow-left-img');
    const arrowRightImg = document.getElementById('arrow-right-img');
    const launcherLogoImg = document.getElementById('launcher-logo-img');
    const logoutButton = document.getElementById('logout-button');

    const loginView = document.getElementById('login-view');
    const gameView = document.getElementById('game-view');
    const registerView = document.getElementById('register-view');
    const loginStatusText = document.getElementById('login-status-text');

    const discordLoginButton = document.getElementById('discord-login-button');
    const discordLogoImg = document.getElementById('discord-logo-img');
    discordLogoImg.src = discordLogoSrc;


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

    const statusIndicator = document.getElementById('status-indicator');
    const statusTextShort = document.getElementById('status-text-short');
    const tooltipMotd = document.getElementById('tooltip-motd');
    const tooltipDescription = document.getElementById('tooltip-description');
    const tooltipPlayers = document.getElementById('tooltip-players');
    const tooltipPlayerList = document.getElementById('tooltip-player-list');
    const serverLogoContainer = document.getElementById('server-logo-container');

    const registerNicknameInput = document.getElementById('register-nickname-input');
    const registerButton = document.getElementById('register-button');
    const registerErrorText = document.getElementById('register-error-text');
    let registrationData = {};

    launcherLogoImg.src = launcherLogoSrc;
    settingsIconImg.src = settingsIconSrc;
    serverLogoImg.src = serverLogoSrc;
    folderIconImg.src = folderIconSrc;
    logoutIconImg.src = logoutIconSrc;
    arrowLeftImg.src = arrowLeftSrc;
    arrowRightImg.src = arrowRightSrc;
    titleBarIcon.src = launcherLogoSrc;

    const ramConfig = window.api.getRamConfiguration();
    ramSlider.min = ramConfig.min;
    ramSlider.max = ramConfig.max;
    ramInput.min = ramConfig.min;
    ramInput.max = ramConfig.max;

    minimizeButton.addEventListener('click', () => {
        window.api.minimizeWindow();
    });
    closeButton.addEventListener('click', () => {
        window.api.closeWindow();
    });
    serverLogoContainer.addEventListener('mouseenter', () => {
        backgroundImage.classList.add('zoomed');
    });
    serverLogoContainer.addEventListener('mouseleave', () => {
        backgroundImage.classList.remove('zoomed');
    });
    function showView(viewName) {
        loginView.classList.add('hidden');
        gameView.classList.add('hidden');
        registerView.classList.add('hidden');
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
    }
    async function logout() {
        // 1. Получаем текущий токен сессии
        const token = await window.api.getStoreValue('sessionToken');

        // 2. Если токен есть, отправляем запрос на сервер для его аннулирования
        if (token) {
            await window.api.logout(token);
        }

        // 3. Очищаем локальные данные (этот код остается без изменений)
        window.api.setStoreValue('sessionToken', null);
        sessionStorage.removeItem('minecraftUuid');
        sessionStorage.removeItem('discordId');
        nicknameInput.value = '';
        registerNicknameInput.value = '';
        registerErrorText.textContent = '';
        loginStatusText.textContent = '';
        statusText.textContent = 'Готов к запуску';
        showView('login');
    }

    // --- ИЗМЕНЕНИЕ: Обновляем обработчик кнопки ---
    logoutButton.addEventListener('click', () => {
        logout();
    });
    // --- Обработчики событий ---
    discordLoginButton.addEventListener('click', () => {
        window.api.startDiscordAuth();
    });

    // Слушаем событие с кодом от main.js
    window.api.on('discord-auth-code', async (code) => {
        loginStatusText.textContent = 'Проверка авторизации...';
        const result = await window.api.processDiscordAuth(code);

        if (result.status === 'ok') {
            window.api.setStoreValue('sessionToken', result.sessionToken);
            nicknameInput.value = result.minecraftNickname;
            sessionStorage.setItem('minecraftUuid', result.minecraftUuid);
            showView('game');
        } else if (result.status === 'register_needed') {
            registrationData = {
                discordId: result.discordId,
                discordUsername: result.discordUsername
            };
            // Предзаполняем поле ником из Discord для удобства
            registerNicknameInput.value = result.discordUsername;
            registerErrorText.textContent = ''; // Очищаем ошибки
            showView('register');
        } else {
            // ЛЮБАЯ ДРУГАЯ ОШИБКА (нет на сервере, ошибка бэкенда)
            // Main уже показал страницу ошибки в браузере.
            // Мы просто возвращаем лаунчер в исходное состояние.
            loginStatusText.textContent = 'Ошибка авторизации. Пожалуйста, попробуйте снова.';
            showView('login');
        }
    });

    registerButton.addEventListener('click', async () => {
        const nickname = registerNicknameInput.value;

        // Клиентская валидация
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(nickname)) {
            registerErrorText.textContent = 'Неверный формат ника (3-16 символов, a-z, A-Z, 0-9, _).';
            return;
        }

        registerButton.disabled = true;
        registerErrorText.textContent = 'Регистрация...';

        const response = await window.api.registerNickname({
            discordId: registrationData.discordId,
            minecraftNickname: nickname
        });

        if (response.httpStatus === 201) { // 201 Created - успех
            // Успешная регистрация!
            window.api.setStoreValue('sessionToken', response.sessionToken);
            nicknameInput.value = response.minecraftNickname;
            sessionStorage.setItem('minecraftUuid', response.minecraftUuid);
            showView('game');
        } else {
            // Показываем ошибку от бэкенда
            registerErrorText.textContent = response.error || 'Произошла неизвестная ошибка.';
        }

        registerButton.disabled = false;
    });

    // --- Инициализация ---
    // Проверяем, есть ли у нас уже токен сессии
    window.api.getStoreValue('sessionToken').then(token => {
        if (token) {
            // TODO: Проверить валидность токена на бэкенде
            // Пока просто показываем игровой экран
            // nicknameInput.value = ... (нужно получить ник)
            // showView('game');
        } else {
            showView('login');
        }
    });

    window.api.on('update-server-status', (status) => {
        if (status && status.online) {
            // --- СЕРВЕР ОНЛАЙН ---
            statusIndicator.className = 'status-indicator online';
            statusTextShort.textContent = `${status.players.online} / ${status.players.max}`;

            // Обновляем Tooltip
            const motdContent = status.motd.clean.split(/\r?\n/);
            tooltipMotd.textContent = motdContent[0];
            tooltipDescription.textContent = motdContent[1];
            tooltipPlayers.textContent = `${status.players.online} / ${status.players.max}`;

            // Очищаем и заполняем список игроков
            tooltipPlayerList.innerHTML = '';
            if (status.players.list && status.players.list.length > 0) {
                // Показываем не более 10 игроков
                status.players.list.slice(0, 10).forEach(player => {
                    const li = document.createElement('li');
                    li.textContent = player.name_clean;
                    tooltipPlayerList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'На сервере сейчас никого нет';
                tooltipPlayerList.appendChild(li);
            }
        } else {
            // --- СЕРВЕР ОФФЛАЙН ---
            statusIndicator.className = 'status-indicator offline';
            statusTextShort.textContent = 'Оффлайн';

            // Обновляем Tooltip
            tooltipMotd.textContent = 'Сервер недоступен';
            tooltipPlayers.textContent = 'N/A';
            tooltipPlayerList.innerHTML = '<li>Не удалось получить список игроков.</li>';
        }
    });

    async function loadSettings() {
        let settings = await window.api.getStoreValue('settings');
        if (!settings) {
            settings = { // Значения по умолчанию
                ram: ramConfig.default,
                window: { width: 1024, height: 768 },
                fullscreen: false,
                autoConnect: true,
            };
        }

        // Применяем значения в UI
        ramSlider.value = settings.ram;
        ramInput.value = settings.ram;
        ramValueLabel.textContent = `${settings.ram} GB`;
        windowWidthInput.value = settings.window.width || '';
        windowHeightInput.value = settings.window.height || '';
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

        statusText.textContent = 'Авторизация игровой сессии...';
        const sessionToken = await window.api.getStoreValue('sessionToken');
        if (!sessionToken) {
            statusText.textContent = 'Ошибка: данные сессии не найдены.';
            logout();
            return;
        }



        statusText.textContent = 'Подготовка к запуску...';
        progressBar.style.width = '0%';
        hideModal();
        settingsButton.classList.add("disabled");
        settingsIconImg.classList.add("disabled");

        const minecraftUuid = sessionStorage.getItem('minecraftUuid');
        if (!minecraftUuid) {
            statusText.textContent = 'Ошибка: UUID не найден. Пожалуйста, перезапустите лаунчер.';
            return;
        }


        const result = await window.api.launchGame({
            nickname, sessionToken: sessionToken,
        });

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


    async function initialize() {
        // Проверяем, есть ли у нас сохраненный токен
        const token = await window.api.getStoreValue('sessionToken');

        if (token) {
            // Если токен есть, проверяем его на бэкенде
            const response = await window.api.verifySession(token);

            if (response.status === 'ok') {
                nicknameInput.value = response.minecraftNickname;
                sessionStorage.setItem('minecraftUuid', response.minecraftUuid);
                showView('game');
            } else {
                logout();
            }
        } else {
            // Токена нет, показываем экран входа
            showView('login');
        }

        // После проверки авторизации запускаем загрузку остального
        const initializationPromises = [
            loadSettings(),
            loadImage(launcherLogoImg),
            loadImage(settingsIconImg),
            loadImage(serverLogoImg),
            loadImage(folderIconImg),
            loadImage(arrowLeftImg),
            loadImage(arrowRightImg),
        ];

        Promise.all(initializationPromises)
            .then(() => {
                setTimeout(() => window.api.notifyMainWhenReady(), 2000);
            })
            .catch(error => {
                console.error('Failed to initialize renderer:', error);
                setTimeout(() => window.api.notifyMainWhenReady(), 2000);
            });
    }

    initialize();
});