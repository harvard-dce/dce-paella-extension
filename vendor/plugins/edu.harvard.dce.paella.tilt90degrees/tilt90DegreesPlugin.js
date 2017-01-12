// Tilt the player 90 degrees when embedded an IOS device
Class ("paella.plugins.Tilt90DegressPlugin", paella.EventDrivenPlugin, {
  
  getEvents: function () {
    return[paella.events.play, paella.events.pause];
  },
  
  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "tilt90DegressPlugin";
  },
  getIndex: function () {
    return 449;
  },
  getMinWindowSize: function () {
    return 10;
  },
  getName: function () {
    return "edu.harvard.edu.paella.tilt90DegressPlugin";
  },
  getDefaultToolTip: function () {
    return base.dictionary.translate("Tilt 90 Degrees");
  },
  checkEnabled: function (onSuccess) {
    // Enable when embedded in an IOS app 
    var agent = window.navigator.userAgent.toLowerCase();
    var isSafari = /safari/.test(agent);
    var isIos = /iphone|ipod|ipad/.test(agent);
    var isStandalone = window.navigator.standalone;
    onSuccess(isIos && !isSafari && !isStandalone);
  },
  
  onEvent: function (eventType, params) {
    switch (eventType) {
      case paella.events.play:
        $('#body').addClass("tiltNinetyDegrees");
        paella.player.onresize();
        break;
      case paella.events.pause:
        $('#body').removeClass("tiltNinetyDegrees");
        paella.player.onresize();
        break;
    }
  }
});

paella.plugins.tilt90DegressPlugin = new paella.plugins.Tilt90DegressPlugin();