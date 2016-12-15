// MATT-2192 Safari version 10.0.1 control bar disappears after exiting full. This is temp fix (bug was submitted via Apple developer)
Class ("paella.plugins.safari10ExitFullScreenControlBarMagicFix", paella.EventDrivenPlugin, {

	getName:function() { return "edu.harvard.dce.safari10ExitFullScreenControlBarMagicFix"; },
	getEvents:function() { return [paella.events.exitFullscreen]; },
	onEvent:function(eventType,params) {
	    this.magicFix();
	},

	checkEnabled: function(onSuccess) {
		// Only for Safari
		if (base.userAgent.browser.Safari) {
			onSuccess(true);
		} else {
			onSuccess(false);
		}
	},

	magicFix: function(){
		if ($("#playerContainer_controls").length == 0) return;
		var self = this;
		var randomSmallMaxHeight = "6px";
		var safariMagicDelayInMs = 1000;
		var maxHeightOrig = $("#playerContainer_controls").css("max-height");
		$("#playerContainer_controls").css({"max-height": randomSmallMaxHeight});
		// Do the magic pause!
		setTimeout(function() { self.resetMaxHeight(maxHeightOrig); }, safariMagicDelayInMs);
	},

	resetMaxHeight: function(maxHeightOrig) {
		$("#playerContainer_controls").css({"max-height": maxHeightOrig });
	}
});

new paella.plugins.safari10ExitFullScreenControlBarMagicFix();