/** #DCE SingleVideoTogglePlugin
 * Purpose 1: Reduce bandwidth on mobile by toggling between presentation & presenter video.
 * Purpose 2: Allow user to toggle resolution of DCE HLS Live video (v1 Toggling requires reloading diff res video).
 * Uses audio from the visible track (no enabled if special HUDCE tag: multiaudio is not set)
 *
 * Updated for Paella 6x
 * Adapted for Paella 6.1.2
 * For Paella 6.2.0, the viewModeToggleProfilesPlugin module is required.
 */
paella.addPlugin(() => {
  return class SingleVideoTogglePlugin extends paella.ButtonPlugin {
    constructor () {
      super ();
      this._toggleSingleVideoIndex = 0;
      this._toggleHlsLiveResV1Index = 1;
      this._toolTipOpts =[ "Switch videos", "Change resolution"];
      this._subClassOpts =[ "showViewModeButton", "showMultipleQualitiesPlugin"];
      this._iconClassOpts =[ "icon-presentation-mode", "icon-screen"];
      this._curOptIndex = 0; // iOS single video: toggle 2 videos to show only one
      this._iOSProfile = 'one_big';
      this._masterVideo = null;
      this._toggleIndex = 1; //toggle to presentation when button pressed first time
    }
    getDefaultToolTip () {
      return base.dictionary.translate(this._toolTipOpts[ this._getOptIndex()]);
    }
    getAriaLabel() {
      return base.dictionary.translate(this._toolTipOpts[ this._getOptIndex()]);
    }
    getAlignment() {
      return 'right';
    }
    getSubclass() {
      // #DCE OPC-497 show current res text on button (get the mutli quality button style)
      return base.dictionary.translate(this._subClassOpts[ this._getOptIndex()]);
    }
    getIconClass() {
      // #DCE OPC-497 show current res text on button
      return base.dictionary.translate(this._iconClassOpts[ this._getOptIndex()]);
    }
    getIndex() {
      return 450;
    }
    getInstanceName() {
      return "singleVideoTogglePlugin";
    }
    getName() {
      return "edu.harvard.dce.paella.singleVideoTogglePlugin";
    }
    _getOptIndex() {
      return (paella.dce && paella.dce.hlsLiveToggleV1) ? this._toggleHlsLiveResV1Index: this._toggleSingleVideoIndex;
    }

    _currentPlayerProfile() {
      return paella.player.selectedProfile;
    }

    _printResIfHlsLive(streams) {
      // Check if hlsLiveToggleV1 flag exists and the path to the source resolution value exists
      // Then add the current resolution value into the control button
      if  (paella.dce && paella.dce.hlsLiveToggleV1 && streams
          && streams.length > 0
          && streams[0].sources
          && streams[0].sources.hls
          && streams[0].sources.hls.length > 0
          && streams[0].sources.hls[0].res) {
            // change the UI res text
            this.setText(streams[0].sources.hls[0].res.w + "p");
      }
    }

    checkEnabled (onSuccess) {
      // Enable for iOS (not Android) TODO: test with Safari on Android?
      let enabled = base.userAgent.system.iOS && paella.dce && paella.dce.sources && paella.dce.sources.length > 1 && ! paella.dce.blankAudio;
      // #DCE OPC-497 also enable for HLS Live when 2 seperate m3u8 passed with different res for the same video, instead of one master m3u8 containing 2 res.
      if (paella.dce && paella.dce.hlsLiveToggleV1) {
        this._printResIfHlsLive(paella.player.videoLoader._data.streams);
        this._curOptIndex = this._toggleHlsLiveResV1Index; // tool tip and class uses HLS live text and classes
        enabled = true;
      }
      // end DCE HLS Live v1
      onSuccess(enabled);
    }
    getCurrentMasterVideo () {
      return paella.dce.videoPlayers.find(player => {
        return player === paella.player.videoContainer.masterVideo();
      });
    }
    action(button) {
      // OPC-552 protect from autoplay on lazy re-load
      paella.dceDontPlayOnLoad = true;
      let This = this;
      let currentTrimmedTimeToSeek = 0;
      paella.player.videoContainer.currentTime().then((currentTrimmedTime) => {
        currentTrimmedTimeToSeek = currentTrimmedTime;
        return paella.player.videoContainer.masterVideo().getVideoData();
      }).then((videoData) => {
        paella.dce.videoDataSingle = videoData;
        paella.dce.videoDataSingle.currentTrimmedTimeToSeek = currentTrimmedTimeToSeek;
        paella.dce.videoDataSingle.playbackRate = paella.player.videoContainer.masterVideo().video.playbackRate;
        // Stop resize until after load to prevent timer
        paella.pluginManager.doResize = false;
        base.log.debug("SVG: About to pause video prior tto removing it (1)");
        // pause videos to temporarily stop update timers
        return paella.player.videoContainer.pause();
      }).then(() => {
        // ADD seekloader spinner until new video is loaded
        paella.player.loader.seekload();
        base.log.debug("SVT: Added loading spinner (2)");
        // Remove the existing video nodes in this promise
        return This._resetVideoNodes();
      }).then(()=> {
        base.log.debug("SVG: about to set stream other other video (5)");
        paella.player.videoLoader._data.metadata.preview = null;
        // toggle each source sequentially
        let index = This._toggleIndex++ % paella.dce.sources.length;
        paella.player.videoLoader._data.streams = [paella.dce.sources[index]];
        This._printResIfHlsLive(paella.player.videoLoader._data.streams);
        // #DCE OPC-552, wait for load()'s' loadComplete event before resetting state
        $(document).bind(paella.events.loadComplete, function (event, params) {
          $(document).unbind(paella.events.loadComplete);
          // reset state (if not dce hls live v1)
          base.log.debug('SVT: SingleVideoToggle load complete, about to reset state (7)');
          if (!(paella.dce && paella.dce.hlsLiveToggleV1)) {
            This._resetPlayerState();
          }
        });
        // Load with the updated loader data
        base.log.debug("SVG: about to load video (6)");
        paella.player.loadVideo();
      });
    }

    _resetPlayerState () {
      paella.player.videoContainer.seekToTime(paella.dce.videoDataSingle.currentTrimmedTimeToSeek);
      paella.player.videoContainer.setVolume(paella.dce.videoDataSingle.volume);
      paella.player.videoContainer.setPlaybackRate(paella.dce.videoDataSingle.playbackRate);
      paella.pluginManager.doResize = true;
      // User is required to click play to restart toggled video
      base.log.debug("SVG: reseting player state (8)");
    }

    // in Paella5 & 6, must manually remove nodes before reseting video source data
    // for Paella 6.4.3, turn into promise with unload/destroy on hls object
    _resetVideoNodes () {
      let promise = new Promise((resolve, reject) => {

        // Video container is not ready until the video reloads
        paella.player.videoContainer._ready = false;

        // remove the nodes of all video wrappers
        for (let i = 0; i < paella.player.videoContainer.videoWrappers.length; i++) {
          let wrapper = paella.player.videoContainer.videoWrappers[i];
          let wrapperNodes =[].concat(wrapper.nodeList);
          for (let j = 0; j < wrapperNodes.length; j++) {
            wrapper.removeNode(wrapperNodes[j]);
          }
          paella.player.videoContainer.removeNode(wrapper);
          $("#videoPlayerWrapper_0").remove();
        }

        // Call unload and ignore promise rejects for unimplemented.
        paella.player.videoContainer.streamProvider.mainPlayer.unload()
        .catch(err => err)
        .then(() => {

          // clear existing stream provider data
          paella.player.videoContainer._streamProvider._mainStream = null;
          paella.player.videoContainer._streamProvider._videoStreams =[];
          paella.player.videoContainer._streamProvider._audioStreams =[];
          paella.player.videoContainer._streamProvider._mainPlayer = null;
          paella.player.videoContainer._streamProvider._audioPlayer = null;
          paella.player.videoContainer._streamProvider._videoPlayers =[];
          paella.player.videoContainer._streamProvider._audioPlayers =[];
          paella.player.videoContainer._streamProvider._players =[];
          base.log.debug("SVT: removed video node (4)");
          resolve();
        });
      });
      return promise;
    }
  }
});

