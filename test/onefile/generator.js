var fs = require('fs-jetpack');
var pug = require('pug');

var template = fs.read('template.pug');
var data = {
  css: fs.read('../style/style.css'),
  engine: fs.read('../build/blotter.js'),
  json: fs.read('../example.ink.json'),
}

fs.write('game.html', pug.render(template, data));
