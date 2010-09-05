BUILD_DIR = build

# list of repos-branches - each repo corresponds to a branch
REPOS = $(BUILD_DIR)/src \
	$(BUILD_DIR)/pages
BRANCHES = rc/master \
	gh-pages
# for faking named arrays
LEN = $(words $(REPOS))

SRC_DIR = $(word 1, $(REPOS))/js
DIST_DIR = $(word 2, $(REPOS))/js

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

all: $(DIST_MIN_FILE)

init:
	@echo -n ""; \
	# copy Makefile variables into shell, and put them into a list \
	REPOS=( $(REPOS) ); \
	BRANCHES=( $(BRANCHES) ); \
	CURR_DIR=$$(pwd); \
	for (( i = 0; i < $${#REPOS[*]}; i++ )); do \
		repo=$${REPOS[$$i]}; \
		branch=$${BRANCHES[$$i]}; \
		cd $$CURR_DIR; \
		test -d $$repo || { \
			echo "Setting up $$repo with $$branch..."; \
			git clone -s -b $$branch . $$repo > /dev/null \
				|| exit $$?; \
		} && { \
			echo "Updating $$repo/$$branch"; \
			cd $$repo && \
			git pull > /dev/null \
				|| exit $$?; \
		}; \
	done

$(SRC_FILES): init

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(DIST_FILE): $(DIST_DIR) $(SRC_FILES)
	@echo "Combining source files"
	@cat $(SRC_FILES) > $(DIST_FILE)

$(DIST_MIN_FILE): $(DIST_FILE)
	@echo "Building $(DIST_MIN_FILE)"
	$(DO_MIN) --js $(DIST_FILE) > $(DIST_MIN_FILE)
	@echo -n ""; \
	CURR_DIR=$$(pwd); \
	FILE=$(subst $(DIST_DIR)/,,$(DIST_MIN_FILE)); \
	{ \
		cd $(DIST_DIR) && { \
			git ls-files -m | grep -F $$FILE > /dev/null; \
		} \
		&& git add $$FILE \
		&& git commit -m "update minified source" -q \
		&& git push -q \
			|| exit $$?; \
	}; \
	cd $$CURR_DIR;
