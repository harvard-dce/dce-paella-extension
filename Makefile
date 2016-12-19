test:
	node tests/dce-usertracking-tests.js
	node tests/timedComments-TAPE-test.js

pushall:
	git push origin master && npm publish

