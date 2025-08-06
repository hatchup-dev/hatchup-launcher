import './styles.css';
import launcherLogoSrc from './assets/launcher-logo.png';
import settingsIconSrc from './assets/settings-icon.svg';
import serverLogoSrc from './assets/logo.png';
import folderIconSrc from './assets/folder-icon.svg';
import logoutIconSrc from './assets/logout-icon.svg';
import closeIconSrc from './assets/close-icon.svg';
import refreshIconSrc from './assets/refresh-icon.svg';
import healthbarSrc from './assets/healthbar.png';
import hungerbarSrc from './assets/hungerbar.png';
import profileIconSrc from './assets/profile-icon.svg';
import arrowLeftSrc from './assets/arrow-left.svg';
import arrowRightSrc from './assets/arrow-right.svg';
import discordLogoSrc from './assets/discord-logo.svg';
import { SkinViewer, WalkingAnimation } from 'skinview3d';
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
    const healthBarImg = document.getElementById('health-bar-img');
    const hungerBarImg = document.getElementById('food-bar-img');

    const profileButton = document.getElementById('profile-button');
    const profileModal = document.getElementById('profile-modal');
    const profileCloseButton = document.getElementById('profile-close-button');
    const profileLogoutButton = document.getElementById('profile-logout-button');
    const refreshDataButton = document.getElementById('refresh-data-button');
    const infoCoords = document.getElementById('info-coords');
    const infoStatsShort = document.getElementById('info-stats-short');
    const changeSkinButton = document.getElementById('change-skin-button');
    const tabButtonInventory = document.getElementById('tab-button-inventory');
    const tabButtonStats = document.getElementById('tab-button-stats');
    const tabContentInventory = document.getElementById('tab-content-inventory');
    const tabContentStats = document.getElementById('tab-content-stats');
    const statsGeneralList = document.getElementById('stats-general-list');
    const lastUpdateStats = document.getElementById('last-update');

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
    healthBarImg.src = healthbarSrc;
    hungerBarImg.src = hungerbarSrc;


    document.getElementById('profile-icon-img').src = profileIconSrc;
    document.getElementById('profile-logout-icon').src = logoutIconSrc;
    document.getElementById('profile-close-icon').src = closeIconSrc;
    document.getElementById('refresh-icon').src = refreshIconSrc;
    const itemTooltip = document.createElement('div');
    itemTooltip.className = 'item-tooltip';
    document.body.appendChild(itemTooltip);

    const nicknameText = document.getElementById('info-nickname');
    const armorSlotsContainer = document.getElementById('armor-slots');
    const inventoryMainContainer = document.getElementById('inventory-main');
    const inventoryHotbarContainer = document.getElementById('inventory-hotbar');

    let skinViewer;
    function switchTab(tabName) {
        // Скрываем все содержимое
        tabContentInventory.classList.remove('active');
        tabContentStats.classList.remove('active');
        // Убираем класс active со всех кнопок
        tabButtonInventory.classList.remove('active');
        tabButtonStats.classList.remove('active');

        // Показываем нужное
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        document.getElementById(`tab-button-${tabName}`).classList.add('active');
    }
    tabButtonInventory.addEventListener('click', () => switchTab('inventory'));
    tabButtonStats.addEventListener('click', () => switchTab('stats'));
    async function renderSlots(container, items, count) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const item = items[i];
            const slot = document.createElement('div');
            slot.className = 'item-slot';

            if (item) {
                const base64Icon = await window.api.getItemIcon(item.id);
                if (base64Icon) {
                    const iconEl = document.createElement('img');
                    iconEl.className = 'item-icon';
                    iconEl.src = base64Icon;
                    slot.appendChild(iconEl);
                }
                if (item.count > 1) {
                    const countEl = document.createElement('span');
                    countEl.className = 'item-count';
                    countEl.textContent = item.count;
                    slot.appendChild(countEl);
                }

                // --- ЛОГИКА TOOLTIP ---
                const updateTooltipPosition = (event) => {
                    const tooltipWidth = itemTooltip.offsetWidth;
                    const tooltipHeight = itemTooltip.offsetHeight;
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const offsetX = 15; // Отступ от курсора по X
                    const offsetY = 15; // Отступ от курсора по Y

                    let newX, newY;

                    // --- Логика для горизонтальной позиции (X) ---
                    // Если подсказка не помещается справа от курсора...
                    if (event.clientX + offsetX + tooltipWidth > windowWidth) {
                        // ...ставим ее слева.
                        newX = event.clientX - tooltipWidth - offsetX;
                    } else {
                        // ...иначе, ставим ее справа (по умолчанию).
                        newX = event.clientX + offsetX;
                    }

                    // --- Логика для вертикальной позиции (Y) ---
                    // Если подсказка не помещается снизу от курсора...
                    if (event.clientY + offsetY + tooltipHeight > windowHeight) {
                        // ...ставим ее сверху.
                        newY = event.clientY - tooltipHeight - offsetY;
                    } else {
                        // ...иначе, ставим ее снизу (по умолчанию).
                        newY = event.clientY + offsetY;
                    }

                    itemTooltip.style.left = `${newX}px`;
                    itemTooltip.style.top = `${newY}px`;
                };

                // Обработчик появления мыши
                slot.addEventListener('mouseenter', (event) => {
                    // 1. Заполняем контент
                    let tooltipText = `<span style="color: #55FFFF;">${item.id.replace('minecraft:', '')}</span>`;
                    if (item.nbt) {
                        const MAX_NBT_LENGTH = 150; // Максимальная длина NBT в символах. Можете подобрать под себя.
                        let nbtString = item.nbt;

                        // Если строка длиннее максимума, обрезаем ее
                        if (nbtString.length > MAX_NBT_LENGTH) {
                            nbtString = nbtString.substring(0, MAX_NBT_LENGTH) + '...';
                        }

                        // Форматируем коды цвета, как и раньше
                        let formattedNbt = nbtString.replace(/§[0-9a-f]/g, (match) => {
                            return `</span><span style="color: #AAAAAA;">`;
                        });
                        tooltipText += `<br><span style="color: #AAAAAA;">${formattedNbt}</span>`;
                    }
                    itemTooltip.innerHTML = tooltipText;

                    // 2. Обновляем позицию
                    updateTooltipPosition(event);

                    // 3. Показываем
                    itemTooltip.classList.add('visible');
                });

                // Обработчик движения мыши (только обновляет позицию)
                slot.addEventListener('mousemove', (event) => {
                    updateTooltipPosition(event);
                });

                // Обработчик ухода мыши
                slot.addEventListener('mouseleave', () => {
                    itemTooltip.classList.remove('visible');
                });
            }
            container.appendChild(slot);
        }
    }
    function formatMapUrl(location) {
        const baseUrl = 'https://map.hatchup.ru/';
        let worldId = '';

        // Преобразуем ID мира в формат карты
        switch (location.world) {
            case 'minecraft:overworld':
                worldId = '#world';
                break;
            case 'minecraft:the_nether':
                worldId = '#world_the_nether';
                break;
            case 'minecraft:the_end':
                worldId = '#world_the_end';
                break;
            default:
                // Для модовых миров, например, "deeperdarker:otherside" -> "#world_deeperdarker_otherside"
                worldId = '#world_' + location.world.replace(':', '_');
                break;
        }

        // Собираем полный URL
        return `${baseUrl}${worldId}:${location.x}:${location.y}:${location.z}:50:0:0:0:0:perspective`;
    }
    async function loadProfileData() {
        const uuid = sessionStorage.getItem('minecraftUuid');
        const token = await window.api.getStoreValue('sessionToken');
        if (!uuid || !token) return;

        statusText.textContent = 'Загрузка данных игрока...';
        const response = await window.api.getPlayerData(uuid, token);

        if (response.status === 'ok') {
            const data = response.data;
            statsGeneralList.innerHTML = '';
            const mainStats = document.createElement('li');
            mainStats.innerHTML = `Игровое время: ${data.play_time || 'N/A'} ч. / Достижений: ${data.advancements || 'N/A'}`
            statsGeneralList.appendChild(mainStats);

            if (data.stats) {
                // Создаем красивые названия для наших ключей
                const statNames = {
                    mobs_killed: "Убито мобов",
                    players_killed: "Убито игроков",
                    player_deaths: "Смертей",
                    items_dropped: "Предметов выброшено",
                    damage_dealt: "Урона нанесено",
                    damage_taken: "Урона получено",
                    jump_count: "Прыжков",
                    walk_one_cm: "Пройдено пешком",
                    sprint_one_cm: "Пройдено бегом"
                };

                // Проходим по всем ключам, которые мы хотим отобразить
                for (const [key, name] of Object.entries(statNames)) {
                    const value = data.stats[key];
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="stat-name">${name}</span><span class="stat-value">${value || 0}${key === 'play_time_hours' ? ' ч.' : ''}</span>`;
                    statsGeneralList.appendChild(li);
                }
            }
            
            nicknameText.textContent = data.name;
            const loc = data.location;
            const mapUrl = formatMapUrl(loc);
            const worldName = loc.world.replace('minecraft:', '').replace('deeperdarker:', '');
            infoCoords.innerHTML = ''; 
            const link = document.createElement('a');
            link.href = '#'; // Используем #, чтобы страница не перезагружалась
            link.id = 'coords-link';
            link.title = 'Открыть на веб-карте';
            link.textContent = `X: ${loc.x} Y: ${loc.y} Z: ${loc.z} (${worldName})`;
            
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Предотвращаем переход по ссылке
                window.api.openMapWindow(mapUrl);
            });

            infoCoords.appendChild(link);
            infoStatsShort.innerHTML = `Здоровье: <span style="font-size: 14px;color: rgb(253,19,20);">${data.health || 'N/A'}</span> / Еда: <span style="font-size: 14px;color: rgb(164,113,58);">${data.food || 'N/A'}</span> / Уровень: <span style="font-size: 14px;color: rgb(130,184,90);">${data.xp_level || 'N/A'}</span>`;
            healthBarImg.style.width = data.health*5+"%";
            hungerBarImg.style.width = data.food*5+"%";
            if (data.last_updated){
                const date = new Date(data.last_updated);  
                const localTimeString = date.toLocaleString();
                lastUpdateStats.innerHTML = `<span style="font-size: 12px;color: #8B8B8B;">Последнее обновление:</span> ${localTimeString}`;
            } else {
                lastUpdateStats.innerHTML = '';
            }
            
            // Отрисовываем инвентарь
            renderSlots(armorSlotsContainer, data.armor.reverse(), 4); // reverse(), т.к. броня хранится от ног к голове
            renderSlots(inventoryMainContainer, data.inventory.slice(9, 36), 27); // Основные 27 слотов
            renderSlots(inventoryHotbarContainer, data.inventory.slice(0, 9), 9); // Первые 9 слотов - хотбар

            // Инициализация 3D-скина
            if (!skinViewer) {
                skinViewer = new SkinViewer({
                    canvas: document.getElementById('skin-viewer'),
                    width: 180,
                    height: 250,
                });
            }
            skinViewer.animation = new WalkingAnimation();

            if (response.decodedTextures) {
                // Если свойство есть, декодируем его и берем URL
                try {
                    const skinUrl = response.decodedTextures.textures?.SKIN?.url;

                    if (skinUrl) {
                        console.log('Loading skin from URL:', skinUrl);
                        // Мы больше не используем прокси, т.к. бэкенд теперь отдает правильный URL
                        skinViewer.loadSkin(skinUrl);
                    } else {
                        // У пользователя есть `properties`, но нет скина. Показываем Стива.
                        console.log('User has texture property but no skin URL. Loading default.');
                        skinViewer.loadSkin("https://auth.hatchup.ru/storage/skins/default.png");
                    }
                } catch (e) {
                    console.error('Failed to parse texture data:', e);
                    skinViewer.loadSkin("https://auth.hatchup.ru/storage/skins/default.png");
                }
            } else {
                // Если свойства "textures" нет вообще, показываем Стива
                console.log('User has no texture property. Loading default.');
                skinViewer.loadSkin("https://auth.hatchup.ru/storage/skins/default.png");
            }

            statusText.textContent = 'Данные обновлены.';
        } else {
            statusText.textContent = 'Не удалось загрузить данные игрока.';
            lastUpdateStats.innerHTML = 'Не удалось загрузить данные игрока.';
            nicknameText.textContent = 'Не удалось загрузить данные игрока.';
            infoCoords.textContent = ``;
            infoStatsShort.textContent = ``;
        }
    }
    changeSkinButton.addEventListener('click', async () => {
        // 1. Открываем диалог выбора файла
        const filePath = await window.api.openSkinDialog();
        if (!filePath) {
            console.log('Skin selection was cancelled.');
            return; // Пользователь ничего не выбрал
        }

        // 2. Получаем необходимые данные для запроса
        const uuid = sessionStorage.getItem('minecraftUuid');
        const sessionToken = await window.api.getStoreValue('sessionToken');

        if (!uuid || !sessionToken) {
            statusText.textContent = 'Ошибка: сессия не найдена. Перезайдите.';
            return;
        }

        // 3. Показываем статус и отправляем файл на бэкенд
        statusText.textContent = 'Загрузка скина...';
        changeSkinButton.disabled = true;

        const response = await window.api.uploadSkin({ filePath, uuid, sessionToken });

        if (response.status === 'ok') {
            statusText.textContent = 'Скин успешно обновлен!';

            // 4. Обновляем 3D-превью скина
            // Мы добавляем к URL случайный параметр, чтобы обойти кэш браузера
            const skinUrl = `https://auth.hatchup.ru/storage/skins/${uuid}.png?t=${Date.now()}`;
            skinViewer.loadSkin(skinUrl);
        } else {
            statusText.textContent = `Ошибка загрузки: ${response.error || 'Неизвестная ошибка'}`;
        }

        changeSkinButton.disabled = false;
    });
    profileButton.addEventListener('click', () => {
        profileModal.classList.remove('hidden');
        loadProfileData(); // Загружаем данные при открытии
    });

    profileCloseButton.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });

    refreshDataButton.addEventListener('click', loadProfileData);

    // Кнопка выхода из аккаунта внутри модалки
    profileLogoutButton.addEventListener('click', () => {
        profileModal.classList.add('hidden');
        logout(); // Используем вашу существующую функцию logout
    });

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