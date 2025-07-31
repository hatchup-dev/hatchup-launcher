// src/config.js
const HATCHUP_CREATE_PROFILE = {
    name: "HATCHUP CREATE",
    minecraftVersion: "1.20.1",
    serverIp: "server.hatchup.ru", // Замените на ваш IP
    serverPort: 25565,
    loader: {
        type: "forge",
        version: "47.4.4" // Укажите точную версию Forge для MC 1.20.1, которую вы используете
    },
    modsUrl: "http://yourfiles.com/hatchup/mods_manifest.json" // URL к вашему манифесту модов
};