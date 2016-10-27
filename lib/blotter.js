/*
  "Adapter" for a bundled version of Blotter.
*/

if (!console.warn) console.warn = console.log;

const engine = require('./engine.js');

const storySource = document.querySelector('script[id="storyscript"][type="application/json"]');

if (!storySource) {
  throw new Error('Inline story data missing from page.');
}

let storyData = storySource.innerHTML;

/* We want to use console.warn for warnings but some exotic browsers might not
  have it, so here's a bad polyfill. */

if (!console.warn) console.warn = console.log;

/* Inklecate generates a BOM (byte-order-mark) at the head of utf-8 JSON files.
   Gall is suppose to strip those out, but just in case they do end up in the
   inlined script tag, we strip our JSON of everything before the opening '{'
   character. */

if (storyData.indexOf('\uFEFF') !== -1) {
  console.warn('Inlined JSON contains a stray byte-order mark, stripping...');
  storyData = storyData.slice(storyData.indexOf('\uFEFF') + 1);
}

console.warn('Attaching Blotter bindings to globals.');

const blotter = engine(storyData);

window.blotterStart = blotter.start;
window.story = blotter.story;
