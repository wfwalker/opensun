// proxy for forecast.io, an excellent service and API that doesn't provide CORS headers :-(

var express = require('express');
var Forecast = require('forecast.io');

var forecastOptions = {
  APIKey: process.env.FORECAST_API_KEY
};

var forecast = new Forecast(forecastOptions);

var server = express();

// configure server

server.use('/', express.static('dist'));

server.get('/forecast/:lat,:long', function (request, response) {
	console.log('forecast', request.params.lat, request.params.long);

	if (request.params.lat == 'undefined') return;
	if (request.params.long == 'undefined') return;

	forecast.get(request.params.lat, request.params.long, function (err, res, data) {
		if (err) {
			console.log('cannot get weather', err);
			response.status(500).send('Cannot get weather ' + err);
		} else {
			console.log('got weather', data.currently);
			response.setHeader('Content-Type', 'application/json');
			response.send(data);
		}
	});
});

// start server

server.listen(process.env.PORT || 8083, function () {
  console.log('shotclock server listening', process.env.PORT || 8083);
});

