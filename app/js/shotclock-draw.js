var shotclockDraw = {
	currently: '',
    mapCenterPosition: '',
	map: '',

    hasValidStoredData: function() {
        var storedLat = parseFloat(localStorage.getItem('latitude'));
        var storedLong = parseFloat(localStorage.getItem('longitude'));
        var storedZoom = parseInt(localStorage.getItem('zoom'));
        console.log('hasValidStoredData', storedLong, storedLat, storedZoom);
        return storedLong && storedLat && storedZoom;
    },

    storePositionAndZoom: function(inPosition, inZoom) {
        console.log('storePositionAndZoom', inPosition, inZoom);
        localStorage.setItem('longitude', inPosition[0]);
        localStorage.setItem('latitude', inPosition[1]);
        localStorage.setItem('zoom', inZoom);

        // update the URL
        window.history.replaceState({}, '', '#latitude=' + inPosition[1]+ '&longitude=' + inPosition[0] + '&zoom=' + inZoom);
    },

    retrievePositionAndZoom: function() {
        var storedLat = parseFloat(localStorage.getItem('latitude'));
        var storedLong = parseFloat(localStorage.getItem('longitude'));
        var storedZoom = parseInt(localStorage.getItem('zoom'));

        console.log('retrievePositionAndZoom', storedLat, storedLong, storedZoom);

        return { position: [storedLong, storedLat], zoom: storedZoom };
    },

	mapCenterChanged: function() {
        // transform the center back into lat/long
        this.mapCenterPosition = ol.proj.transform(this.map.getView().getCenter(), 'EPSG:3857', 'EPSG:4326');

        // assume its a big move
        var bigMove = true;

        if (this.hasValidStoredData()) {
            // get stored position
            var storedPosition = this.retrievePositionAndZoom().position;
            // compute the delta from the last saved position
            var delta = [this.mapCenterPosition[0] - storedPosition[0], this.mapCenterPosition[1] - storedPosition[1]];
            // decide whether we just made a big move and need to recalculate light times
            bigMove = (Math.abs(delta[0]) > 0.5) || (Math.abs(delta[1]) > 0.5);
        }

        // save the map center in local storage
        this.storePositionAndZoom(this.mapCenterPosition, this.map.getView().getZoom());

        console.log('mapCenterChanged', this.mapCenterPosition, bigMove);

        // if we know the current time...

        if (this.currently) {
            // ... recompute the sun position.
            var temp = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], this.currently);
            this.currentSunPosition = temp;

            // if our map center changed by half a degree in latitude or longitude...
            if (bigMove || (! this.lightTimes) || (! this.lightRanges)) {
                // ... recompute light times and light ranges
                this.lightTimes = sunAngleUtils.getLightTimes(this.mapCenterPosition[0], this.mapCenterPosition[1], this.currently);
                this.lightRanges = sunAngleUtils.getLightRanges(this.lightTimes['highest']);
            }
        } else {
            console.log('warning: this.currently undefined');
        }
    },

    // Update the shotclock, date and time pickers when the current time changes
    // Called at app startup and once a minute when tracking current time
    // Called when clicking on date picker or time slider
    currentTimeChanged: function(newTime) {
        // cache the current time in the this data struct
        this.currently = newTime;

        // if we know the current position...
        if (this.mapCenterPosition) {
            // ...ask for current weather from my server with /forecast/:lat,:long
            console.log('GETTING FORECAST');
            $.ajax({
                url: '/forecast/' + this.mapCenterPosition[1] + ',' + this.mapCenterPosition[0],
            }).done(function(data) {
                console.log('Got Forecast!', data.currently.summary);
                $('#currentWeather').text(data.currently.summary);
            });

            // ... get the sun position
            var temp = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], newTime);
            this.currentSunPosition = temp;

            // TODO, only update these if the day changed since last time.
            this.lightTimes = sunAngleUtils.getLightTimes(this.mapCenterPosition[0], this.mapCenterPosition[1], this.currently);
            this.lightRanges = sunAngleUtils.getLightRanges(this.lightTimes['highest']);
        } else {
            console.log('warning, this.mapCenterPosition undefined');
        }

        // update the date label and picker, and the hour label and the advice
        $('#dateLabel').text(sunAngleUtils.getShortDateString(this.currently));
        $('#hourLabel').text(sunAngleUtils.getShortTimeString(this.currently));
        var currentLightRange = this.getLightRangeForTime(this.currently);
        console.log('currentTimeChanged', currentLightRange);
        if (currentLightRange) {
            $('#summarytab').text(currentLightRange[4]);
        } else {
            $('#summarytab').text('Night');
        }
    },

    // Center the map on the given location
    // Called after successful geolocation, or on app startup
    initializeMap: function(inPosition, inZoom) {
       console.log('initializeMap', inPosition, inZoom);

        if (inPosition[0] == 'NaN') throw 'Bogus latitude' ;
        if (inPosition[1] == 'NaN') throw 'Bogus longitude' ;

        // note: this triggers moveend
        this.map.setView(new ol.View({
            center: ol.proj.transform(inPosition, 'EPSG:4326', 'EPSG:3857'),
            zoom: inZoom,
        }));        
    },

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    drawRadialSection: function(startName, stopName, theColor, theID) {
        console.log('START drawRadialSection', startName, stopName, theColor, theID);
        if (this.lightTimes[startName] & this.lightTimes[stopName]) {
            // get the start and stop azimuth in degrees
            var startAzimuthInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], this.lightTimes[startName]).azimuth;
            var stopAzimuthInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], this.lightTimes[stopName]).azimuth;

            // convert the start and stop azimuth in radians
            var startAzimuthInRadians = 2 * Math.PI * startAzimuthInDegrees / 360;
            var stopAzimuthInRadians = 2 * Math.PI * stopAzimuthInDegrees / 360;

            // show this segment and its background
            $('#' + theID).show();
            $('#' + theID + '-w').show();
            $('#' + theID)[0].setAttribute('class', theColor);

            // set the moveTo coordinates based on those 
            var arcRadius = 95;
            var arcRadiusWhite = 105;
            var pathSegList = $('#' + theID)[0].pathSegList;
            var pathSegListWhite = $('#' + theID + '-w')[0].pathSegList;
            if (pathSegList == null) {
                throw new Error('empty pathSegList for ' + theID);
            }
            if (pathSegListWhite == null) {
                throw new Error('empty pathSegListWhite for ' + theID);
            }
            moveTo = pathSegList.getItem(0);
            moveToWhite = pathSegListWhite.getItem(0);
            moveTo.x = 125 + arcRadius * Math.sin(Math.PI + startAzimuthInRadians);
            moveTo.y = 125 + arcRadius * Math.cos(Math.PI + startAzimuthInRadians);
            moveToWhite.x = 125 + arcRadiusWhite * Math.sin(Math.PI + startAzimuthInRadians);
            moveToWhite.y = 125 + arcRadiusWhite * Math.cos(Math.PI + startAzimuthInRadians);

            // ELLIPTICAL ARC
            ellipticalArc = pathSegList.getItem(1);
            ellipticalArc.angle = 0;
            ellipticalArcWhite = pathSegListWhite.getItem(1);
            ellipticalArcWhite.angle = 0;

            // TODO: make this be true when the sun tracks south instead of north
            var highestAzimuthInDegrees = this.lightTimes['highestAzimuth'];
            var south = (highestAzimuthInDegrees < 270) && (highestAzimuthInDegrees > 90);
            var sweep = ! south;
            var large = false;

            ellipticalArc.sweepFlag = sweep;
            ellipticalArc.largeArcFlag = large;

            ellipticalArcWhite.sweepFlag = sweep;
            ellipticalArcWhite.largeArcFlag = large;

            // console.log(theID + ' ' + startAzimuthInDegrees + ' ' + stopAzimuthInDegrees + ' ' + large + ', sweep ' + sweep);

            ellipticalArc.r1 = arcRadius;
            ellipticalArc.r2 = arcRadius;
            ellipticalArcWhite.r1 = arcRadiusWhite;
            ellipticalArcWhite.r2 = arcRadiusWhite;

            ellipticalArc.x = 125 + arcRadius * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArc.y = 125 + arcRadius * Math.cos(Math.PI + stopAzimuthInRadians);
            ellipticalArcWhite.x = 125 + arcRadiusWhite * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArcWhite.y = 125 + arcRadiusWhite * Math.cos(Math.PI + stopAzimuthInRadians);
        } else {
            console.log('not found', startName, stopName);
        }
    },

    getLightRangeForTime: function(inDate) {
        var sortedRanges = sunAngleUtils.getSortedLightRangesAndTimes(this.lightTimes, this.lightRanges);

        for (var i = 0; i < sortedRanges.length; i++) {
            var sortedEntry = sortedRanges[i];

            if ((sortedEntry[1] < inDate.getTime()) && (inDate.getTime() < sortedEntry[2])) {
                return sortedEntry;
            }
        }    

        return null;
    },

    // rerun whenever light times change or current time changes
    privateDrawShadow: function() {
        var cssClass = 'light-night';
        var lightRange = this.getLightRangeForTime(this.currently);

        if (lightRange) {
            cssClass = lightRange[3];
        }

        $('#shortsunangle')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 125, 125);

        $('#shadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 125, 125);
        $('#shortshadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 125, 125);

        if (this.currentSunPosition.altitude > 0) { // if the sun is up
            if (this.currentSunPosition.altitude < 40) { // low sun, long shadow
                $('#shadow').show();
                $('#shortsunangle').show();
                $('#shortshadow').hide();
            } else { // high sun, short shadow
                $('#shortshadow').show();
                $('#shadow').hide();
            }
        } else { // the sun is down, hide all the shadows
            $('#shadow').hide();
            $('#shortsunangle').hide();
            $('#shortshadow').hide();
        }

        $('#currentTime').text(sunAngleUtils.getShortTimeString(this.currently));
        $('#currentDate').text(sunAngleUtils.getShortDateString(this.currently));
        $('#trafficlight').show();
    },

    privateLabelHours: function() {
        for (var hourIndex = 0; hourIndex < 24; hourIndex++) {
            var hourMarksDate = new Date(this.currently);
            hourMarksDate.setHours(hourIndex);
            hourMarksDate.setMinutes(0);
            hourMarksDate.setSeconds(0);

            var hourMarkSunPositionInDegrees = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], hourMarksDate);

            if (hourMarkSunPositionInDegrees.altitude >= -1) {
                $('#hour'+hourIndex+'tick')[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 125, 125);
                $('#hour'+hourIndex+'tick').show();

                if (hourMarkSunPositionInDegrees.altitude < 45) {
                    $('#hour'+hourIndex)[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 125, 125);
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
    logCurrentSunPosition: function() {
        console.log('logCurrentSunPosition');
        $('path').hide();

        // for each range, draw a radial section with the right color.
        for (rangeName in this.lightRanges) {
            rangeData = this.lightRanges[rangeName];
            this.drawRadialSection(rangeData[0], rangeData[1], rangeData[2], rangeName);
        }

        // label hours of the day using current position
        this.privateLabelHours();

        this.privateDrawShadow(this.currentSunPosition);

        $('.shotclock').show();
    }, 

    initialize: function(inMap) {
        // store map in instance variable
        this.map = inMap;

        // Open Street Maps layer
        var osmSource = new ol.source.MapQuest({layer: 'osm'});
        var osmLayer = new ol.layer.Tile({source: osmSource});

        osmSource.addEventListener('tileloaderror', function (e) {
            console.log('tileloaderror, we are probably offline');
        });

        osmSource.addEventListener('tileloadend', function (e) {
            console.log('tileload done, we are probably ONLINE');
        });

        this.map.addLayer(osmLayer);

        // initialize from URL hash
        if (window.location.hash) {
            window.location.queryString = {};
            window.location.hash.substr(1).split('&').forEach(function (pair) {
                if (pair === '') return;
                var parts = pair.split('=');
                location.queryString[parts[0]] = parts[1] &&
                    decodeURIComponent(parts[1].replace(/\+/g, ' '));
            });

            if (window.location.queryString.latitude == 'NaN') throw 'Bogus latitude' ;
            if (window.location.queryString.longitude == 'NaN') throw 'Bogus longitude' ;

            console.log('parsed', window.location.queryString);
            shotclockDraw.storePositionAndZoom([window.location.queryString.longitude, window.location.queryString.latitude], window.location.queryString.zoom);
        } else {
            console.log('no location.hash');
        }

        // initialize map to saved lat/long and zoom or else zoom to center of USA
        if (this.hasValidStoredData()) {
            var savedData = this.retrievePositionAndZoom();

            this.initializeMap(savedData.position, savedData.zoom);
        } else {
            shotclockDraw.storePositionAndZoom([-98, 38], 4);
            // initialize map to center of USA
            //TODO: don't be so USA-o-centric, think l10n
            this.initializeMap([-98, 38], 4);
        }  

        // initialize so that we show current time and date
        this.showCurrentDateTime = true;
        this.currentTimeChanged(Date.now());      

        // redo the timeline whenever we move the map
        this.map.on('moveend', function(eventThing) {
            console.log('moveeend', eventThing);
            shotclockDraw.mapCenterChanged();
            shotclockDraw.logCurrentSunPosition();
        });

        // check once a minute to track date/time
        window.setInterval(function() {
            if (shotclockDraw.showCurrentDateTime) {
                console.log('interval timer');
                shotclockDraw.currentTimeChanged(Date.now());
                shotclockDraw.logCurrentSunPosition();
            }
        }, 60000);
    },
};