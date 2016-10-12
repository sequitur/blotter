const inkjs = require('inkjs');

const storySource = document.querySelector('script[id="storyscript"][type="application/json"]');

const story = new inkjs.Story(storySource.innerHTML);

window.story = story; // For debug purposes

/* Set up the stage */

const stageDiv = document.querySelector('#story-stage');
const choiceDiv = document.querySelector('#choices');

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

function insertLine () {
  const line = story.Continue();
  const p = document.createElement('p');
  p.innerText = line;
  return new Promise(resolve => {
    p.addEventListener('animationend', resolve);
    stageDiv.appendChild(p);
  });
}

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

let choicesAnimating = false;

function choiceListener(index) {
  return function (event) {
    event.preventDefault();
    if (choicesAnimating) return;
    clearChoiceListeners();
    story.ChooseChoiceIndex(index);
    clearOldChoices().then(() => progressGame());
  }
}

function createChoiceListener(li, index) {
  li.clickListener = choiceListener(index);
  li.addEventListener('click', li.clickListener);
  li.clearListener = (function () {
    this.removeEventListener('click', this.clickListener);
  }).bind(li);
}

function clearChoiceListeners() {
  const lis = document.querySelectorAll('li');
  Array.from(lis).forEach(li => {
    if (li.clearListener) li.clearListener();
  })
}

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

function placeChoices () {
  const ul = createChoiceUl();
  ul.addEventListener('animationend', () => choicesAnimating = false);
  choicesAnimating = true;
  choiceDiv.appendChild(ul);
}

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

progressGame();
