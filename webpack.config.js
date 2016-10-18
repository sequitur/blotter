var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    blotter: './lib/blotter.js',
    index: './lib/index.js'
  },
  output: {
    path: './build',
    filename: '[name].js',
    publicPath: '/'
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
  ],
  plugins: [
    new HtmlWebpackPlugin({
      template: 'template/index.ejs',
      inject: false
    })
  ]
};
