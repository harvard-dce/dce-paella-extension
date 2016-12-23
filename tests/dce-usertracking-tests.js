var test = require('tape');
var _ = require('lodash');
var callNextTick = require('call-next-tick');
var reload = require('require-reload')(require);
var Promise = require('bluebird');

// do this so that lodash is available in the plugin scope
var modulePath = '../vendor/plugins/edu.harvard.dce.paella.dceUsertrackingPlugin/dce_usertracking';

// !! These tests require global mocks.
var mockConfig = {
  requestMethod: 'post',
  heartbeatInterval: 100,
  url: '/test-usertracking-url/',
  extraLogParams: {
    foo: "bar"
  }
};

function mockTrimStart() {
  return 200;
}

function mockGetVideoData() {
  return Promise.resolve({
    currentTime: 300,
    paused: false
  });
}

function mockMasterVideo() {
  return { getVideoData: mockGetVideoData };
}

var mockUrlRequests = [];

var mockPaellaObject = {
  userTracking: {
    SaverPlugIn: ''
  },
  events: {
    'play': 'paella:play'
  },
  plugins: {},
  userTracking: {
    log: function() {},
  },
  player: {
    videoIdentifier: 'the-video-identifier',
    videoContainer: {
      trimStart: mockTrimStart,
      masterVideo: mockMasterVideo
    }
  },
  opencast: {
    resourceId: '/2015/03/33383/L10'
  },
  ajax: {
    post: function(requestArgs) {
      mockUrlRequests.push({ method: 'post', args: requestArgs });
    }
  }
};

test('Heartbeat tests', function heartbeatTests(t) {
  t.plan(3);

  // Set up mocks and checks.
  setUpMocks();

  global.base.Timer = timer;

  function timer(callback, time, params) {
    t.equal(
        typeof callback,
        'function',
        'Passes a function to the timer.'
    );
    t.equal(
        time,
        mockConfig.heartbeatInterval,
        'Sets the timer to run at the interval specified in the config.'
    );

    callNextTick(callback, global.base.Timer);
    callNextTick(checkRepeatValue);

    var instance = this;

    function checkRepeatValue() {
      t.equal(instance.repeat, true, 'Sets the timer to repeat.');
    }
  }

  // Loading the plugin code actually executes the plugin.
  // That is how Paella plugins work.
  require(modulePath);

});

test('Usertracking event tests', function usertrackingEventTests(t) {
  t.plan(4);
  new Promise(function(resolve, reject) {
    paella.plugins.dceUsertracking.log(paella.events.play);
    resolve();
  })
  .then(function() {
    t.ok(
        mockUrlRequests.length == 1,
        'usertracking request was made'
    );
    var req = mockUrlRequests.pop();
    t.equal(
        req.args.params.type,
        "PLAY",
        'action had correct type'
    );
    t.equal(
        req.args.url,
        mockConfig.url,
        'request used correct url'
    );
    t.equal(req.args.params.foo, "bar", 'request includes extra params');
  });
});

test('Usertracking live event test', function usertrackingLiveEventTest(t) {
  t.plan(1);

  /*
   * the combo of live + paused both = true should result
   * in playing = true as it's not possible to pause live video
   */
  paella.player.isLiveStream = function() { return true };
  paella.player.videoContainer.paused = function() { return true };

  new Promise(function(resolve, reject) {
    paella.plugins.dceUsertracking.log(paella.events.heartbeat);
    resolve();
  })
  .then(function() {
    var req = mockUrlRequests.pop();
    t.ok(
      req.args.params.playing,
      'live stream event marked as playing'
    );
  });
});

// opts is not a required parameter. But if you do specify it, here's an example
// of what is expected:
// {
//  classMethods: {
//    nameOfMethodYouWantAttachedToEveryInstance: function myFn() { ... },
//    otherMethod: function myOtherFn() { ... }
//  }
// }
function setUpMocks(opts) {

  global.location = {
    host: 'test-server'
  };

  global.paella = _.cloneDeep(mockPaellaObject);

  global.base = {};

  global.Class = function Class(classPath, classType, classDef) {
    var classSegments = classPath.split('.');
    if (classSegments.length === 3) {
      global.paella.plugins[classSegments[2]] = createClass;
    }

    function createClass() {
      var classInst = _.cloneDeep(classDef);
      classInst.config = _.cloneDeep(mockConfig);
      classInst.setup();

      if (opts && opts.classMethods) {
        for (methodName in opts.classMethods) {
          classInst[methodName] = opts.classMethods[methodName];
        }
      }

      return classInst;
    }
  };
}

function tearDownGlobals() {
  delete global.location;
  delete global.paella;
  delete global.base;
  delete global.Class;
}
