/*
  "Adapter" for a bundled version of Blotter.
*/

if (!console.warn) console.warn = console.log;

console.warn('Attaching Blotter bindings to globals.');
const blotter = require('./engine.js');
window.blotterStart = blotter.start;
window.story = blotter.story;
