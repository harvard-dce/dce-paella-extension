dce-paella-extensions
=====================

TODO: Update for Paella 7

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

You need to copy your stuff out of this module to where you need it yourself.

For example, HUDCE registers this repo as a dependency of a project that also depends on Paella and Opencast and uses a gulpfile to copy the files to where they need to go.

```
  ...
  var s1 = gulp.src(config.dceExtPath + '/vendor/plugins/**').pipe(gulp.dest(config.buildPath + '/paella/plugins'));
  var s2 = gulp.src(config.dceExtPath + '/vendor/skins/**').pipe(gulp.dest(config.buildPath + '/paella/vendor/skins'));
  var s3 = gulp.src(config.dceExtPath + '/resources/images/paella_icons_light_dce.png').pipe(gulp.dest(config.buildPath + '/paella/resources/images'));
  var s4 = gulp.src(config.dceExtPath + '/resources/style/overrides.less').pipe(gulp.dest(config.buildPath + '/paella/resources/style'));
  ...
  var s1 = gulp.src(config.dceExtPath + '/config/config.json').pipe(gulp.dest(config.buildPath + '/paella-opencast/config'));
  var s2 = gulp.src(config.dceExtPath + '/config/profiles/profiles.json').pipe(gulp.dest(config.buildPath + '/paella-opencast/config/profiles'));
  ...
```
Development
-----------

**Local development**

- Edit the files you want.
- Run tests as documented in the next section.
- When you are ready to publish to NPM, make sure you update the version in package.json.
- Also tag with the same version (i.e. if npm version is 1.6.8, make a git tag -a v1.6.8) and push to the repo.
-- This allows the dce-opencast to use npm or the git repo directly.
-- For example, via "dce-paella-extensions": "1.6.8" or "dce-paella-extensions": "harvard-dce/dce-paella-extensions#v1.6.18"

**Testing a development version of this module in hudce-opencast**

To avoid having to run `npm publish` and `npm install` just to see if a change worked in the context of paella-matterhorn, you can:

- Run `npm link` (with sudo if your global node_modules is in a place that requires it) from this repo's directory.
- Run `npm link dce-paella-extensions` in the hudce-opencast enage-player-paella module. Now there will be a symlink-like link to the project.
- Then, run `gulp build` in the hudce-opencast enage-player-paella module.

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

