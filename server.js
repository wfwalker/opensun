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

server.get('/forecast', function (request, response) {
	console.log('forecast');

	forecast.get(37.41766794184146, -122.1377402251622, function (err, res, data) {
		if (err) throw err;
		response.setHeader('Content-Type', 'application/json');
		response.send(data);
	});
});

// start server

server.listen(8083, function () {
  console.log('shotclock server listening on port 8083!');
});

