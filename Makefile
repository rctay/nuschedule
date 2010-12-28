BUILD_DIR = build

REPO_DIR = $(BUILD_DIR)/pages
SRC_BRANCH = rc/master
DIST_BRANCH = gh/pages

SRC_DIR = $(REPO_DIR)/js
DIST_DIR = $(REPO_DIR)/js

JAVA = java
DO_MIN = $(JAVA) -jar $(BUILD_DIR)/google-closure/compiler-20100616.jar --warning_level QUIET

BASE_FILES = $(SRC_DIR)/jquery.xdomainajax.js \
	$(SRC_DIR)/Util.js \
	$(SRC_DIR)/Signals.js \
	$(SRC_DIR)/Object.js \
	$(SRC_DIR)/Ripper.js \
	$(SRC_DIR)/TimeTable.js \
	$(SRC_DIR)/Set.js \
	$(SRC_DIR)/Main.js \
	$(SRC_DIR)/Dragger.js \

SRC_FILES = $(BASE_FILES)

DIST_FILE = $(BUILD_DIR)/src.js
DIST_MIN_FILE = $(DIST_DIR)/src.min.js
TEMP_DIST_MIN_FILE = $(BUILD_DIR)/src.min.js

all: $(DIST_MIN_FILE)

init:
	@echo -n ""; \
	if [ -d $(REPO_DIR) ]; then \
		echo "Updating $(REPO_DIR)/$(SRC_BRANCH)"; ( \
			cd $(REPO_DIR) && \
			git fetch origin \
				|| exit $$?; \
			if [ "$$(git symbolic-ref HEAD)" == "refs/heads/master" ]; then \
				test "$$(git rev-parse --verify origin/rc/master)" == "$$(git rev-parse --verify HEAD)" && \
				test -z "$$(git status --porcelain)" \
					&& exit 0; \
				git reset --hard origin/rc/master; \
			else \
				git reset --hard && \
				git checkout -B master origin/rc/master; \
			fi; \
		) \
	else \
		echo "Setting up $(REPO_DIR) with $(SRC_BRANCH)..."; \
		git clone -s -b $(SRC_BRANCH) . $(REPO_DIR) > /dev/null && \
		git branch -m master \
			|| exit $$?; \
	fi

$(SRC_FILES): init

$(DIST_DIR): init

$(DIST_FILE): $(DIST_DIR) $(SRC_FILES)
	@echo "Combining source files"
	@cat $(SRC_FILES) > $(DIST_FILE)

$(TEMP_DIST_MIN_FILE): $(DIST_FILE)
	@echo "Building $(DIST_TEMP_MIN_FILE)"
	$(DO_MIN) --js $(DIST_FILE) > $(TEMP_DIST_MIN_FILE)

$(DIST_MIN_FILE): $(TEMP_DIST_MIN_FILE)
	@echo -n ""; (\
		cd $(REPO_DIR) && \
		git rm -q $(subst $(REPO_DIR)/,,$(SRC_FILES)) && \
		git commit -m "remove un-minified files" && \
		git checkout gh-pages && \
		git merge -m "update non-js files" HEAD@{1} \
	) || exit $$?; \
	cp $(TEMP_DIST_MIN_FILE) $(DIST_MIN_FILE) && (\
		cd $(DIST_DIR) && \
		git ls-files -m | grep -F $(TEMP_DIST_MIN_FILE) > /dev/null && ( \
		  git add $(TEMP_DIST_MIN_FILE) && \
		  git commit -m "update minified source" -q  && \
		  git push origin gh-pages -q || echo "auto-commit failed!"; \
		) || echo "nothing changed"; \
	) && echo done
