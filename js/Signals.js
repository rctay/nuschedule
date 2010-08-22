var NUSchedule = NUSchedule || {};
NUSchedule.signals = NUSchedule.signals || {};

NUSchedule.signals.register = function(signal, listener) {
	$(document).bind(signal, listener);
};

NUSchedule.signals.send = function(signal, args) {
	$(document).trigger(signal, args);
};
