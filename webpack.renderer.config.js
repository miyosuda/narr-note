const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});


rules.push({
  test: /\.(ico|png|jpe?g|svg|eot|woff?2?)$/,
  type: 'asset/inline',
});


module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
};
