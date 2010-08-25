var NUSchedule = NUSchedule || {};
NUSchedule.signals = NUSchedule.signals || {};

NUSchedule.signals.register = function(signal, listener) {
	$(document).bind(signal, function() {
		// remove the first element, an event object
		listener.apply(null, Array.prototype.slice.call(arguments, 1));
	});
};

NUSchedule.signals.send = function(signal, args) {
	$(document).trigger(signal, args);
};
