module.exports = {
  entry: './lib/index.js',
  output: {
    path: './build',
    filename: 'blotter.js'
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
