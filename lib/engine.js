const inkjs = require('inkjs');
const md5 = require('md5');

let story;
let storyid;
let progress;

/* Find the elements where we'll be putting content */

const stageDiv = document.querySelector('#story-stage');
const choiceDiv = document.querySelector('#choices');

if (!stageDiv || !choiceDiv) {
  throw new Error('Unable to select content and choice container elements.');
}

/*
  The scrolling rate is the *average* rate of scrolling, in pixels by
  millisecond. Since we're using an easing function to animate the scroll,
  the actual change from one frame to the next will vary, and also depend
  on the real framerate of the device as given to the requestAnimationFrame
  callback.
*/
const DEFAULT_SCROLLING_RATE = 0.25;

const scroll = {
  isScrolling: false,

  start () {
    if (this.isScrolling) return new Promise(resolve => resolve()); // shouldn't happen
    this.isScrolling = true;
    const scrollRate = DEFAULT_SCROLLING_RATE;

    return new Promise(resolve => {
      /* First of all, if there's no scrolling to be done, just resolve immediately. */
      if (stageDiv.scrollHeight === stageDiv.clientHeight) {
        return resolve();
      }
      const scrollStart = performance.now();
      const initialPos = stageDiv.scrollTop;
      const distanceToScroll = stageDiv.scrollHeight - (initialPos + stageDiv.clientHeight);
      const duration = distanceToScroll / scrollRate;
      let rate = 0;

      function easeIn (position) {
        return Math.pow(position, 5);
      }

      function easeOut (position) {
        return 1 - Math.pow(1 - position, 2);
      }

      function easing (timeDelta) {
        // Cubic ease-in-out adapted from Robert Penner
        const position = (timeDelta / duration);
        if (position >= 1) {
          // We should be done already; this is usually caused by switching out
          // of the page, causing the browser to not render a new animation
          // frame for several seconds.
          return distanceToScroll;
        }
        const half = distanceToScroll / 2;
        return position < 0.5 ?
          half * easeIn(position * 2)
        : half + half * easeOut((position - 0.5) * 2);
        // return distanceToScroll * (1 - Math.pow(1 - (timeDelta / duration), 3));
      }

      function step (timestamp) {
        // Displacement equals vo * delta t + 0.5 * accel * t^2
        const timeDelta = timestamp - scrollStart;
        const displacement = easing(timeDelta);
        // Obviously we can't scroll half a pixel, so we round to the nearest integer
        stageDiv.scrollTop = Math.round(initialPos + displacement);
        if (displacement >= distanceToScroll) {
          // We're done scrolling
          return resolve();
        }
        return window.requestAnimationFrame(step);
      }
      return window.requestAnimationFrame(step);
    })
      .then(() => { this.isScrolling = false; });
  }
}

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
function createLineElement (line, elemType, classes) {
  let content = line;
  /* --- DEPRECATED FEATURE --- */
  const matches = line.match(/^(h\d) (.+)/);
  if (matches) {
    // Line starts with the name of a title element so let's use that
    elemType = matches[1];
    content = matches[2];
  }
  /* --- DEPRECATED FEATURE --- */
  const elem = document.createElement(elemType);
  elem.innerHTML = format(content);
  elem.classList.add(...classes);
  return elem;
}

/* Helper for the next function */
function oneTimeCB (cb) {
  let used = false;
  return function () {
    if (used) return;
    used = true;
    cb();
  }
}

/* Decode classes and elements from a list of Ink tags. */
/* Returns a {elementType, classes} object. Defaults to "p" and nothing. */
function decodeTags (tags) {
  let elementType = 'p';
  const classes = [];
  tags.forEach(tag => {
    if (typeof tag !== 'string') return;
    const foundTag = tag.match(/^<([\w-]+)>$/);
    if (foundTag) {
      elementType = foundTag[1];
      return;
    }
    const foundClass = tag.match(/^\.([\w-]+)$/);
    if (foundClass) {
      classes.push(foundClass[1]);
      return;
    }
  });
  return {elementType, classes};
}

/* Insert a line of content into the output */
/* Returns a Promise that resolves when the animation on the inserted element
   ends or two seconds elapse, whichever happens first.

   The two seconds condition is not supposed to be called, and is instead just a
   fallback to deal with possible weirdness/race conditions browsers can have.

   @param interactive bool if false, no animation is played and the line is inserted silently.
   @return Promise
*/
function insertLine (interactive = true) {
  if (!story.canContinue) {
    return Promise.resolve(false);
  }
  const line = story.Continue();
  const {elementType, classes} = decodeTags(story.currentTags);
  const elem = createLineElement(line, elementType, classes);
  if (interactive) {
    return new Promise(resolve => {
      const cb = oneTimeCB(resolve);
      elem.addEventListener('animationend', cb);
      setTimeout(cb, 2000);
      stageDiv.appendChild(elem);
    });
  } else {
    stageDiv.appendChild(elem);
    return Promise.resolve(true);
  }
}

/* The main game loop; progress the story by an additional step. */
function progressGame () {
  Promise.all([insertLine(), scroll.start()]).then(() => {
    if (!story.canContinue) {
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
    saveGame(index);
    clearOldChoices().then(() => progressGame());
  }
}

/**
 * Autosave the game, adding a choice #index to the saved progress.
 */
function saveGame(index = undefined) {
  if (index !== undefined) {
    progress.push(index);
  }
  localStorage.setItem("progress_"+storyid, JSON.stringify(progress));
}

function loadGame() {
  while (story.canContinue) {
    insertLine(false);
  }
  for (let i = 0; i < progress.length; i++) {
    story.ChooseChoiceIndex(progress[i]);
    while (story.canContinue) {
      insertLine(false);
    }
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
      li.innerHTML = choice.text;
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

function blotter (storyData, storyId = undefined) {

  story = new inkjs.Story(storyData);
  storyid = storyId;
  if (storyId === undefined) {
    storyid = md5(storyData);
  }
  progressdata = localStorage.getItem("progress_"+storyid, progress);
  if (progressdata !== null) {
    progress = JSON.parse(progressdata);
    loadGame();
  } else {
    progress = [];
  }

  return {
    start () {
      progressGame();
    },
    story
  }
}

module.exports = blotter;
