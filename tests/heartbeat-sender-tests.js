var test = require('tape');
var _ = require('lodash');
var url = require('url');
var reload = require('require-reload')(require);
var Promise = require('bluebird');

var mockCurrentTimePromise = function() {
  return Promise.resolve(300);
}

var modulePath = '../vendor/plugins/edu.harvard.dce.paella.heartbeatSender/heartbeat_sender';

// !! These tests require global mocks.
var mockConfig = {
  heartBeatTime: 100
};

var mockPaellaObject = {
  addPlugin: mockAddPlugin,
  EarlyLoadPlugin: class {
    constructor(){}
  },
  super: function(){},
  plugins: {},
  player: {
    videoIdentifier: 'the-video-identifier',
    videoContainer: {
      currentTime: mockCurrentTimePromise,
      trimStart: mockTrimStart,
      paused: mockPaused,
      masterVideo: mockMasterVideo
    }
  },
  opencast: {
    resourceId: '/2015/03/33383/L10'
  }
};

test('Heartbeat tests', function heartbeatTests(t) {
  t.plan(14);

  // Set up mocks and checks.
  setUpMocks();
  setUpAssertingMocks(t);

  // Loading the plugin code actually executes the plugin.
  // That was how Paella plugins worked before Paella 6.1.2.
  // After Paella 6.1.2,  plugins are control loaded by the plugin manager
  require(modulePath);

});

test('Livestream heartbeat test', function liveStreamTest(t) {
  tearDownGlobals();

  t.plan(14);

  setUpMocks();
  setUpAssertingMocks(t);

  reload(modulePath);
});


// TODO: Separate mocks and asserts.

function setUpAssertingMocks(t) {
  global.base.Timer = timer;
  global.base.log = {
     debug: function(){}
  }
  global.XMLHttpRequest = createMockXHR();

  function timer(callback, time, params) {

    t.equal(
      typeof callback,
      'function',
      'Passes a function to the timer.'
    );
    t.equal(
      time,
      mockConfig.heartBeatTime,
      'Sets the timer to run at the interval specified in the config.'
    );

    process.nextTick(callback, global.base.Timer);
    process.nextTick(checkRepeatValue);

    var instance = this;

    function checkRepeatValue() {
      t.equal(instance.repeat, true, 'Sets the timer to repeat.');
    }
  }

  function createMockXHR() {
    function mockXHR() {
      debugger;
      this.open = createMockOpen();
      this.send = createMockSend();
    }
    return mockXHR;
  }

  function createMockOpen() {
    function mockOpen(method, URL) {
      t.equal(method, 'GET', 'Opens a request with the GET method.');
      // t.equal(URL, )
      checkHeartbeatURL(URL);
    }
    return mockOpen;
  }

  function createMockSend() {
    function mockSend() {
      t.pass('The xhr is actually sent.');
    }
    return mockSend;
  }

  function checkHeartbeatURL(URL) {
    var urlParts = url.parse(URL, true);
    var query = urlParts.query;

    t.equal(urlParts.pathname, '/usertracking/', 'Request pathname is correct.');

    t.equal(
      query._method, 'PUT', 'Sends "PUT" as the "_method" query param.'
    );
    t.equal(
      query.id,
      mockPaellaObject.player.videoIdentifier,
      'id query param is set to the value of paella.player.videoIdentifier.'
    );
    t.equal(query.type, 'HEARTBEAT', 'type query param is correct.');

    t.equal(
      parseInt(query['in'], 10),
      (mockCurrentTime() + mockTrimStart()),
      '"in" query param is set to currentTime + trimStart.'
    );
    t.equal(
      parseInt(query.out, 10),
      (mockCurrentTime() + mockTrimStart()),
      '"out" query param is also set to currentTime + trimStart.'
    );
    t.equal(
      query.resource,
      mockPaellaObject.opencast.resourceId,
      'resource query param is set to the value of paella.opencast.resourceId.'
    );

    var timestamp = new Date(query._);
    t.equal(
      typeof timestamp,
      'object',
      'The timestamp ("_") query param is a valid date.'
    );

    t.equal(
      query.playing,
      'live',
      'The playing query param should be set to the string "true".'
    );
  }
}

function setUpMocks(opts) {

  global.location = {
    host: 'test-server'
  };

  global.paella = _.cloneDeep(mockPaellaObject);

  // For a live stream, paella.player.paused() will always return true, even if
  // it is playing (which it always is).
  global.paella.player.isLiveStream = mockIsLiveStream;
  global.paella.player.videoContainer.paused = mockPausedIsTrue;

  global.base = {};

  global.class = function (classDef) {

    function createClass() {
      var classInst = _.cloneDeep(classDef);
      classInst.config = _.cloneDeep(mockConfig);

      if (opts && opts.classMethods) {
        for (methodName in opts.classMethods) {
          classInst[methodName] = opts.classMethods[methodName];
        }
      }
      classInst.load();
      return classInst;
    };
    global.paella.plugins['test'] = createClass();
  };
}

function mockAddPlugin(pluginClass) {
  let PluginClass = pluginClass();
  let pluginClassInstance = new PluginClass();
  global.class(pluginClassInstance);
}

function mockCurrentTime() {
  return 300;
}

function mockTrimStart() {
  return 200;
}

function mockPaused() {
  return false;
}

function mockPausedIsTrue() {
  return true;
}

function mockIsLiveStream() {
  return true;
}

function mockGetVideoData() {
  return Promise.resolve({
    currentTime: 300,
    paused: false
   });
}

function mockMasterVideo() {
  return {getVideoData: mockGetVideoData};
}


function tearDownGlobals() {
  delete global.location;
  delete global.paella;
  delete global.base;
  delete global.Class;
  delete global.XMLHttpRequest;
  delete global.EventDrivenPlugin;
}
