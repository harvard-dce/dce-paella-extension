// SingleVideoTogglePlugin purpose: reduce bandwidth on mobile by toggling between presentation & presenter video.
Class ("paella.plugins.SingleVideoTogglePlugin", paella.ButtonPlugin, {
  
  _isMaster: true,
  _slaveData: null,
  _mastereData: null,
  getDefaultToolTip: function () {
    return base.dictionary.translate("Switch videos");
  },
  getIndex: function () {
    return 451;
  },
  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "singleVideoToggleButton";
  },
  getName: function () {
    return "edu.harvard.dce.paella.singleVideoTogglePlugin";
  },
  setup: function () {
    // new event thrown by this plugin
    paella.events.doneSingleVideoToggle = "dce:doneSingleVideoToggle";
    // The sources are > 1 to get to this point
    this._masterData = paella.dce.sources[0];
    this._slaveData = paella.dce.sources[1];
    // re-enable video play/pause click for ios
    $(paella.player.videoContainer.domElement).click(function (event) {
      paella.player.videoContainer.firstClick = false;
    });
  },
  checkEnabled: function (onSuccess) {
    onSuccess(base.userAgent.system.iOS && paella.dce && paella.dce.sources && paella.dce.sources.length > 1);
  },
  action: function (button) {
    if (this._isMaster) {
      this._isMaster = false;
      this._toggleSources(this._slaveData);
    } else {
      this._isMaster = true;
      this._toggleSources(this._masterData);
    }
  },
  _toggleSources: function(source) {
    var self = this;
    // use current quality for toggled source
    paella.dce.currentQuality = paella.player.videoContainer.masterVideo()._currentQuality;
    paella.player.videoContainer.masterVideo().getVideoData().then(function(videoData) {
      // pause videos to temporarily stop update timers
      paella.player.videoContainer.pause().then(function () {
        paella.pluginManager.doResize = false;
        // save current volume to player config to be used during video recreate
        if (paella.player.config.player.audio) {
          paella.player.config.player.audio.master = videoData.volume;
        }
        // Remove the existing video node
        self._removeVideoNodes();
        // Need to augment attributes (e.g. add type = "video/mp4")
        paella.player.videoLoader.loadStream(source);
        var sources = [source];
        paella.player.videoContainer.setStreamData(sources).then(function () {
          paella.player.videoContainer.seekToTime(videoData.currentTime);
          // #DCE Un-pause the plugin manager's timer from looking to master video duration
          // "paella.pluginManager.doResize" is a custom #DCE param,
          //  see DCE opencast-paella vendor override: src/05_plugin_base.js
          paella.pluginManager.doResize = true;
          self._addListenerBackOntoIosVideo();
          paella.player.videoContainer.setVolume({
            'master': videoData.volume,
            'slave': 0
          }).then(function() {
             base.log.debug("SVT: after set volume to " +  videoData.volume);
             //start 'em up if needed
             if (! videoData.paused) {
               paella.player.paused().then(function (stillPaused) {
                 if (stillPaused) {
                   paella.player.play();
                 }
               });
             }
             // completely swapping out sources requires res selection update
             paella.events.trigger(paella.events.doneSingleVideoToggle);
          });
        });
      });
    });
  },
  _addListenerBackOntoIosVideo: function () {
    // re-enable click on screen
    paella.player.videoContainer.firstClick = false;
    // Since this is IOS, need to re-apply the full screen listener
    var player = document.getElementsByTagName("video")[0];
    player.addEventListener('webkitbeginfullscreen', function (event) {
      paella.player.play()
    },
    false);
    player.addEventListener('webkitendfullscreen', function (event) {
      paella.player.videoContainer.firstClick = false;
      paella.player.pause();
    },
    false);
  },

  // in Paella5, need to manually remove nodes before reseting video source data
  _removeVideoNodes: function () {
    var video1node = paella.player.videoContainer.masterVideo();
    var video2node = paella.player.videoContainer.slaveVideo();
    // ensure swf object is removed
    if (typeof swfobject !== "undefined") {
      swfobject.removeSWF("playerContainer_videoContainer_1Movie");
    }
    paella.player.videoContainer.videoWrappers[0].removeNode(video1node);
    if (video2node && paella.player.videoContainer.videoWrappers.length > 1) {
      paella.player.videoContainer.videoWrappers[1].removeNode(video2node);
    }
    // empty the set of video wrappers
    paella.player.videoContainer.videoWrappers =[];
    // remove video container wrapper nodes
    var masterWrapper = paella.player.videoContainer.container.getNode("masterVideoWrapper");
    paella.player.videoContainer.container.removeNode(masterWrapper);
    var slaveWrapper = paella.player.videoContainer.container.getNode("slaveVideoWrapper");
    if (slaveWrapper) {
      paella.player.videoContainer.container.removeNode(slaveWrapper);
    }
    // clear existing stream provider data
    paella.player.videoContainer._streamProvider.constructor();
    // trigger videoUnloaded event for volumecontrol save action and buffer indicator
    paella.events.trigger(paella.events.videoUnloaded);
    base.log.debug("PO: removed video1 and video2 nodes");
  }
});

paella.plugins.singleVideoTogglePlugin = new paella.plugins.SingleVideoTogglePlugin();
