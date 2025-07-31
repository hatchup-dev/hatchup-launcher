// webpack.renderer.config.js

// Определяем правила для загрузчиков
const rules = [
  // Правило для CSS. style-loader и css-loader уже должны быть
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
  // --- ДОБАВИТЬ ЭТО ПРАВИЛО ДЛЯ ИЗОБРАЖЕНИЙ ---
  // Оно научит Webpack обрабатывать картинки и шрифты
  {
    test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    type: 'asset/resource',
  },
];

// Экспортируем конфигурацию
module.exports = {
  module: {
    rules: rules,
  },
  plugins: [
      // Мы УДАЛИЛИ отсюда CopyWebpackPlugin
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};