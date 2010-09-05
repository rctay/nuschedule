function Module() {
	this.code = '';
	this.link = '';
	this.exam = '';
	this.lectures = new Lecture_List();
	this.tutorial = new Array();
	this.laboratory = new Array();
};

Module.prototype.hasLecture = function() {
	return (this.lecture.length > 0);
};

Module.prototype.hasTutorial = function() {
	return (this.tutorial.length > 0);
};

Module.prototype.hasLaboratory = function() {
	return (this.laboratory.length > 0);
};

function Session(iDay, iStart, iEnd, iType, sPlace, arrCellId) {
	this.day = parseInt(iDay);
	this.start = parseInt(iStart);
	this.end = parseInt(iEnd);
	this.type = parseInt(iType);
	this.place = sPlace;
	this.cell = arrCellId;
};

function Part(title, type, arrSession) {
	this.title = title;
	this.type = type;
	this.session = arrSession;
};

var Lecture_List = (function($) {
	var ret = function() {
		this.parts = [];
	};
	ret.prototype.add_part = function(title, sessions) {
		this.parts.push(new Part(title, 'lec', sessions));
	};
	ret.prototype.foreach_part = function(func) {
		var i = this.parts.length;
		while (i--) {
			func(i, this.parts[i]);
		}
	};
	return ret;
})($);
