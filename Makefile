test:
	node tests/heartbeat-sender-tests.js
	node tests/timedComments-TAPE-test.js

pushall:
	git push origin master && npm publish

