var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    index: './lib/index.js'
  },
  output: {
    path: './build',
    filename: '[name].js',
    publicPath: '/',
    library: 'ink-blotter',
    libraryTarget: 'commonjs2'
  },
  loaders: [
    {
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel', // 'babel-loader' is also a valid name to reference
      query: {
        presets: ['es2015']
      }
    }
  ]
};
