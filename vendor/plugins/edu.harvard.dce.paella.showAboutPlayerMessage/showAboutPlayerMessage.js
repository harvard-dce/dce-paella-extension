// #DCE MATT-2548 overload on player load that links to About Player
// Option to omit the message on future page loads (via cookie)
"use strict";
Class ("paella.plugins.ShowAboutPlayerMessage", paella.DeferredLoadPlugin, {
  omitMessageCookie: "hudce-omitPlayerAboutMessage",
  omitMessageId: "aboutPlayer-stopMessage",
  showAboutLinkId: "aboutPlayer-aboutLink",
  showAboutTitleId: "aboutPlayer-title",
  showAboutContainerId: "aboutPlayer-container",
  firstLoad: true,
  cookieValue: null,
  isActive: false,
  didPause: false,
  messageContainer: null,
  type: 'vod', //default about help type
  getName: function () {
    return "edu.harvard.dce.paella.showAboutPlayerMessage";
  },
  load: function () {
    var self = this;
    self.type = paella.player.isLiveStream() ? "live": "vod";
    self.cookieValue = base.cookies.get(self.getCookieName());
    if (! self.cookieValue) {
      self.doShow();
    }
  },
  doShow: function () {
    var self = this;
    // only once per page load
    if (! self.firstLoad) return;
    self.firstLoad = false;
    self.type = paella.player.isLiveStream() ? "live": "vod";
    self.cookieValue = base.cookies.get(self.getCookieName());
    if (! self.cookieValue) {
      self.showAboutMessage();
      if (self.type == "vod") {
        paella.events.trigger(paella.events.pause);
      }
    }
  },
  getCookieName: function () {
    return this.omitMessageCookie + "-" + this.type;
  },
  showAboutMessage: function () {
    var self = this;
    var containerElem = document.createElement('div');
    containerElem.id = self.showAboutContainerId;
    var titleElem = document.createElement('div');
    titleElem.id = this.showAboutTitleId;
    titleElem.innerHTML = "PLAYER INFORMATION";
    var showMessageElem = document.createElement('div');
    showMessageElem.id = this.omitMessageId;
    $('<input />', {
      type: 'checkbox', id: 'cb-' + this.omitMessageId, value: 'cb-' + this.omitMessageId, checked: "checked"
    }).appendTo(showMessageElem);
    $('<label />', {
      'for': 'cb-' + this.omitMessageId, text: "Remind me again next time"
    }).appendTo(showMessageElem);
    var arrowElem = document.createElement('div');
    arrowElem.id = "aboutPlayer-arrow";
    // add elements
    containerElem.appendChild(showMessageElem);
    containerElem.appendChild(titleElem);
    containerElem.appendChild(arrowElem);
    self.messageContainer = containerElem;
    self.createCloseButton();
    paella.player.paused().then(function (isPausedFirst) {
      // The isPaused is not reliable here during startup. Waiting another second cycle...
      paella.player.paused().then(function (isPaused) {
        if (! isPaused) {
          paella.player.pause();
          self.didPause = true;
        }
        self.isActive = true;
        $(".showInfoPluginButton").trigger('click');
        $("#info-about-player").addClass("hover");
        $("#info-about-player").after(self.messageContainer);
        paella.events.bind(paella.events.play, function (event, params) {
          if (self.isActive) {
            self.onClose(self);
          }
        });
      });
    });
  },
  createCloseButton: function () {
    if (this.messageContainer) {
      var thisClass = this;
      var closeButton = document.createElement('div');
      this.messageContainer.appendChild(closeButton);
      closeButton.className = 'paella_messageContainer_closeButton';
      $(closeButton).click(function (event) {
        thisClass.onClose(thisClass);
      });
    }
  },
  onClose: function (self) {
    if (self.isActive) {
      self.isActive = false;
      if (! $('#cb-' + self.omitMessageId).is(':checked')) {
        base.cookies.set(self.getCookieName(), true);
      }
      if (self.didPause) {
        paella.player.play();
        self.didPause = false;
      }
      $(self.messageContainer).remove();
      $("#info-about-player").removeClass('hover');
      $(".showInfoPluginButton").trigger('click');
    }
  }

});
paella.plugins.showAboutPlayerMessage = new paella.plugins.ShowAboutPlayerMessage();
