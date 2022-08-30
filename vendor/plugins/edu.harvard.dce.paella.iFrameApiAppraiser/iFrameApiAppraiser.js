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
      // Events that are early bind and not part of the EventDrivenPlugin binding
      this.eventsBoundEarly = [
        paella.events.videoReady,
      ];
      // Events to pass into the message with a time value
      this.eventsToAppraiseWithTime = [
        paella.events.timeupdate,
      ];
      // Events to pass into the message
      this.eventsToAppraiseWithoutTime = [
        paella.events.play,
        paella.events.pause,
        paella.events.seeked,
        paella.events.error,
        paella.events.loadComplete,
        paella.events.ended,
        ...this.eventsBoundEarly,
      ];
      // The combination of events supported
      this.eventsToAppraise = [
        ...this.eventsToAppraiseWithTime,
        ...this.eventsToAppraiseWithoutTime
      ];
      // This bind must happen early to catch events like the videoReady
      this.eventsBoundEarly.forEach((e) => {
        paella.log.debug('IFrameApiAppraiser: early binding event ' + e);
        paella.events.bind(e, () => {
          this.sendMessageToEmbedApi(e);
        });
      });
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
      // Filter out the ones already early bound to avoid duplicate messages
      const nonEarlyBoundEvents = this.eventsToAppraise.filter(e => {!this.eventsBoundEarly.includes(e)});
      // Return events associated to the EventDrivenPlugin API
      paella.log.debug('IFrameApiAppraiser: late binding ' + nonEarlyBoundEvents);
      return nonEarlyBoundEvents;
    }

    /**
     * The handle this Paella event driven plugin
     * calls when an event fires.
     * By intention, a limited number of events
     * are passed to the wrapper in order to protect
     * the player and keep the API simple.
     * Include more events to be passed as they become relevant.
     *
     * @inheritdoc
     * @param {string} eventType - the event that was fired
     * @param {object} [params] - a set of params associated to the event
     */
    onEvent(eventType, params) {
      // Make sure the event is supported
      if (this.eventsToAppraiseWithTime.includes(eventType)) {
        this.sendMessageToEmbedApi(eventType, params.currentTime);
        return 1;
      } else if (this.eventsToAppraiseWithoutTime.includes(eventType)) {
        this.sendMessageToEmbedApi(eventType);
        return 2;
      } else {
        paella.log.debug('IFrameApiAppraiser: Unsupported event ' + eventType);
        return 3;
      }
    }

    /**
     * Helper to construct and send the event
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
