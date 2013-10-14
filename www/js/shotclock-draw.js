var shotclockDraw = {
	currently: '',
	mapCenterPosition: '',
	map: '',

	mapCenterChanged: function() {
        // compute map center position in degrees
        this.mapCenterPosition = this.map.getCenter().transform(
                this.map.getProjectionObject(), // to Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
            );

        var delta = new OpenLayers.LonLat(this.mapCenterPosition.lon - localStorage.getItem("longitude"), this.mapCenterPosition.lat - localStorage.getItem("latitude")).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                this.map.getProjectionObject() // to Spherical Mercator Projection
              );

        // decide whether we just made a big move and need to recalculate light times
        var bigMove = (Math.abs(this.mapCenterPosition.lat - localStorage.getItem("latitude")) > 0.5) ||
                       (Math.abs(this.mapCenterPosition.lon - localStorage.getItem("longitude")) > 0.5)

        // if we know the current time, get the sun position, get the light times and light ranges for today, update labels.

        if (this.currently) {
            var temp = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition.lon, this.mapCenterPosition.lat, this.currently);
            this.currentSunPosition = temp;

            if (bigMove) {
                this.lightTimes = sunAngleUtils.getLightTimes(this.mapCenterPosition.lon, this.mapCenterPosition.lat, this.currently);
                this.lightRanges = sunAngleUtils.getLightRanges(this.lightTimes['highest']);
                this.privateUpdateLightRangesSummary();
            }
        } else {
            console.log("warning: this.currently undefined");
        }

        // save the map center in local storage
        localStorage.setItem("latitude", this.mapCenterPosition.lat);
        localStorage.setItem("longitude", this.mapCenterPosition.lon);
        localStorage.setItem("zoom", this.map.getZoom());
    },

    // Update the shotclock, date and time pickers when the current time changes
    // Called at app startup and once a minute when tracking current time
    // Called when clicking on date picker or time slider
    currentTimeChanged: function(newTime) {
        // cache the current time in the this data struct
        this.currently = newTime;

        // if we know the current position, get the sun position

        if (this.mapCenterPosition) {
            var temp = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition.lon, this.mapCenterPosition.lat, newTime);
            this.currentSunPosition = temp;

            // TODO, only update these if the day changed since last time.

            this.lightTimes = sunAngleUtils.getLightTimes(this.mapCenterPosition.lon, this.mapCenterPosition.lat, this.currently);
            this.lightRanges = sunAngleUtils.getLightRanges(this.lightTimes['highest']);
            this.privateUpdateLightRangesSummary();
        } else {
            console.log("warning, this.mapCenterPosition undefined");
        }

        $('#dateLabel').text(sunAngleUtils.getShortDateString(this.currently));
        $('#datepicker')[0].chosen = this.currently;
        $('#datepicker')[0].view = this.currently;
        $('#hourLabel').text(sunAngleUtils.getShortTimeString(this.currently));

        if (this.showCurrentDateTime) {
            $('#timeslider')[0].value = this.currently.getHours() + (this.currently.getMinutes() / 60.0);
        }
    },

    // Center the map on the given location
    // Called after successful geolocation, or on app startup
    centerMapAt: function(longitude, latitude, zoom) {
        // compute the new center
        var newMapCenter = new OpenLayers.LonLat(longitude, latitude).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                this.map.getProjectionObject() // to Spherical Mercator Projection
              );

        // send the map there
        this.map.setCenter(newMapCenter, zoom);  

        // notify event handler
        this.mapCenterChanged();
    },

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    drawRadialSection: function(startName, stopName, startFraction, stopFraction, theColor, theID) {
        // console.log("START drawRadialSection " + theID);
        if (this.lightTimes[startName] & this.lightTimes[stopName]) {
            var startAzimuthInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition.lon, this.mapCenterPosition.lat, this.lightTimes[startName]).azimuth;
            var startAzimuthInRadians = 2 * Math.PI * startAzimuthInDegrees / 360;

            var stopAzimuthInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition.lon, this.mapCenterPosition.lat, this.lightTimes[stopName]).azimuth;
            if (stopAzimuthInDegrees < startAzimuthInDegrees) {
                stopAzimuthInDegrees = stopAzimuthInDegrees + 360;
            }

            var stopAzimuthInRadians = 2 * Math.PI * stopAzimuthInDegrees / 360;

            // show this one
            $('#' + theID).show();

            // MOVE TO
            var arcRadius = (theID == 'sunlight') ? 105 : 95;
            var pathSegList = $('#' + theID)[0].pathSegList;
            moveTo = pathSegList.getItem(0);
            moveTo.x = 120 + arcRadius * Math.sin(Math.PI + startAzimuthInRadians);
            moveTo.y = 120 + arcRadius * Math.cos(Math.PI + startAzimuthInRadians);

            // ELLIPTICAL ARC
            ellipticalArc = pathSegList.getItem(1);
            ellipticalArc.angle = 0;
            ellipticalArc.largeArcFlag = false; //(theID == 'sunlight');
            ellipticalArc.sweepFlag = false; // true for south of border
            ellipticalArc.r1 = arcRadius;
            ellipticalArc.r2 = arcRadius;
            ellipticalArc.x = 120 + arcRadius * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArc.y = 120 + arcRadius * Math.cos(Math.PI + stopAzimuthInRadians);
        }
    },

    privateUpdateLightRangesSummary: function() {
        $('#sunContainer').empty();

        var sortable = [];

        for (key in this.lightRanges) {
            var rangeBounds = this.lightRanges[key];

            if (this.lightTimes[rangeBounds[0]] & this.lightTimes[rangeBounds[1]]) {
                var newEntry = [key, this.lightTimes[rangeBounds[0]], this.lightTimes[rangeBounds[1]], rangeBounds[2]];
                sortable.push(newEntry);
            }
            else
            {
                console.log("can't find " + rangeBounds[0] + " and/or " + rangeBounds[1] + " in this.lighttimes");
            }
        };

        sortable.sort(function(a, b) {
            return (a[1] > (b[1]));
        });

        for (var i = 0; i < sortable.length; i++) {
            var sortedEntry = sortable[i];
            $('#sunContainer').append(
                "<div>" + "<span class='" + sortedEntry[3] + "'>&nbsp;&nbsp;&nbsp;</span> " +
                sunAngleUtils.getShortTimeString(sortedEntry[1]) + " to " +
                sunAngleUtils.getShortTimeString(sortedEntry[2]) + "</div>"
                );
        }

        console.log(privateNotificationString(sortable));
    },

    // rerun whenever light times change or current time changes
    privateDrawShadow: function() {
        var cssClass = 'light-night';

        for (key in this.lightRanges) {
            rangeBounds = this.lightRanges[key];

            if (this.lightTimes[rangeBounds[0]] & this.lightTimes[rangeBounds[1]]) {
                if ((this.lightTimes[rangeBounds[0]] < this.currently) & (this.currently <= this.lightTimes[rangeBounds[1]])) {
                    cssClass = rangeBounds[2];
                    break;
                }
            }
        }

        $('#sunangle')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);
        $('#shortsunangle')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);
        $('#sunangle').attr('class', cssClass);
        $('#shadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);
        $('#shortshadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);

        $('#trafficlight').attr('class', cssClass);

        if (this.currentSunPosition.altitude > 0) {
            if (this.currentSunPosition.altitude < 40) {
                $('#sunangle').show();
                $('#shadow').show();
                $('#shortsunangle').hide();
                $('#shortshadow').hide();
            } else {
                $('#shortsunangle').show();
                $('#shortshadow').show();
                $('#sunangle').hide();
                $('#shadow').hide();
            }
        } else {
            $('#sunangle').hide();
            $('#shadow').hide();
            $('#shortsunangle').hide();
            $('#shortshadow').hide();
        }

        $('#currentAzimuth').text(this.currentSunPosition.altitude.toFixed(0) + "°");
        $('#currentTime').text(sunAngleUtils.getShortTimeString(this.currently));
        $('#currentDate').text(sunAngleUtils.getShortDateString(this.currently));
    },

    privateLabelHours: function() {
        for (var hourIndex = 0; hourIndex < 24; hourIndex++) {
            var hourMarksDate = new Date(this.currently);
            hourMarksDate.setHours(hourIndex);
            hourMarksDate.setMinutes(0);
            hourMarksDate.setSeconds(0);

            var hourMarkSunPositionInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition.lon, this.mapCenterPosition.lat, hourMarksDate);

            if (hourMarkSunPositionInDegrees.altitude >= -1) {
                $('#hour'+hourIndex+'tick')[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 120, 120);
                $('#hour'+hourIndex+'tick').show();

                if (hourMarkSunPositionInDegrees.altitude < 45) {
                    $('#hour'+hourIndex)[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 120, 120);
                    $('#hour'+hourIndex).show();
                } else {
                    $('#hour'+hourIndex).hide();
                }
            } else {
                $('#hour'+hourIndex+'tick').hide();
                $('#hour'+hourIndex).hide();
            }
        }
    },

    // draws the sun rose at the current map center using information in the this data structure
    logCurrentSunPosition: function(delta) {
        var windowBounds = this.map.calculateBounds();

        // draw radial sections in different colors using today's lightTimes
        var radialSectionFraction = 0.9;

        $('path').hide();

        // draw some constant circles
        this.drawRadialSection('predawn', 'sunset', 1.0, 1.2, '#FFFFFF', 'sunlight');

        // for each range, draw a radial section with the right color.
        for (rangeName in this.lightRanges) {
            rangeData = this.lightRanges[rangeName];
            this.drawRadialSection(rangeData[0], rangeData[1], radialSectionFraction, 1.0, rangeData[2], rangeName);
        }

        // label hours of the day using current position
        this.privateLabelHours();

        this.privateDrawShadow(this.currentSunPosition);
    }
}