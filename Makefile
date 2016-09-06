test:
	node tests/heartbeat-sender-tests.js
	node tests/timedComments-TAPE-test.js

pushall:
	git push origin master && npm publish

copy-vendor-extensions-to-paella:
	mkdir -p $(PAELLA-DIR)/vendor && \
	cp -r vendor/* $(PAELLA-DIR)/vendor

copy-resources-to-paella:
	mkdir -p $(PAELLA-DIR)/resources && \
	cp -r resources/* $(PAELLA-DIR)/resources

copy-test-repository-to-paella:
	mkdir -p $(PAELLA-DIR)/repository_test/repository && \
	cp -r  repository_test/repository/* $(PAELLA-DIR)/repository_test/repository

copy-to-paella: copy-vendor-extensions-to-paella copy-resources-to-paella \
	copy-test-repository-to-paella
