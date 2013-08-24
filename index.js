var once = require('once');
var noop = function() {};

var patch = function(stream, callback) { // patch 0.8 stream since they dont emit finish
	var end = stream.end;
	stream.end = function() {
		callback();
		end.apply(this, arguments);
	};
};

var destroyer = function(stream, reading, writing, callback) {
	callback = once(callback);

	var destroyed = false;
	var closed = false;

	var onfinish = function() {
		writing = false;
		if (!reading) callback();
	};

	stream.on('error', callback);

	stream.on('finish', onfinish);

	stream.on('end', function() {
		reading = false;
		if (!writing) callback();
	});

	stream.on('close', function() {
		closed = true;
		if (!reading && !writing) return;
		if (reading && stream._readableState && stream._readableState.ended) return;
		callback(new Error('stream closed'));
	});

	if (writing && stream.writable && !stream._writableState) patch(stream, onfinish);

	return function() {
		if (closed || destroyed || (!reading && !writing) || !stream.destroy) return;
		destroyed = true;
		stream.destroy();
	};
};

var call = function(fn) {
	fn();
};

var pipe = function(from, to) {
	return from.pipe(to);
};

var functionish = function(fn) {
	return !fn || typeof fn === 'function';
};

var pump = function() {
	var streams = Array.prototype.slice.call(arguments);
	var callback = functionish(streams[streams.length-1]) && streams.pop() || noop;

	if (Array.isArray(streams[0])) streams = streams[0];
	if (streams.length < 2) throw new Error('pump requires two streams per minimum');

	var error;
	var destroys = streams.map(function(stream, i) {
		var reading = i < streams.length-1;
		var writing = i > 0;
		return destroyer(stream, reading, writing, function(err) {
			if (!error) error = err;
			if (err) destroys.forEach(call);
			if (reading) return;
			destroys.forEach(call);
			callback(error);
		});
	});

	return streams.reduce(pipe);
};

module.exports = pump;