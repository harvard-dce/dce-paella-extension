// based on es.upv.paella.multipleQualitiesPlugin, "paella.plugins.MultipleQualitiesPlugin"
Class ("paella.plugins.SingleMultipleQualitiesPlugin", paella.ButtonPlugin, {
  currentUrl: null,
  currentMaster: null,
  currentSlave: null,
  currentLabel: '',
  _currentQuality: null,
  availableMasters:[],
  availableSlaves:[],
  showWidthRes: null,
  _domElement: null,
  // to filter out presentations without a matching file str match
  // the default value can be changed by the config file.
  _presenterHasAudioTag: 'multiaudio',
  presentationOnlyLabel: 'Go_to_Presentation_Only',
  singleStreamLabel: 'SINGLESTREAM',
  bothVideosLabel: 'Go_to_Both_Videos',
  multiStreamLabel: 'MULTISTREAM',
  toggleButton: null,
  singleLabelButton: null,
  multiLabelButton: null,

  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "showMultipleQualitiesPlugin";
  },
  getIndex: function () {
    return 448;
  },
  getMinWindowSize: function () {
    return 550;
  },
  getName: function () {
    return "edu.harvard.edu.paella.singleMultipleQualitiesPlugin";
  },
  getDefaultToolTip: function () {
    return base.dictionary.translate("Change video quality");
  },

  checkEnabled: function (onSuccess) {
    var This = this;
    paella.player.videoContainer.getQualities().then(function (q) {
      onSuccess((This.availableSlaves.length > 0) || (q.length > 1));
    });
  },

  setup: function () {
    var This = this;
    This.initData();
    This.setQualityLabel();
    // Inserting a new event type (triggered by DCE presentationOnlyPlugin)
    paella.events.donePresenterOnlyToggle = "dce:donePresenterOnlyToggle";
    // Inserting a new event type (triggered by DCE singleVideoPlugin)
    paella.events.doneSingleVideoToggle = "dce:doneSingleVideoToggle";
    //config
    This.showWidthRes = (This.config.showWidthRes !== undefined) ? This.config.showWidthRes: true;
    paella.events.bind(paella.events.qualityChanged, function (event) {
      This.setQualityLabel();
    });
    paella.events.bind(paella.events.donePresenterOnlyToggle, function (event) {
      This.turnOnVisibility();
    });
    paella.events.bind(paella.events.doneSingleVideoToggle, function (event) {
      This.rebuildContent();
    });
  },

  initData: function () {
    var key, j;
    var container = paella.player.videoContainer.getNode("playerContainer_videoContainer_container");
    this.currentMaster = paella.player.videoContainer.masterVideo();
    this.currentSlave = paella.player.videoContainer.slaveVideo();

    var minVerticalRes = parseInt(this.config.minVerticalRes);
    var maxVerticalRes = parseInt(this.config.maxVerticalRes);
    if (this.config.presenterHasAudioTag) {
      this._presenterHasAudioTag = this.config.presenterHasAudioTag;
    }

    // Search for the resolutions
    var allMasterSources = paella.player.videoContainer.sourceData[0].sources;

    for (key in allMasterSources) {
      // This assumes the video container has a stream name attribute (i.e.'rtmp', 'mp4', etc).
      // Note: this does not differentiate on sub-types of "rtmp" stream (i.e. video/x-flv, video/mp4).
      // The strategy may need to be revisited in the future to filter out stream source types of "hls", "mpd", etc.
      if (key === this.currentMaster._streamName) {
        for (j = 0; j < allMasterSources[key].length;++ j) {
          if ((isNaN(minVerticalRes) == false) && (parseInt(allMasterSources[key][j].res.h) < minVerticalRes)) {
            continue;
          }
          if ((isNaN(maxVerticalRes) == false) && (parseInt(allMasterSources[key][j].res.h) > maxVerticalRes)) {
            continue;
          }
          this.availableMasters.push(allMasterSources[key][j]);
        }
      }
    }
    if (this.currentSlave) {
      var allSlaveSources = paella.player.videoContainer.sourceData[1].sources;
      for (key in allSlaveSources) {
        for (j = 0; j < allSlaveSources[key].length;++ j) {
          if ((allSlaveSources[key][j].type.split("/")[1] == this.currentSlave._streamName)) {
            if ((isNaN(minVerticalRes) == false) && (parseInt(allSlaveSources[key][j].res.h) < minVerticalRes)) {
              continue;
            }
            if ((isNaN(maxVerticalRes) == false) && (parseInt(allSlaveSources[key][j].res.h) > maxVerticalRes)) {
              continue;
            }
            this.availableSlaves.push(allSlaveSources[key][j]);
          }
        }
      }
    }

    // Sort the available resolutions
    function sortfunc(a, b) {
      var ia = parseInt(a.res.h);
      var ib = parseInt(b.res.h);
      return ((ia < ib) ? -1: ((ia > ib) ? 1: 0));
    }

    this.availableMasters.sort(sortfunc);
    this.availableSlaves.sort(sortfunc);
  },

  getButtonType: function () {
    return paella.ButtonPlugin.type.popUpButton;
  },

  buildContent: function (domElement) {
    var This = this;
    paella.player.videoContainer.getCurrentQuality().then(function (q) {
      This._currentQuality = q;
      This._buildContent(domElement);
    });
  },

  rebuildContent: function () {
    var self = this;
    self.availableMasters =[];
    self.availableSlaves =[];
    $(self._domElement).empty();
    self.initData();
    self._buildContent(self._domElement);
  },

  _buildContent: function (domElement) {
    var self = this;
    self._domElement = domElement;
    var w, h, d, e, b = 0;
    var percen1, percen2, reso2, act_percen;
    percen1 = 100 / this.availableMasters.length;

    if (this.availableSlaves.length == 0 && this.availableMasters.length > 0) {
      this._buildSingleStreamDom(this.availableMasters);
      return;
    }

    percen2 = 100 / this.availableSlaves.length;

    if (this.availableSlaves.length > 0 && ! this._isFiltered()) {
      this._buildSingleStreamDom(this.availableSlaves);
    }

    if (this.availableMasters.length >= this.availableSlaves.length) {
      this._buildMultiStreamDom(percen2, this.availableMasters, this.availableSlaves);
    } else {
      this._buildMultiStreamDom(percen1, this.availableSlaves, this.availableMasters);
    }
  },

  _buildSingleStreamDom: function (availableSlaves) {
    var w, h, d, e, b = 0;
    var reso;

    this.singleLabelButton = this.getItemButton(this.singleStreamLabel, this.singleStreamLabel);
    this._domElement.appendChild(this.singleLabelButton);

    for (var i = 0; i < availableSlaves.length; i++) {
      w = availableSlaves[i].res.w;
      h = availableSlaves[i].res.h;
      reso = w + "x" + h;
      if (this.showWidthRes) {
        this._domElement.appendChild(this.getItemButton(this.singleStreamLabel, reso, reso, reso, i));
      } else {
        this._domElement.appendChild(this.getItemButton(this.singleStreamLabel, h + "p", reso, reso, i));
      }
    }
  },

  _buildMultiStreamDom: function (percent, availableA, availableB) {
    var w, h, d, e, b = 0;
    var reso2;
    var act_percen = percent;

    // no mutli label when no slaves
    if (availableB.length > 0) {
      this.multiLabelButton = this.getItemButton(this.multiStreamLabel, this.multiStreamLabel);
      this._domElement.appendChild(this.multiLabelButton);
    }

    for (var i = 0; i < availableA.length; i++) {
      w = availableA[i].res.w;
      h = availableA[i].res.h;
      if (availableB.length > 0) {
        if (percent * (i + 1) < act_percen) {
          d = availableB[b].res.w;
          e = availableB[b].res.h;
          reso2 = d + "x" + e;
        } else {
          act_percen = percent + act_percen;
          d = availableB[b].res.w;
          e = availableB[b].res.h;
          reso2 = d + "x" + e;
          b++;
        }
      }
      if (this.showWidthRes) {
        this._domElement.appendChild(this.getItemButton(this.multiStreamLabel, w + "x" + h, w + "x" + h, reso2, i));
      } else {
        this._domElement.appendChild(this.getItemButton(this.multiStreamLabel, h + "p", w + "x" + h, reso2, i));
      }
    }
  },

  getCurrentResType: function () {
    if (paella.player.videoContainer.isMonostream) {
      return this.singleStreamLabel;
    } else {
      return this.multiStreamLabel;
    }
  },

  getCurrentResLabel: function () {
    if (this.showWidthRes) {
      return this._currentQuality.res.w + "x" + this._currentQuality.res.h;
    } else {
      return this._currentQuality.shortLable();
    }
  },

  getItemButton: function (type, label, reso, reso2, index) {
    var elem = document.createElement('div');
    if (this._isCurrentRes(label, type)) {
      elem.className = this.getButtonItemClass(label, true);
    } else {
      elem.className = this.getButtonItemClass(label, false);
    }
    elem.id = label + '_button';
    elem.innerHTML = label;
    elem.data = {
      index: index,
      type: type,
      label: label,
      reso: reso,
      reso2: reso2,
      plugin: this
    };
    if (type !== label) {
      $(elem).click(function (event) {
        this.data.plugin.onItemClick(elem.data);
        $('.multipleQualityItem').removeClass('selected');
        $(this).addClass('selected');
      });
    }
    return elem;
  },

 onItemClick: function(data) {
    var self = this;
    paella.player.controls.hidePopUp(self.getName());
    paella.player.videoContainer.masterVideo().getVideoData().then(function(videoData) {
      if (typeof paella.plugins.presentationOnlyPlugin !== "undefined") {
        paella.plugins.presentationOnlyPlugin.checkEnabled(function(isEnabled) {
          if (isEnabled) {
            self.turnOffVisibility();
            paella.plugins.presentationOnlyPlugin.toggleResolution(data);
          } else {
            paella.pluginManager.doResize = false;
            self._addMasterReloadListener(videoData);
            paella.player.videoContainer.setQuality(data.index).then(function() {
              self.setQualityLabel();
              paella.pluginManager.doResize = true;
            });
          }
        });
      } else {
        paella.player.videoContainer.setQuality(data.index).then(function() {
          self.setQualityLabel();
        });
      }
    });

    var arr = self._domElement.children;
    for (var i = 0; i < arr.length; i++) {
      arr[i].className = self.getButtonItemClass(i, false);
    }
    this._setResCookie(data.index);
  },
  // paella5 style
  setQualityLabel: function () {
    var This = this;
    paella.player.videoContainer.getCurrentQuality().then(function (q) {
      This.setText(q.shortLabel());
      This.currentLabel = q.shortLabel();
      This._currentQuality = q;
    });
  },

  getButtonItemClass: function (profileName, selected) {
    return 'multipleQualityItemDce ' + profileName + ((selected) ? ' selected': '');
  },

  turnOffVisibility: function () {
    paella.PaellaPlayer.mode.none = 'none';
    this.config.visibleOn =[paella.PaellaPlayer.mode.none];
    this.hideUI();
  },

  turnOnVisibility: function () {
    this.config.visibleOn = undefined;
    this.checkVisibility();
    this.setQualityLabel();
  },

  _isCurrentRes: function (label, type) {
    var currentResLabel = this.getCurrentResLabel();
    var currentResType = this.getCurrentResType();
    console.log("DCE-DEBUG - label:" + label + ", curLabel:" + currentResLabel + " type:" + type + ", curreType:" + currentResType);
    if (label === currentResLabel && type === currentResType) {
      return true;
    } else {
      return false;
    }
  },

  _isFiltered: function () {
    var track1Data = paella.opencast._episode.mediapackage.media.track[0];
    if (track1Data && track1Data.tags && track1Data.tags.tag && ! track1Data.tags.tag.contains(this._presenterHasAudioTag)) {
      base.log.debug("Not providing the presentation-only view because media is not tagged with " + this._presenterHasAudioTag);
      return true;
    }
    return false;
  },

  // Unfreeze the frozen quality res changed videos with a seek event
  _addMasterReloadListener: function(state) {
    base.log.debug("PO: about to bind master reload 'emptied' event");
    var video1node = paella.player.videoContainer.masterVideo();
    $(video1node.video).bind('emptied', function(evt) {
      base.log.debug("PO: on event 'emptied', doing seekToTime to unfreeze master ");
      paella.player.videoContainer.seekToTime(state.currentTime);
      $(this).unbind('emptied');
    });
    // needed for Safari
    $(video1node.video).bind('canplay canplaythrough', function(evt) {
      if (!paella.pluginManager.doResize) {
        base.log.debug("PO: on event " + evt.type + ", doing seekToTime to unfreeze master");
        paella.player.videoContainer.seekToTime(state.currentTime);
      }
      $(this).unbind('canplay canplaythrough');
    });
  },

  _setResCookie: function(index) {
    var resCookie;
    if (index == this.availableMasters.length -1 ){
      resCookie = 'high';
    } else  if (index == 0) {
      resCookie = 'low';
    } else {
      resCookie = 'medium';
    }
    base.cookies.set("lastResolution", resCookie);
  }

});

paella.plugins.singleMultipleQualitiesPlugin = new paella.plugins.SingleMultipleQualitiesPlugin();