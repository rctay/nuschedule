var prepare_test_cs1101s = function() {
	// if the module was ripped correctly, then it will be appended and thus available at pos
	var pos = tt.module.length;
	QUnit.stop(10000);
	NUSchedule.signals.register("on_module_rip_success", function() {
		NUSchedule.signals.remove("on_module_rip_success", this);
		QUnit.start();
		QUnit.ok(true, "fetched module info");

		var module = tt.module[pos];
		QUnit.equals(module.code, "CS1101S", "check module code");
		QUnit.equals(module.exam, "29-11-2010", "check exam date");
		QUnit.equals(module.lecture.length, 1, "check lecture group count");

		var lecture = module.lecture[0];
		QUnit.ok(lecture, "retrieve lecture session");
		QUnit.equals(lecture.type, "lec", "check Part type");
		QUnit.equals(lecture.session.length, 2, "check lecture session count");

		var _check_session = function(idx, expected) {
			var session = lecture.session[idx];
			QUnit.same(
				[session.day, session.start, session.end, session.type, session.place],
				expected,
				"check lecture session "+(idx+1));
		}

		_check_session(0, [3, 1000, 1200, 0, "LT15"]);
		_check_session(1, [5, 1100, 1200, 0, "LT15"]);
	});
};

QUnit.test("test ripping with CS1101S (Sem 1, 2010/2011) (cached)", function() {
	prepare_test_cs1101s();
	ripper._send_request("data/2010-11-01-cs1101s.html");
});

QUnit.test("test ripping with CS1101S (Sem 1, 2010/2011) (live)", function() {
	prepare_test_cs1101s();

	/*
	 * create and populate input elements used by ripper.
	 *
	 * note that these are not intended to be exact replicas of the input
	 * elements used in the main interface; we only need to have data
	 * available.
	 */
	$("body")
	.append($('<input type="text" id="code1">').val("cs1101s").hide())
	.append($('<input type="text" id="ay">').val("2010/2011").hide())
	.append($('<input type="text" id="semester">').val("1").hide());

	equals($("#code1").val(), "cs1101s", "check input construction");

	ripper.rip_index = 1;
	ripper.rip();
});
