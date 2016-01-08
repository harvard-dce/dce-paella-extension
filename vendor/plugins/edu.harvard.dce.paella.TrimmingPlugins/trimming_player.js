// #DCE MATT-1828, modified es.upv.paella.trimmingPlayerPlugin
// to enable getting start and stop from the location args in addition to trimming
Class ("paella.plugins.TrimmingLoaderPlugin",paella.EventDrivenPlugin,{

	getName:function() { return "edu.harvard.dce.paella.trimmingPlayerPlugin"; },

	getEvents:function() { return [paella.events.controlBarLoaded, paella.events.showEditor, paella.events.hideEditor]; },

	onEvent:function(eventType,params) {
		switch (eventType) {
			case paella.events.controlBarLoaded:
				this.loadTrimming();
				break;
			case paella.events.showEditor:
				paella.player.videoContainer.disableTrimming();
				break;
			case paella.events.hideEditor:
				if (paella.player.config.trimming && paella.player.config.trimming.enabled) {
					paella.player.videoContainer.enableTrimming();
				}
				break;
		}
	},

	loadTrimming:function() {
		var videoId = paella.initDelegate.getId();
		paella.data.read('trimming',{id:videoId},function(data,status) {
			if (data && status && data.end>0) {
				paella.player.videoContainer.enableTrimming();
				paella.player.videoContainer.setTrimming(data.start, data.end);
			} else {
			    // #DCE MATT-1828 look for start and end trim times in location args
			    // trimming:{enabled:false,start:0,end:0}
			    var startTime =  paella.utils.parameters.get('start');
			    var endTime = paella.utils.parameters.get('end');
			    if (startTime && endTime) {
			        paella.player.videoContainer.enableTrimming();
				    paella.player.videoContainer.setTrimming(startTime, endTime);
			    }
			}
			// #end DCE
		});
	}
});

paella.plugins.trimmingLoaderPlugin = new paella.plugins.TrimmingLoaderPlugin();
