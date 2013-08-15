var once = require('once');
var noop = function() {};

var patch = function(stream, onend) { // patch 0.8 stream since they dont emit finish
	var end = stream.end;
	stream.end = function() {
		onend();
		end.apply(this, arguments);
	};
};

var destroyer = function(stream, callback) {
	var ended = false;
	var closed = false;
	var destroyed = false;

	callback = once(callback);

	var onend = function() {
		ended = true;
		callback();
	};

	var onclose = function() {
		closed = true;
		if (ended || (stream._readableState && stream._readableState.ended)) return;
		callback(new Error('stream closed'));
	};

	stream.on('error', callback);
	stream.on('close', onclose);
	stream.on('finish', onend);
	stream.on('end', onend);

	var destroy = function() {
		if (ended || closed || destroyed || !stream.destroy) return;
		destroyed = true;
		stream.destroy();
	};

	if (!stream._writableState && stream.writable) patch(stream, onend);

	return destroy;
};

var call = function(fn) {
	fn();
};

var pipe = function(from, to) {
	return from.pipe(to);
};

var pump = function() {
	var streams = Array.prototype.slice.call(arguments);
	var callback = typeof streams[streams.length-1] === 'function' ? streams.pop() : noop;

	if (Array.isArray(streams[0])) streams = streams[0];

	var destroys = streams.map(function(stream, i) {
		return destroyer(stream, function(err) {
			if (err) destroys.forEach(call);
			if (i < streams.length-1) return;
			destroys.forEach(call);
			callback(err);
		});
	});

	return streams.reduce(pipe);
};

module.exports = pump;