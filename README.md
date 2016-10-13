# Blotter

Blotter is a a front-end engine for publishing [Ink](https://github.com/inkle/ink) stories on the web. It uses [inkjs](https://github.com/y-lohse/inkjs) as its core Ink engine and sole dependency for a pure JavaScript implementation of a simple user interface.

Currently, Blotter is a proof-of-concept project. See [gall](http://github.com/sequitur/gall) for a turnkey way of using Blotter in a project.

## Usage

Use Gall. This information is provided mostly for documentation purposes.

If not using Gall, get the bundled Blotter file from the repository or npm and inline or include it at the end of your html page's body. The page should contain the following structure in its body:

- body
  - div#content-container
    - div#story-stage
    - div#choices

You will also need a CSS that at the very least applies certain transitions and animations to content elements, since Blotter uses CSS animations to time itself when inserting content into the page. See the Gall scaffold for a Less file with examples of how this should work.

The other thing you need is to inline the compiled json from your ink story, output by inklecate, into the head of the html file. You need a `<script type="application/json" id="storyscript">` tag. Blotter looks for those specific attributes.

Blotter attaches two things to the global `window` object: `story` is the actual Inkjs story object, and can be used to attach events to variable changes within Ink or implement game saving/loading. `blotterStart` is a function that, when called, starts the main blotter UI loop.

## Additional features

Blotter interprets underscore characters as signaling _emphasis_ and __strong__ in the same way as markdown. Note that it will only read them on word boundaries. It will also automagically turn ' and " characters into smart "curly" quotes. A hyphen (-) surrounded by spaces will be converted into an en dash; two hyphens into an em dash. Following the most common usage conventions, en dashes are spaced, while em dashes are not.

Paragraphs starting with h1 will be rendered as h1 header elements; the same is true of h2, h3, h4, h5, and h6.
