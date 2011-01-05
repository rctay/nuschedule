//http://localhost:8888/timetable/readModule.php?url=http://localhost:8888/timetable/m/cs2100.htm
var Ripper = (function($) {

/**
 * Invisible stuff
 */

var MAX_RIP_INDEX = 12;
var LESSON_TIME_RE = /(\w+)\s+From\s+(\d+)\s+hrs\s+to\s+(\d+)\s+hrs\s+in\s+(.+),/;

var convertDay = (function() {
	// the day->number mapping - "cached"
	var MAPPING = {
		'MONDAY':	1,
		'TUESDAY':	2,
		'WEDNESDAY':	3,
		'THURSDAY':	4,
		'FRIDAY':	5,
		'SATURDAY':	6,
		'SUNDAY':	7
	};
	// return a closure - this is the actual function that will be exposed.
	return function(str) {
		return MAPPING[str];
	};
})();
var get_module_url = (function() {
	// returns a string "key1=val1&key2=val2&..."
	var url_params = function(obj) {
		var ret = [];
		for (var i in obj) {
			ret.push(i+"="+obj[i]);
		}
		return ret.join("&");
	};
	return function(year, semester, code) {
		//url pattern:
		//https://sit.aces01.nus.edu.sg/cors/jsp/report/ModuleDetailedInfo.jsp?acad_y=2007/2008&sem_c=2&mod_c=AR9999
		return 'https://aces01.nus.edu.sg/cors/jsp/report/ModuleDetailedInfo.jsp?'
			+ url_params({
				acad_y: year,
				sem_c: semester,
				mod_c: code
			});
	};
})();

var select_module_boxes = function() {
	return $("input.module_code_box");
};

var RipJobs = function() {
	(function(q) {
	NUSchedule.signals.register("on_module_rip_success", function(index) {
		q.finish_job(index, true);
	});
	NUSchedule.signals.register("on_module_rip_error", function(index) {
		q.finish_job(index, false);
	});
	})(this);

	this.reset();
};

RipJobs.prototype.reset = function() {
	this.to_rip = [];
	this.ripped = [];
	this.ripped_bad = [];
	this.job = null;
};

RipJobs.prototype.add_job = function(index, code) {
	this.to_rip.push({index: index, code: code});
};

RipJobs.prototype.next = function() {
	if (!this.to_rip.length) { return null; }

	var job = this.to_rip[0];
	this.job = job;
	return job;
};

RipJobs.prototype._append = function(q, items) {
	var args = [q.length, 0];
	args = args.concat(items);
	q.splice.apply(q, args);
};

RipJobs.prototype.finish_job = function(index, is_success) {
	var i = this.to_rip.length;
	while (i--) {
		if (this.to_rip[i]["index"] == index) {
			this._append((is_success ? this.ripped : this.ripped_bad), this.to_rip.splice(i, 1));
			return true;
		}
	}
	return false;
};

RipJobs.prototype.has_job = function() {
	return this.to_rip.length > 0;
};

RipJobs.prototype.has_errors = function() {
	return this.ripped_bad.length > 0;
};

/**
 * The class definition
 */
var ret = function() {
	this.url = '';
	this.sPage = '';
	this.auto_start = false;
	this.job_queue = new RipJobs();
};

ret.prototype.testApplication = function() {
	if (! this.auto_start) this.start();
	this.auto_start = true;
};

ret.prototype._start = function() {

	//checking if one of them is not blank
	var proceed = false;
	select_module_boxes().each(function() {
		if ($(this).val() != '') {
			proceed = true;
			return false;
		}
	});
	if (proceed) {
		$('#ripButton')
		.val('Waiting...')
		.attr("disabled", true);

		$(".button#re-rip-errors_button").hide();
		$('#nextButton').hide();

		//start ripping.
		this.rip();
	}
};

ret.prototype.rip_all = function() {
	this.job_queue.reset();;

	tt.module = new Array();

	(function(ripper) {
	select_module_boxes().each(function(i) {
		var v = $(this).val();
		if (v != '') {
			ripper.job_queue.add_job(i + 1, v);
		}
	});
	})(this);

	this._start();
};

ret.prototype.rip_errorneous = function() {
	if (!this.job_queue.has_errors()) {
		// we ripped everything - that is, assuming no module codes changes
		throw new Error("no errorneous modules to rip");
	}
	this.job_queue.to_rip = this.job_queue.ripped_bad.splice(0);
	this._start();
};

/*
 * Sends a GET request to a module info url.
 *
 * Available externally for testing purposes.
 */
ret.prototype._send_request = function(url) {
	this.url = url;

	$.ajax(
	(function(_ripper, index) {
	return {
		// default, but be explicit
		type: "GET",
		url: _ripper.url,
		error: function() {
			NUSchedule.signals.send("on_module_rip_error", index);
		},
		success: function(data) {
			if (data && data.indexOf("<strong>Module Information</strong>") != -1) {
				_ripper.getModule($(data));
				NUSchedule.signals.send("on_module_rip_success", index);
			} else {
				NUSchedule.signals.send("on_module_rip_error", index);
			}
			_ripper.ripNext();
		}
	};
	})(this, this.job_queue.job.index));
};

ret.prototype.rip = function() {
	// rip_index is 1-based
	var job = this.job_queue.next();
	if (!job || !job.code) {
		this.ripNext();
		return;
	}

	var code = job.code.toUpperCase();
	var ay = $('#ay').val();
	var semester = $('#semester').val();

	//if (!debug) {
	/*} else {
		var url = 'http://localhost:8888/timetable/m/';
		url += code + '.htm';
	}*/

	//give ripper's url to current url
	NUSchedule.signals.send("on_module_rip_start", job.index);
	this._send_request(get_module_url(ay, semester, code));
};

ret.prototype.getModule = function ($page) {
	/** All regex into XPath / jQuery selectors **/
	/** Benchmark speed? **/
	// var $moduleInfoTable = $("table:first>tbody>tr:eq(1)>td>table>tbody>tr:eq(2)>td>table>tbody", this.$page);
	var $moduleInfoTable = $("table.tableframe:eq(0)", $page);

	//ripping module code
	var moduleCode =
	$("tr:eq(1)>td:eq(1)", $moduleInfoTable).text().trim();
	var url = this.url;

	//exam day
	//	var examDate = 'No exam'; // Now it's just "No Exam Date."
	var examDate =
		$("tr:eq(5)>td:eq(1)", $moduleInfoTable).text().trim().replace(/\s+(A|P)M$/, "");

	//ripping lecture, tutorial and laboratory.
	var arrLecture = this.ripLecture($page);
	var arrTutorial = new Array();
	var arrLaboratory = new Array();
	var arrTutLab = this.ripTutorial($page);

	for (var i = 0; i < arrTutLab.length; i++) {
		if (arrTutLab[i].type == 'lab') arrLaboratory.push(arrTutLab[i]);
		if (arrTutLab[i].type == 'tut') arrTutorial.push(arrTutLab[i]);
	}

	//generating new module object
	var oModule = new Module();
	oModule.code = moduleCode;
	oModule.link = url;
	oModule.exam = examDate;
	oModule.lecture = arrLecture;
	oModule.laboratory = arrLaboratory;
	oModule.tutorial = arrTutorial;

	tt.module.push(oModule);
};

ret.prototype.ripLecture = function($page) {

	var $lectureTable = $("table.tableframe:eq(0) ~ table:eq(0)", $page);

	var arrLecture = new Array();

	// if (! /No Lecture Class/.test(this.sPage)) { //has lecture
		//ripping all the lectures
		$("table", $lectureTable).each(function() {
			var sBlock = $("td", this).html();

			//splitting the arrblock, to get separated piece of data
			var arrBlock = sBlock.split('<br>');
			var title = arrBlock[0].trim().substring(3);

			//session manipulation
			var nSession = Math.floor(arrBlock.length/2)-1;
			var arrSession = new Array();

			var phrase1, phrase2, arrCell;
			var res, day, start, end, place;
			var type;

			for (var i = 0; i < nSession; i++) {
				phrase1 = arrBlock[i * 2 + 1];
				phrase2 = arrBlock[i * 2 + 2];
				arrCell = new Array();

				res = LESSON_TIME_RE.exec(phrase1);
				day = convertDay(res[1]);
				start = parseInt(res[2]);
				end = parseInt(res[3]);
				place = res[4];

				// test if number is half hour
				if ((start) % 100 != 0) {
					start = start - 30;
				}
				if ((end) % 100 != 0) {
					end = end + 30;
				}

				type = phrase2.indexOf("EVEN") != -1 ? 2 :
					phrase2.indexOf("ODD") != -1 ? 1 : 0;

				//pushing cells that this session will occupy
				for (var t = start; t < end; t += 100) {
					arrCell.push('w' + day + 't' + t);
				}

				//creating the particular session object, and push into the lecture.
				arrSession.push(
					new Session(day,start,end,type,place,arrCell));
			}//end of session manipulation

			//insert new lecture
			arrLecture.push(new Part(title, 'lec', arrSession));
		});

	// }//end if

	return arrLecture;
};

ret.prototype.ripTutorial = function($page) {

	var $tutorialTable = $("table.tableframe:eq(0) ~ table:eq(1)", $page);

	var arrTutorial = new Array();

	// if (! /No Tutorial Class/.test(this.sPage)) { //has tutorial
		//ripping all the tutorials
		$("table", $tutorialTable).each(function() {
			var sBlock = $("td", this).html();

			//splitting the arrblock, to get separated piece of data
			var arrBlock = sBlock.split('<br>');
			var title = arrBlock[0].trim().substring(3);

			//tutorial type
			var tutType = title.indexOf("LABORATORY") != -1 ? 'lab' : 'tut';

			//session manipulation
			var nSession = Math.floor(arrBlock.length/2)-1;
			var arrSession = new Array();

			var phrase1, phrase2, arrCell;
			var res, day, start, end, place;
			var type;

			for (var i = 0; i < nSession; i++) {
				phrase1 = arrBlock[i * 2 + 1];
				phrase2 = arrBlock[i * 2 + 2];
				arrCell = new Array();

				res = LESSON_TIME_RE.exec(phrase1);
				day = convertDay(res[1]);
				start = parseInt(res[2]);
				end = parseInt(res[3]);
				place = res[4];

				type = phrase2.indexOf("EVEN") != -1 ? 2 :
					phrase2.indexOf("ODD") != -1 ? 1 : 0;

				//pushing cells that this session will occupy
				for (var t = start; t < end; t += 100) {
					arrCell.push('w' + day + 't' + t);
				}

				//creating the particular session object, and push into the tutorial
				arrSession.push(
					new Session(day,start,end,type,place,arrCell));
			}//end of session manipulation

			//insert new tutorial
			arrTutorial.push(new Part(title, tutType, arrSession));
		});

	// }//end if

	return arrTutorial;
};

ret.prototype.ripNext = function() {
	if (this.job_queue.has_job()) {
		this.rip();
	} else {
		this.rip_finish();
	}
};

ret.prototype.rip_finish = function() {
	$('#ripButton')
	.val('Re-Scan All')
	.attr("disabled", false);

	if (!this.job_queue.ripped.length) { return; }

	if (this.job_queue.has_errors()) {
		$(".button#re-rip-errors_button").show();
	}

	if (tt.module.length) {
		//show NEXT button if module>0
		$("#nextButton").show();
	}

	if (this.auto_start) {
		this.display_timetable();
		setTimeout("alert('Here you are. Happy testing! :)')", 900);
	}
};

ret.prototype.display_timetable = function() {
	tt.createTable();
	tt.createAllNode();
	st.showSetFunctions();
	showPage3();
};

// expose MAX_RIP_INDEX
ret.MAX_RIP_INDEX = MAX_RIP_INDEX;
return ret;
})($);
