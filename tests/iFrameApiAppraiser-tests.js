var test = require('tape');
var _ = require('lodash');
var url = require('url');
var reload = require('require-reload')(require);
var Promise = require('bluebird');

var mockCurrentTimePromise = function() {
  return Promise.resolve(300);
}

var modulePath = '../vendor/plugins/edu.harvard.dce.paella.iFrameApiAppraiser/iFrameApiAppraiser.js';

var mockPaellaObject = {
  addPlugin: mockAddPlugin,
  EventDrivenPlugin: class {
    constructor(){}
  },
  super: function(){},
  plugins: {},
  events: {
    play:"paella:play",
    pause:"paella:pause",
    next:"paella:next",
    previous:"paella:previous",
    seeking:"paella:seeking",
    seeked:"paella:seeked",
    timeupdate:"paella:timeupdate",
    timeUpdate:"paella:timeupdate",
    seekTo:"paella:setseek",
    endVideo:"paella:endvideo",			// Triggered when a single video stream ends (once per video)
    ended:"paella:ended",				// Triggered when the video ends 
    seekToTime:"paella:seektotime",
    setTrim:"paella:settrim",
    setPlaybackRate:"paella:setplaybackrate",
    setVolume:'paella:setVolume',
    setComposition:'paella:setComposition',
    loadStarted:'paella:loadStarted',
    loadComplete:'paella:loadComplete',
    loadPlugins:'paella:loadPlugins',
    error:'paella:error',
    videoReady:'paella:videoReady',
    controlBarWillHide:'paella:controlbarwillhide',
    controlBarDidHide:'paella:controlbardidhide',
    controlBarDidShow:'paella:controlbardidshow',
    hidePopUp:'paella:hidePopUp',
    showPopUp:'paella:showPopUp',
    enterFullscreen:'paella:enterFullscreen',
    exitFullscreen:'paella:exitFullscreen',
    resize:'paella:resize',
    videoZoomChanged:'paella:videoZoomChanged',
    audioTagChanged:'paella:audiotagchanged',
    zoomAvailabilityChanged:'paella:zoomavailabilitychanged',
    lotsMoreEvents: 'paella:...lotsMoreEvents',
    bind: (e) => {},
  },
  log: {
    debug: (msg) => {
      console.log(msg);
    }
  },
};

// Set up test mocks
setUpMocks();

// Loading the plugin code actually executes the plugin.
// That was how Paella plugins worked before Paella 6.1.2.
// After Paella 6.1.2,  plugins are control loaded by the plugin manager
// But hopefully still works in this test
require(modulePath);

test('iFrameApiAppraiser init test', function iFrameApiAppraiserTests(t) {
  t.plan(2);
  // verify it loaded 
  t.equal(
    getTestClass().getName(), 
    'edu.harvard.dce.paella.iFrameApiAppraiser',
    'The getName endpoint works with the correct value'
  );
  // verify it loaded with settings
  t.ok(
    getTestClass().eventsBoundEarly.includes(paella.events.videoReady),
    'The constructor sets initial values'
  );
});

test('iFrameApiAppraiser embed test', function iFrameApiAppraiserTests(t) {
  t.plan(3);
  var isEnabled = undefined;
  var isEnabledF = (result) => {
    isEnabled = result;
  }
  // The plugin is not embedded in an iframe
  global.window = {
    self: 'https://me.edu',
    top: 'https://me.edu',
  };
  getTestClass().checkEnabled(isEnabledF);
  // The plugin is not enabled
  t.equal(
    isEnabled,
    false,
    'The plugin is not enabled when not embedded'
  );
  // The plugin is embedded with the wrong iframe prefix
  global.window = {
    self: 'https://me.edu',
    top: 'https://you.edu',
    name: 'SOMEOTHERU-iframe-API-ZYXABC',
  };
  getTestClass().checkEnabled(isEnabledF);
  t.equal(
    isEnabled,
    false,
    'The plugin is not enabled when embedded with the wrong iframe name'
  );
  // The plugin is embedded with the right iframe prefix
  global.window = {
    self: 'https://me.edu',
    top: 'https://you.edu',
    name: 'DCE-iframe-API-ZYXABC',
    parent: {
      postMessage: (msg) => {}
    }
  };
  getTestClass().checkEnabled(isEnabledF);
  t.ok(
    isEnabled,
    'The plugin is enabled'
  );
});

test('iFrameApiAppraiser get events test', function iFrameApiAppraiserTests(t) {
  t.plan(1);
  var events = getTestClass().getEvents()
  t.ok(
    !events.includes(paella.events.videoReady),
    'The early bind event is not included in late bind collection'
  );
});

test('iFrameApiAppraiser event handling test', function iFrameApiAppraiserTests(t) {
  t.plan(3);
  // verify the time event uses the time send conditional
  var cond = getTestClass().onEvent(
    paella.events.timeupdate, 
    { currentTime: 300 }
  );
  t.equal(
    cond,
    1,
    'The timeupdate event used the correct conditional'
  );
  var cond = getTestClass().onEvent(paella.events.play);
  t.equal(
    cond,
    2,
    'The play event used the correct conditional'
  );
  var cond = getTestClass().onEvent(paella.events.audioTagChanged);
  t.equal(
    cond,
    3,
    'The unknown event used the correct conditional'
  );
});

// Mocks up the class of the plugin to test
function setUpMocks() {

  global.window = {
    self: 'https://me.edu',
    top: 'https://you.edu',
    name: 'DCE-iframe-API-ZYXABC',
    parent: {
      postMessage: (msg) => {}
    }
  };

  global.paella = _.cloneDeep(mockPaellaObject);

  global.class = function (classDef) {
    function createClass() {
      return _.cloneDeep(classDef);
    };
    global.paella.plugins['test'] = createClass();
  };

}

function getTestClass() {
  return global.paella.plugins['test'];
}

function mockAddPlugin(pluginClass) {
  let PluginClass = pluginClass();
  let pluginClassInstance = new PluginClass();
  global.class(pluginClassInstance);
}

function mockCurrentTime() {
  return 300;
}

function tearDownGlobals() {
  delete global.window;
  delete global.paella;
  delete global.Class;
  delete global.EventDrivenPlugin;
}
