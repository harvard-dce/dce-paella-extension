/*
 * DCE IFrameApiHelper
 * IFrame embed API plugin used in conjunction with iFrameEmbedApi.js
 * that is imported into parent window.
 */
paella.addPlugin(function () {
  return class IFrameApiAppraiser extends paella.EventDrivenPlugin {
    constructor () {
      super();
      const self = this;
      // It has to bind early to catch the videoReady event
      paella.events.bind(paella.events.videoReady, function() {
        self.sendMessageToEmbedApi(paella.events.videoReady);
      })
    }

    getName() {
      return "edu.harvard.dce.paella.iFrameApiAppraiser";
    }

    checkEnabled (onSuccess) {
      // This iFrame prefix is used by the iFrameEmbedApi
      // When constructing the embeded player iFrame
      const iFramePrefix = 'DCE-iframe-API';
      // Enable when player is embedded, and embed iFrame has target prefix
      onSuccess(
        (window.self !== window.top)
        &&
        (window.name && window.name.startsWith(iFramePrefix))
      );
    }

    getEvents() {
      return[
        paella.events.play,
        paella.events.pause,
        paella.events.loadComplete,
        // paella.events.videoReady is bound early above
        paella.events.seeked,
        paella.events.timeupdate,
        paella.events.error,
        paella.events.ended
      ];
    }

    onEvent(eventType,params) {
      var thisClass = this;
      switch (eventType) {
        case paella.events.timeupdate:
          this.sendMessageToEmbedApi(eventType, params.currentTime);
          break;
        case paella.events.play:
        case paella.events.pause:
        case paella.events.seeked:
        case paella.events.error:
        case paella.events.videoReady:
        case paella.events.loadComplete:
        case paella.events.ended:
          this.sendMessageToEmbedApi(eventType);
          break;
        default:
          base.log.debug('IFrameApiAppraiser: Unsupported event ', eventType);
      }
      thisClass.lastEvent = eventType;
    }

    /**
     * Helper to consruct and send the event
     * @param {String} eventType, the name of the event
     * @param {String} [value=null], a value associated to the event
     */
    sendMessageToEmbedApi(eventType, value) {
      const iFrameName = window.name;
      const newMessage = {
        sender: iFrameName,  // required
        name: eventType, // required
        value: value  // Optional, could be null
      };
      // The plugin sends the above event types to all containers
      // The Host source of the embedAPI is unknown to the player
      // Player status information is low risk
      window.parent.postMessage(newMessage, '*');
    }
  }
});
