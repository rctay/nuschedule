QUnit.test("test ripping with CS1101S (Sem 1, 2010/2011) (cached)", function() {
	// if the module was ripped correctly, then it will be appended and thus available at pos
	var pos = tt.module.length;
	ripper._send_request("data/2010-11-01-cs1101s.html");
	QUnit.stop(1000);
	NUSchedule.signals.register("on_module_rip_success", function() {
		QUnit.start();
		var module = tt.module[pos];
		QUnit.equals("CS1101S", module.code, "fetched module info (cached)");
	});
});
