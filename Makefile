SRC_DIR = js
BUILD_DIR = build

JAVA = java
DO_MIN = $(JAVA) -jar $(BUILD_DIR)/google-closure/compiler-20100616.jar --warning_level QUIET

PREFIX = .
DIST_DIR = $(PREFIX)/dist

BASE_FILES = $(SRC_DIR)/Dragger.js \
	$(SRC_DIR)/Lesson.js \
	$(SRC_DIR)/Main.js \
	$(SRC_DIR)/Object.js \
	$(SRC_DIR)/Ripper.js \
	$(SRC_DIR)/Set.js \
	$(SRC_DIR)/Signals.js \
	$(SRC_DIR)/TimeTable.js \
	$(SRC_DIR)/Util.js \
	$(SRC_DIR)/jquery.xdomainajax.js

SRC_FILES = $(BASE_FILES)

DIST_FILE = $(DIST_DIR)/src.js
DIST_MIN_FILE = $(DIST_DIR)/src.min.js

all: $(DIST_MIN_FILE)

init:
	@echo -n "Updating source files..."
	@if [ "$$(git merge rc/master)" == "Already up-to-date." ]; then \
		echo "up to date"; \
	else \
		echo "updated"; \
	fi


$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(DIST_FILE): init $(DIST_DIR) $(SRC_FILES)
	@echo "Combining source files"
	@cat $(SRC_FILES) > $(DIST_FILE)

$(DIST_MIN_FILE): $(DIST_FILE)
	@echo "Building $(DIST_MIN_FILE)"
	$(DO_MIN) --js $(DIST_FILE) > $(DIST_MIN_FILE)
