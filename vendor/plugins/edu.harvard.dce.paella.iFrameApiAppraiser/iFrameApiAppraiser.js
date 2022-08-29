/**
 * DCE IFrameApiHelper
 * This plugin passing player events to the OC-DCE iFrameEmbedApi.js.
 * When the OC-DCE iFrameEmbedApi.js is imported into a parent window,
 * it creates specially named iFrame to embed the player and which
 * this plugin passes event messages.
 * This plugin is only active if the player has been embedded
 * in that specially named iFrame.
 *
 * @author HUDCE
 */
paella.addPlugin(function () {
  return class IFrameApiAppraiser extends paella.EventDrivenPlugin {
    /**
     * @constructor
     * @augments paella.EventDrivenPlugin
     */
    constructor () {
      super();
      // This bind must happen early to catch the videoReady event
      paella.events.bind(
        paella.events.videoReady,
        () => {
          this.sendMessageToEmbedApi(paella.events.videoReady);
        }
      );
    }

    /**
     * Get the name of the Paella plugin
     * @inheritdoc
     * @return the name of this plugin
     */
    getName() {
      return 'edu.harvard.dce.paella.iFrameApiAppraiser';
    }

    /**
     * Check if this plugin is enabled
     * @inheritdoc
     * @param {requestCallback} onSuccess - The callback that handles response
     */
    checkEnabled (onSuccess) {
      // This iFrame prefix is used by the iFrameEmbedApi
      // When constructing the embedded player iFrame
      const iFramePrefix = 'DCE-iframe-API';
      // Enable when player is embedded, and embed iFrame has target prefix
      onSuccess(
        (window.self !== window.top)
        && (window.name && window.name.startsWith(iFramePrefix))
      );
    }

    /**
     * Get the events that this Paella event driven plugin uses
     * @inheritdoc
     * @return an array of events
     */
    getEvents() {
      return [
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

    /**
     * The handle this Paella event driven plugin
     * calls when an event fires.
     * By intention, a limited number of events
     * are passed to the wrapper in order to protect
     * the playerand keep the API simple.
     * Inlude more events to be passed as they become relevant.
     *
     * @inheritdoc
     * @param {string} eventType - the event that was fired
     * @param {object} [params] - a set of params associated to the event
     */
    onEvent(eventType, params) {
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
          paella.log.debug('IFrameApiAppraiser: Unsupported event ', eventType);
      }
      this.lastEvent = eventType;
    }

    /**
     * Helper to consruct and send the event
     * @param {string} eventType - the name of the event
     * @param {string} [value] - a value associated to the event
     */
    sendMessageToEmbedApi(eventType, value) {
      const iFrameName = window.name;
      const newMessage = {
        sender: iFrameName, // required
        name: eventType, // required
        value, // Optional
      };
      // The plugin sends the above event types to all containers
      // The Host source of the embedAPI is unknown to the player
      // Player status information is low risk
      window.parent.postMessage(newMessage, '*');
    }
  }
});
