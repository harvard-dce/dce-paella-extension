// DCE TopAlignVideoPlugin
// Engage this plugin via true in config AND param in URL  "...align=top"
// purpose: Video takes all top space to provide non-overlapping room for the control bar.
// MATT-1999/MATT-2001 Top aligned video required to embed player compactly in iframe without obscursing video with control bar.
// Impl Strategy: Set profile top = 0 and top align video container and video elemements to overwrite default core calculations.
Class ("paella.plugins.TopAlignMonoVideoPlugin", paella.EventDrivenPlugin, {

  getName: function () {
    return "edu.harvard.dce.paella.topAlignMonoVideoPlugin";
  },

  getEvents: function () {
    return[paella.events.setProfile, paella.events.singleVideoReady, paella.events.resize];
  },

  checkEnabled: function (onSuccess) {
    // Expect "...?...&align=top" in url
    var topAlign = paella.utils.parameters.get('align');
    onSuccess((topAlign == 'top'));
  },

  onEvent: function (eventType, params) {
    // Only top align during monostream view
    if (paella.player.videoContainer.isMonostream) {
      paella.player.videoContainer.container.domElement.style.top = "0%";
    }
  }

});

paella.plugins.topAlignMonoVideoPlugin = new paella.plugins.TopAlignMonoVideoPlugin();
