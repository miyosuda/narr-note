const path = require('path');

module.exports = {
  entry: './src/index.js',

  output: {
    path: `${__dirname}/dist`,
    filename: 'main.js',
  },

  // ローダーの設定
  module: {
    rules: [
      {
        // 処理対象ファイル
        test: /\.js$/,

        // 処理対象から外すファイル
        exclude: /node_modules/,
        use: [
          {
            // 利用するローダー
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env', {
                    modules: false
                  }
                ]
              ]
            }
          }
        ]
      }
    ]
  },

  devServer: {
    contentBase: './dist'
  }
};
