const inkjs = require('inkjs');

const storySource = document.querySelector('script[id="storyscript"][type="application/json"]');

if (!storySource) {
  throw new Error('Inline story data missing from page.');
}

/* Find the elements where we'll be putting content */

const stageDiv = document.querySelector('#story-stage');
const choiceDiv = document.querySelector('#choices');

if (!stageDiv || !choiceDiv) {
  throw new Error('Unable to select content and choice container elements.');
}

/* At least on Windows, inklecate seems to put some whitespace character at the
   head of generated json files that causes JSON.parse to choke, at least on
   webkit. This is fixed by using trim() on the string first. */
const storyData = JSON.parse(storySource.innerText.trim());
console.log('Story data parsed...');
const story = new inkjs.Story(storyData);
window.story = story;

/* Page scrolling code */
const scroll = {
  scrolling: false,

  continue () {
    if ((stageDiv.scrollTop + stageDiv.clientHeight) >= stageDiv.scrollHeight) return scroll.end();
    stageDiv.scrollTop += 5;
  },

  start () {
    if (this.scrolling) return;
    this.scrolling = true;
    this.intervalID = setInterval(this.continue, 1000/60);
  },

  end () {
    if (!this.intervalID) return;
    if (!this.scrolling) return;
    this.scrolling = false;
    clearInterval(this.intervalID);
  }
};

function emphasis (line) {
  const grodyRegex = /(\s|^)(_{1,2})(\w[^_]*\S)(\2)(\W)/;
  if (!line.match(grodyRegex)) return line; // No italics here
  const alteredLine = line.replace(grodyRegex, (match, p1, p2, p3, p4, p5) => {
    if (p2 === '_') return `${p1}<em>${p3}</em>${p5}`;
    return `${p1}<strong>${p3}</strong>${p5}`
  });
  return emphasis(alteredLine);
}

function quoter (line) {
  const grodyRegex = /(^|\s)(['"])(.+?)(\2)(\W|$)/;
  if (!line.match(grodyRegex)) return line;
  const alteredLine = line.replace(grodyRegex, (match, p1, p2, p3, p4, p5) => {
    if (p2 === '"') return `${p1}&ldquo;${p3}&rdquo;${p5}`;
    return `${p1}&lsquo;${p3}&rsquo;${p5}`
  });
  return quoter(alteredLine);
}

function dasher (line) {
  return line
    .replace(/ - /g, ' &ndash; ')
    .replace(/ -- /g, '&mdash;');
}

function format (line) {
  return emphasis(quoter(dasher(line)));
}

/* Create an element (usually p, but also h1-h6) and format it. */
function createLineElement (line) {
  let elemType = 'p', content = line;
  const matches = line.match(/^(h\d) (.+)/);
  if (matches) {
    // Line starts with the name of a title element so let's use that
    elemType = matches[1];
    content = matches[2];
  }
  const elem = document.createElement(elemType);
  elem.innerHTML = format(content);
  return elem;
}

/* Insert a line of content into the output */
/* Returns a Promise that resolves when the animation on the inserted element
   ends. */
function insertLine () {
  const line = story.Continue();
  const elem = createLineElement(line);
  return new Promise(resolve => {
    elem.addEventListener('animationend', resolve);
    stageDiv.appendChild(elem);
  });
}

/* The main game loop; progress the story by an additional step. */
function progressGame () {
  scroll.start();
  insertLine().then(() => {
    if (!story.canContinue) {
      scroll.end();
      placeChoices();
    } else {
      progressGame();
    }
  })
}

// This flag is adhockery to prevent a race condition where the player can
// click on a choice before they have fully animated in.
let choicesAnimating = false;

// Create a listener function to attach to one of the li elements that
// represents a player choice.
function choiceListener(index) {
  return function (event) {
    event.preventDefault();
    if (choicesAnimating) return;
    clearChoiceListeners();
    story.ChooseChoiceIndex(index);
    clearOldChoices().then(() => progressGame());
  }
}

// Attach that listener to the element.
function createChoiceListener(li, index) {
  li.clickListener = choiceListener(index);
  li.addEventListener('click', li.clickListener);
  li.clearListener = (function () {
    this.removeEventListener('click', this.clickListener);
  }).bind(li);
}

// Clean up event listeners from choices once one of them was selected.
function clearChoiceListeners() {
  const lis = document.querySelectorAll('li');
  Array.from(lis).forEach(li => {
    if (li.clearListener) li.clearListener();
  })
}

// Create the ul element that contains a batch of choices.
function createChoiceUl () {
  const lis = story.currentChoices
    .map(choice => {
      const li = document.createElement('li');
      li.innerText = choice.text;
      createChoiceListener(li, choice.index);
      return li;
    });
  const ul = document.createElement('ul');
  Array.from(lis).forEach(li => ul.appendChild(li));
  ul.className = "choices current";
  return ul;
}

// Insert a choice list into the container div.
function placeChoices () {
  const ul = createChoiceUl();
  ul.addEventListener('animationend', () => choicesAnimating = false);
  choicesAnimating = true;
  choiceDiv.appendChild(ul);
}

// Mark used choice lists as old and remove them from the view.
function clearOldChoices () {
  const oldChoices = choiceDiv.querySelector('.choices.current');
  return new Promise(resolve => {
    oldChoices.addEventListener('transitionend', () => {
      oldChoices.remove();
      resolve();
    });
    oldChoices.className = "choices old";
  })
}

window.blotterStart = function () {
  // For simplicity's sake, we want Blotter to be essentially a black box that
  // talks to separate scripts on the same page through some well-defined APIs
  // rather than a module which would be webpacked along with user-provided
  // scripts. This prevents Gall from having to use npm or webpack or browserify
  // itself.
  progressGame();
}
