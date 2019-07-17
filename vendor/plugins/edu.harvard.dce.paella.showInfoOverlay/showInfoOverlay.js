// #DCE MATT-2548 v0.5 Overlay on player start that 
// shows where all (currently active) nav buttons are in one
// overlay. Overlay images can be clicked/hovered to
// provide more details about each nav button.
// Includes option to omit the overlay on future page loads (via cookie)
"use strict";
Class ("paella.plugins.ShowInfoOverlay", paella.DeferredLoadPlugin, {
  omitOverayCookie: "hudce-omitInfoOverlay",
  omitOverlayId: "infoOverlay-stopOverlay",
  overlayContainerId: "infoOverlay-container",
  overlayContainer: null,
  overlayInfoButtons: [],
  firstLoad: true,
  cookieValue: null,
  isActive: false,
  didPause: false,
  type: 'vod', // Video On Demand as default overlay type, 'live' is the other option
  getName: function () {
    return "edu.harvard.dce.paella.showInfoOverlay";
  },
  // The plugin is loaded by the plugin manager
  load: function () {
    var self = this;
    // The user has to omit for live and vod separately
    // The user will get overlay both times (more active buttons during a vod)
    self.type = paella.player.isLiveStream() ? "live": "vod";
    // Omit showing overlay if the omit cookie is set.
    self.cookieValue = base.cookies.get(self.getCookieName());
    if (! self.cookieValue) {
      self.doShow();
    }
  },
  // 
  doShow: function () {
    var self = this;
    // only show overlay once per page load!
    if (! self.firstLoad) return;
    self.firstLoad = false;
    self.type = paella.player.isLiveStream() ? "live": "vod";
    self.cookieValue = base.cookies.get(self.getCookieName());
    if (! self.cookieValue) {
      self.buildAndDisplayOverlay();
      // Note: Live streams can not be paused
      if (self.type == "vod") {
        paella.events.trigger(paella.events.pause);
      }
    }
  },
  getCookieName: function () {
    return this.omitOverlayCookie + "-" + this.type;
  },

  buildAndDisplayOverlay: function () {
    var self = this;
    // TODO: Build the overlay container... use or discard these constructors
    var containerElem = document.createElement('div');
    containerElem.id = self.showInfoContainerId;
    var titleElem = document.createElement('div');
    titleElem.id = this.showInfoTitleId;
    titleElem.innerHTML = "PLAYER INFORMATION";
    var showOverlayElem = document.createElement('div');
    showOverlayElem.id = this.omitOverlayId;
    // These let the user omit the overlay from showing again
    $('<input />', {
      type: 'checkbox', id: 'cb-' + this.omitOverlayId, value: 'cb-' + this.omitOverlayId, checked: "checked"
    }).appendTo(showOverlayElem);
    $('<label />', {
      'for': 'cb-' + this.omitOverlayId, text: "Remind me again next time"
    }).appendTo(showOverlayElem);

    // TODO: Build the container contents... use or discard these constructors
    containerElem.appendChild(showOverlayElem);
    containerElem.appendChild(titleElem);
    containerElem.appendChild(arrowElem);
    self.overlayContainer = containerElem;
    self.createCloseButton();
    // TODO:  query the plugin manager to find active player control buttons.
    // Query the button plugins directly to get button details.

    paella.player.paused().then(function (isPausedFirst) {
      // The isPaused is not reliable in the inital round of player load. Waiting a second cycle...
      paella.player.paused().then(function (isPaused) {
        if (! isPaused) {
          paella.player.pause();
          self.didPause = true;
        }
        self.isActive = true;
        // TODO: Safe to make overlay container visible now
        //  ...
        // Adding event to dismiss overlay if user tries to play video.
        paella.events.bind(paella.events.play, function (event, params) {
          if (self.isActive) {
            self.onClose(self);
          }
        });
      });
    });
  },
  // Add a visual close button for Overlay
  createCloseButton: function () {
    if (this.overlayContainer) {
      var thisClass = this;
      var closeButton = document.createElement('div');
      this.overlayContainer.appendChild(closeButton);
      closeButton.className = 'paella_overlayContainer_closeButton';
      $(closeButton).click(function (event) {
        thisClass.onClose(thisClass);
      });
    }
  },
  // When dismissing the overlay
  // - Set an omit cookie if user does not want to see overlay again.
  // - Take the player out of paused if it was playing before overlay.
  onClose: function (self) {
    if (self.isActive) {
      self.isActive = false;
      if (! $('#cb-' + self.omitOverlayId).is(':checked')) {
        base.cookies.set(self.getCookieName(), true);
      }
      if (self.didPause) {
        paella.player.play();
        self.didPause = false;
      }
      // If needed..
      $(self.overlayContainer).remove();
    }
  }

});
paella.plugins.showInfoOverlay = new paella.plugins.ShowInfoOverlay();
