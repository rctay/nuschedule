var NUSchedule = NUSchedule || {};
NUSchedule.signals = NUSchedule.signals || {};

NUSchedule.signals.register = function(signal, listener) {
	var f = function() {
		listener.apply(
			// set the listener's context to be us, the wrapper
			f,
			// remove the first element, an event object
			Array.prototype.slice.call(arguments, 1));
	};
	$(document).bind(signal, f);
	return f;
};

NUSchedule.signals.remove = function(signal, wrapper) {
	$(document).unbind(signal, wrapper);
};

NUSchedule.signals.remove_all = function(signal) {
	$(document).unbind(signal);
};

NUSchedule.signals.send = function(signal, args) {
	$(document).trigger(signal, args);
};
