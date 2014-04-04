
test( "test short date string", function () {
	ok("Feb 01, 2012" == sunAngleUtils.getShortDateString(new Date(2012, 1, 1)));
});

test( "test short time string", function () {
	ok("13:00" == sunAngleUtils.getShortTimeString(new Date(2012, 1, 1, 13, 0, 0)));
});


// http://www.esrl.noaa.gov/gmd/grad/solcalc/sunrise.html
// According to this NOAA service, 2012-12-21, at 37deg 46min, 122deg 25min, sunrise 7:22am sunset 4:55pm

test( "test sun altitude in SF", function () {
	var sunPosition = sunAngleUtils.getSunPositionInDegrees(-122.42, 37.77, new Date(2012, 11, 21, 7, 22, 0));
	ok( Math.abs(sunPosition.altitude) < 1.0, "altitude within 1 deg of horizion at 7:22" );

	sunPosition = sunAngleUtils.getSunPositionInDegrees(-122.42, 37.77, new Date(2012, 11, 21, 16, 55, 0));
	ok( Math.abs(sunPosition.altitude) < 1.0, "altitude within 1 deg of horizion at 16:55" );
});
