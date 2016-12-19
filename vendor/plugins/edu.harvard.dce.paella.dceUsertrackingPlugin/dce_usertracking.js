Class(
    "paella.plugins.DceUsertracking",
    paella.userTracking.SaverPlugIn,
    {
        heartbeatTimer: null,

        getName: function() {
            return "edu.harvard.dce.paella.dceUsertrackingPlugin";
        },

        setup: function() {
            var thisClass = this;

            paella.events["heartbeat"] = "dce:heartbeat"

            if (this.config.heartbeatInterval > 0) {
                thisClass.heartbeatTimer = new base.Timer(
                    registerHeartbeat, this.config.heartbeatInterval
                );
                thisClass.heartbeatTimer.repeat = true;
            }

            function registerHeartbeat(timer) {
                paella.userTracking.log(paella.events.heartbeat);
            }
        },

        checkEnabled: function(onSuccess) {
            var thisClass = this;
            paella.ajax.get({ url: thisClass.config.enabledUrl },
                function(data, contentType, returnCode) {
                    var enabled = false;
                    try {
                      enabled = JSON.parse(data.toLowerCase()) ? true : false
                    }
                    catch (e) {
                      enabled = false;
                    }
                    onSuccess(enabled);
                },
                function(data, contentType, returnCode) {
                    onSuccess(false);
                }
            );
        },

        log: function(event, params) {

            // so we can access this.config within the promise handler
            var thisClass = this;
            var videoDataPromise = paella.player.videoContainer.masterVideo().getVideoData();

            videoDataPromise.then(function(videoData) {
                var trimStart = paella.player.videoContainer.trimStart();
                var videoCurrentTime = parseInt(videoData.currentTime + trimStart, 10);
                var isPlaying = !videoData.paused || paella.player.isLiveStream();
                var opencastLog = {
                    'id': paella.player.videoIdentifier,
                    'type': undefined,
                    'in': videoCurrentTime,
                    'out': videoCurrentTime,
                    'playing': isPlaying,
                    'resource': paella.opencast.resourceId
                };

                if ('extraLogParams' in thisClass.config) {
                    var extraParams = thisClass.config.extraLogParams;
                    for (var key in extraParams) {
                        if (extraParams.hasOwnProperty(key)) {
                            opencastLog[key] = extraParams[key];
                        }
                    }
                }

                switch (event) {
                    case paella.events.play:
                        opencastLog.type = 'PLAY';
                        break;
                    case paella.events.pause:
                        opencastLog.type = 'PAUSE';
                        break;
                    case paella.events.seekTo:
                    case paella.events.seekToTime:
                        opencastLog.type = 'SEEK';
                        break;
                    case paella.events.resize:
                        opencastLog.type = "RESIZE-TO-" + params.width + "x" + params.height;
                        break;
                    case "paella:searchService:search":
                        opencastLog.type = "SEARCH-" + params;
                        break;
                    case paella.events.heartbeat:
                        opencastLog.type = "HEARTBEAT";
                        break;
                    default:
                        opencastLog.type = event;
                        opt = params;
                        if (opt != undefined) {
                            if (typeof(params) == "object") {
                                opt = JSON.stringify(params);
                            }
                            opencastLog.type = event + ';' + opt;
                        }
                        break;
                }
                opencastLog.type = opencastLog.type.substr(0, 128);
                paella.ajax[thisClass.config.requestMethod](
                    {url: thisClass.config.url, params: opencastLog}
                );
            });
        }
    }
);

paella.plugins.dceUsertracking = new paella.plugins.DceUsertracking();

