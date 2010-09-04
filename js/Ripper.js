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

/*
 * For each #code<n> field, call 'func' with
 *
 *  - the current count (n), and
 *  - the field passed to it (as a jQuery object).
 *
 * Iteration is stopped when 'func' returns true.
 */
var _foreach_module_field = function(func) {
	for (var i = 1; i <= MAX_RIP_INDEX; i++) {
		if (func(i, $('#code' + i))) {
			break;
		}
	}
};

/**
 * The class definition
 */
var ret = function() {
	this.url = '';
	this.sPage = '';
	this.auto_start = false;
};

ret.prototype.testApplication = function() {
	if (! this.auto_start) this.start();
	this.auto_start = true;
};

ret.prototype.start = function() {

	//checking if one of them is not blank
	var proceed = false;
	_foreach_module_field(function(i, field) {
		if (field.val() != '') {
			return proceed = true;
		}
	});
	if (proceed) {
		$('#ripButton').val('Waiting...').mouseup(function() { return false; });
		$('#nextButton').hide();
		_foreach_module_field(function(i, field) {
			if (field.val() != '') {
				NUSchedule.signals.send("on_module_rip_start", i);
			}
		});

		//start ripping.
		this.rip_index = 1;
		tt.module = new Array();
		this.rip();
	}
};

/*
 * Sends a GET request to a module info url.
 *
 * Available externally for testing purposes.
 */
ret.prototype._send_request = function(url) {
	this.url = url;

	var _ripper = this;
	$.get(this.url, function(data) {
		if (data.indexOf("<strong>Module Information</strong>") != -1) {
			// set the sPage
			_ripper.sPage = data;
			_ripper.$page = $(data);
			_ripper.getModule();
			NUSchedule.signals.send("on_module_rip_success", _ripper.rip_index);
		} else {
			NUSchedule.signals.send("on_module_rip_error", _ripper.rip_index);
		}
		_ripper.ripNext();
	});
};

ret.prototype.rip = function() {
	var code = $('#code' + this.rip_index).val().toUpperCase();
	var ay = $('#ay').val();
	var semester = $('#semester').val();

	//if (!debug) {
	/*} else {
		var url = 'http://localhost:8888/timetable/m/';
		url += code + '.htm';
	}*/

	//give ripper's url to current url
	if (code != '') { //if not empty, do ripping
		this._send_request(get_module_url(ay, semester, code));
	} else {
		NUSchedule.signals.send("on_module_rip_blank", this.rip_index);
		this.ripNext();
	}
};

ret.prototype.getModule = function () {
	/** All regex into XPath / jQuery selectors **/
	/** Benchmark speed? **/
	// var $moduleInfoTable = $("table:first>tbody>tr:eq(1)>td>table>tbody>tr:eq(2)>td>table>tbody", this.$page);
	var $moduleInfoTable = $("table.tableframe:eq(0)", this.$page);

	//ripping module code
	var moduleCode =
	$("tr:eq(1)>td:eq(1)", $moduleInfoTable).text().trim();
	var url = this.url;

	//exam day
	//	var examDate = 'No exam'; // Now it's just "No Exam Date."
	var examDate =
		$("tr:eq(5)>td:eq(1)", $moduleInfoTable).text().trim().replace(/\s+(A|P)M$/, "");

	//generating new module object
	var oModule = new Module();

	//ripping lecture, tutorial and laboratory.
	this.ripLecture(oModule.lectures);
	var arrTutorial = new Array();
	var arrLaboratory = new Array();
	var arrTutLab = this.ripTutorial();

	for (var i = 0; i < arrTutLab.length; i++) {
		if (arrTutLab[i].type == 'lab') arrLaboratory.push(arrTutLab[i]);
		if (arrTutLab[i].type == 'tut') arrTutorial.push(arrTutLab[i]);
	}

	oModule.code = moduleCode;
	oModule.link = url;
	oModule.exam = examDate;
	oModule.laboratory = arrLaboratory;
	oModule.tutorial = arrTutorial;

	tt.module.push(oModule);
};

ret.prototype.ripLecture = function(lectures) {

	var $lectureTable = $("table.tableframe:eq(0) ~ table:eq(0)", this.$page);

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
			lectures.add_part(title, arrSession);
		});

	// }//end if
};

ret.prototype.ripTutorial = function() {

	var $tutorialTable = $("table.tableframe:eq(0) ~ table:eq(1)", this.$page);

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

	if (++this.rip_index <= MAX_RIP_INDEX) {
		this.rip();
	} else {
		$('#ripButton').val('Re-Scan All').mouseup(this.start);
		if (tt.module.length > 0) {
			//show NEXT button if module>0
			$("#nextButton").show();
		}
		if (this.auto_start) {
			tt.createTable();
			tt.createAllNode();
			st.showSetFunctions();
			showPage3();
			setTimeout("alert('Here you are. Happy testing! :)')", 900);
		}
	}

};

// expose MAX_RIP_INDEX
ret.MAX_RIP_INDEX = MAX_RIP_INDEX;
return ret;
})($);
