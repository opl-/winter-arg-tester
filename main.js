/** Took some inspiration from Dinnerbone's code (https://gist.github.com/Dinnerbone/fa3152176653398b312e) **/

var http = require('http');

function tryPassword(password, app, real, callback) {
	var req = http.request({
		hostname: 'store.steampowered.com',
		path: '/actions/clues?key=' + encodeURIComponent(password) + '&_=' + (new Date().getTime()),
		headers: {
			Referer: 'http://store.steampowered.com/app/' + app + '/'
		}
	}, function(res) {
		res.on('data', function(data) {
			req.response = (req.response || '') + data.toString();
		}).on('end', function() {
			if (res.statusCode !== 200) {
				console.log('[weird status] password="' + password + '", app=' + app + ', statusCode=' + res.statusCode + ', response:', req.response);
				return callback({error: 'Status code !== 200 (' + res.statusCode + '). Rate limited?', rateLimited: true}, undefined);
			}

			var result = undefined;
			try {
				result = JSON.parse(req.response);
				if (typeof(result) === 'object' && (!Array.isArray(result) || result.length > 0)) {
					if (real) {
						if (result.url) {
							console.log('[result url] password="' + password + '", app=' + app + ', url=' + result.url);
						} else if (result.response) {
							console.log('[result response] password="' + password + '", app=' + app + ', response=' + result.response);
						} else {
							console.log('[result] password="' + password + '", app=' + app + ', result=' + JSON.stringify(result));
						}
					}
					return callback(undefined, result);
				} else {
					return callback(undefined, undefined);
				}
			} catch (e) {
				console.warn('[weird response] password="' + password + '", app=' + app + ', response:', req.response);
				return callback(e, undefined);
			}
		});
	});
	req.end();
}

function ensureValid(callback) {
	tryPassword('94050999014715', 6900, false, function(err, result) {
		if (!err && result && result.response && result.response === 'ic/4f21ca7') {
			console.log('Not ratelimited.');
			return callback(true);
		} else {
			console.log('[weird response on hitman] response:', result, 'err:', err);
			return callback(false);
		}
	});
}

module.exports = {
	tryPassword: tryPassword,
	ensureValid: ensureValid
}
