const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
   plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/static', // Какую папку копировать
          to: 'static'      // Куда копировать (относительно папки сборки)
        }
      ]
    })
  ],
};
