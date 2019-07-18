// #DCE SingleVideoTogglePlugin purpose: reduce bandwidth on mobile by toggling between presentation & presenter video.
// Adapted for Paella 6.1.2 TODO: needs master-slave refactoring
paella.addPlugin(function () {
  return class SingleVideoTogglePlugin extends paella.ButtonPlugin {
    constructor () {
      super();
      this._isMaster = true;
      this._slaveData = null;
      this._mastereData = null;
    }
    getDefaultToolTip () {
      return base.dictionary.translate("Switch videos");
    }
    getIndex () {
      return 451;
    }
    getAlignment () {
      return 'right';
    }
    getSubclass () {
      return "singleVideoToggleButton";
    }
    getIconClass() {
      return 'icon-small-screen-video-toggle';
    }
    getName () {
      return "edu.harvard.dce.paella.singleVideoTogglePlugin";
    }
    setup () {
      // new event thrown by this plugin
      paella.events.doneSingleVideoToggle = "dce:doneSingleVideoToggle";
      // The sources are > 1 to get to this point
      // TODO: this will definately not work in Paella 6.1.2
      this._masterData = paella.dce.sources[0];
      this._slaveData = paella.dce.sources[1];
      // re-enable video play/pause click for ios
      $(paella.player.videoContainer.domElement).click(function (event) {
        paella.player.videoContainer.firstClick = false;
      });
    }
    checkEnabled (onSuccess) {
      onSuccess(base.userAgent.system.iOS && paella.dce && paella.dce.sources && paella.dce.sources.length > 1);
    }
    action (button) {
      if (this._isMaster) {
        this._isMaster = false;
        this._toggleSources(this._slaveData);
      } else {
        this._isMaster = true;
        this._toggleSources(this._masterData);
      }
    }
    _toggleSources (source) {
      var self = this;
      var currentPlaybackRate = paella.player.videoContainer.masterVideo()._playbackRate;
      // use current quality for toggled source in DCE requestedOrBestFitVideoQualityStrategy during reload
      paella.dce.currentQuality = paella.player.videoContainer.masterVideo()._currentQuality;
      paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
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
          var sources =[source];
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
            }).then(function () {
              base.log.debug("SVT: after set volume to " + videoData.volume);
              // Reset playback rate if the playback button exists and playback rate is not the default of 1.
              // A button onClick event is needed to correctly set the playback plugin UI
              var playbackRateButton = $('#' + self.currentPlaybackRate.toString().replace(".", "\\.") + 'x_button');
              if (self.currentPlaybackRate != 1 && $(playbackRateButton).length) {
                $(playbackRateButton).click();
              }
              //if it was playing, play the video
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
    }
    _addListenerBackOntoIosVideo () {
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
    }
    
    // in Paella5, need to manually remove nodes before reseting video source data
    _removeVideoNodes () {
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
      // TODO: needs to be refactored for 6.1.2!
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
  }
});
