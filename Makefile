test:
	@NODE_ENV=test expresso \
		$(TESTFLAGS) \
		./test.js

test-cov:
	@TESTFLAGS=--cov $(MAKE) test

.PHONY: test test-cov
