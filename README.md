dce-paella-extensions
=====================

This module contains [Harvard DCE](http://www.dce.harvard.edu/)-specific extensions to the [Paella video player](https://github.com/polimediaupv/paella).

It is not a standard Node or browser module (as of now), but rather, a way to package extensions for the build process so that we can avoid forking Paella and maintaining that fork.

[![Build Status](https://travis-ci.org/harvard-dce/dce-paella-extensions.svg)](https://travis-ci.org/harvard-dce/dce-paella-extensions)

Installation
------------

When using as a dependency in another project:

    npm install dce-paella-extensions

When working on this module:

    git clone git@github.com:harvard-dce/dce-paella-extensions
    git checkout <branch name>
    npm install

Usage
-----

You need to copy your stuff out of this module to where you need it yourself. Sorry. The DCE fork of paella-matterhorn does it in the `copy-extensions-to-paella` target of its [Makefile](https://github.com/harvard-dce/paella-matterhorn/blob/master/Makefile).

Development
-----------

**Local development**

- Edit the files you want.
- Run tests as documented in the next section.
- When you are ready to publish to NPM, make sure you update the version in package.json.

**Testing a development version of this module in paella-matterhorn**

To avoid having to run `npm publish` and `npm install` just to see if a change worked in the context of paella-matterhorn, you can:

- Run `npm link` (with sudo if your global node_modules is in a place that requires it) from this repo's directory.
- Run `npm link dce-paella-extensions` in the paella-matterhorn directory. Now there will be a symlink-like link to the project.
- Then, run `grunt build` in paella-matterhorn.

Tests
-----

There is only one set of tests so far. To run it, assuming you have already run `npm install`:

    make test

You should see output that looks like this:

    TAP version 13
    # Heartbeat test
    ok 1 Passes a function to the timer.
    ok 2 Sets the timer to run at the interval specified in the config.
    ok 3 The heartbeat event is registered.
    ok 4 Sets the timer to repeat.

    1..4
    # tests 4
    # pass  4

    # ok

Any change you make a PR for should end in a test run with 'ok'; no failures.

DCE modifications not installed by this package
-----------------------------------------------

- Gruntfile.js
- config/config.json
- plugins/es.upv.paella.*
