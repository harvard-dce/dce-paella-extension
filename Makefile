test:
	node tests/heartbeat-sender-tests.js
	node tests/timedComments-TAPE-test.js
	node tests/iFrameApiAppraiser-tests.js

pushall:
	git push origin master && npm publish

