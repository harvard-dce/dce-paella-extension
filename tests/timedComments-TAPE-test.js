/////////////////////////////////////////////
// Tests for the timedCommentsOverlayPlugin
/////////////////////////////////////////////

// for headless testing
var test = require('tape');
// for cloning the mocks
var _ = require('lodash');
var reload = require('require-reload')(require);
var path = require('path');
var jsonfile = require('jsonfile');
var sampleAnnotFile = './tests/timedCommentsSample.json';


// path to the code being tested
var modulePathOverlay = '../vendor/plugins/edu.harvard.dce.paella.timedCommentsPlugin/timedCommentsOverlay';
var modulePathFootprint = '../vendor/plugins/edu.harvard.dce.paella.timedCommentsPlugin/timedCommentsFootprints';
var modulePathDataDelegate = '../vendor/plugins/edu.harvard.dce.paella.timedCommentsPlugin/timedCommentsDataDelegate';

var beforeSortedOrder = [235367673, 235367659, 235367661, 235367662, 235367663, 235367664, 235367665, 235367668, 235367666, 235367667, 235367669, 235367670, 235367671, 235367660, 235367672];
var afterSortedOrder = [235367659, 235367660, 235367661, 235367662, 235367672, 235367673, 235367663, 235367664, 235367670, 235367665, 235367666, 235367667, 235367668, 235367669, 235367671];

test('Timed Comments tests', function modulesLoadTest(t) {
    // tearDownGlobals
    t.plan(1);
    // mock the resources neede by the module
    setUpMocks();
    // add the module
    require(modulePathOverlay);
    // verify it loaded with defalts
    t.equal(getTestClass()._curScrollTop, 0, "module loaded with default config");
});

test('Timed Comments sort', function annotationsSortTest(t) {
    tearDownGlobals();
    t.plan(2);
    // mock the resources neede by the module
    setUpMocks();
    // add the module
    reload(modulePathOverlay);
    // use the sample json file
    var annotsResult = jsonfile.readFileSync(sampleAnnotFile);
    var annotations = parseSampleAnnotations(annotsResult.annotations);
    getTestClass()._annotations = annotations;
    var mismatch = null;
    getTestClass()._annotations.forEach(function(annot, index) {
      if (annot.annotationId !== beforeSortedOrder[index]) {
          mismatch = index + ". " + beforeSortedOrder[index] + " should not be " +  annot.annotationId;
      }
    });
    t.equal(mismatch, null, "order before sorting annotations");
    getTestClass().sortAnnotations();
    getTestClass()._annotations.forEach(function(annot, index) {
      if (annot.annotationId !== afterSortedOrder[index]) {
          mismatch = index + ". " + afterSortedOrder[index] + " should not be " +  annot.annotationId;
      }
    });
    t.equal(mismatch, null, "order after sorting annotations");
});

var mockPaellaObject = {
    addPlugin: mockAddPlugin,
    EventDrivenPlugin: class {
     constructor(){}
    },
    super: function(){},
    plugins: {},
    player: {
        videoIdentifier: 'the-video-identifier',
        videoContainer: {
            currentTime: mockCurrentTime,
            paused: mockPaused
        }
    },
    events: {
        //created by the module
        //refreshTimedComments:'refreshTimedComments',
        //showTimedComments:'showTimedComments',
        //hideTimedComments:"hideTimedComments",
        play: 'play',
        pause: 'pause',
        endVideo: 'endVideo',
        timeupdate: 'timeupdate'
    }
};

// Represents the config.json
var mockConfig = {};

// Mocks up the class of the plugin to test
function setUpMocks(opts) {
  global.paella = _.cloneDeep(mockPaellaObject);
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
      return classInst;
    };
    global.paella.plugins['test'] = createClass();
  };

}

function getTestClass() {
  return global.paella.plugins['test'];
}

// JSONify the annotations sample data (as is done in the data delegate)
function parseSampleAnnotations(data) {
    var annotations = data.annotation;
    if (!(annotations instanceof Array)) {
        annotations =[annotations];
    }
    
    // Transform stringfied value into json object
    annotations = annotations.map(function (obj) {
        var rObj = obj;
        if (obj.value && (typeof obj.value !== 'object')) {
            try {
                rObj.value = JSON.parse(obj.value);
            }
            catch (err) {
                console("TC Error " + err + " unable to json parse " + obj.value);
            }
        }
        return rObj;
    });
    return annotations;
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

function tearDownGlobals() {
    delete global.location;
    delete global.paella;
    delete global.base;
    delete global. Class;
}