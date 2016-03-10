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

    updateLocationNameString: function() {
        console.log('start updateLocationNameString');

        // look up a place name for our new location and display it in the summary tab

        // see http://wiki.openstreetmap.org/wiki/Nominatim#Reverse_Geocoding_.2F_Address_lookup
        // http://nominatim.openstreetmap.org/reverse?format=xml&lat=52.5487429714954&lon=-1.81602098644987&zoom=18&addressdetails=1
        $.ajax({
            url: "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + this.mapCenterPosition[1] + "&lon=" + this.mapCenterPosition[0] + "&zoom=10&addressdetails=1",
            dataType: "json",

            error: function(results) {
                console.log("can't reverse lookup, " + results);
                shotclockDraw.locationNameString = "Unknown";
                showErrorMessage("can't reverse lookup");
                shotclockDraw.privateUpdateNotification(true);
                localStorage.setItem("locationNameString", shotclockDraw.locationNameString);
            },               

            success: function(results) {     
                if (results) {
                    var temp = [];
                    if (results.address.city) {
                        temp.push(results.address.city);
                    }
                    if (results.address.county) {
                        temp.push(results.address.county);
                    }
                    if (results.address.state) {
                        temp.push(results.address.state);
                    }
                    shotclockDraw.locationNameString = temp.join(', ');
                    console.log('updateLocationNameString', shotclockDraw.locationNameString);
                    // TODO: update twitter:description ? 
                    // document.getElementsByName('twitter:description')[0].setAttribute('content', 'monkey')
                    shotclockDraw.privateUpdateNotification(true);
                }
                else
                {
                    shotclockDraw.locationNameString = "Unknown";
                    console.log("reverse lookup no results");
                    shotclockDraw.privateUpdateNotification(true);
                }

                localStorage.setItem("locationNameString", shotclockDraw.locationNameString);
            },
        });
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

                this.updateLocationNameString();
            }
        } else {
            console.log("warning: this.currently undefined");
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
            });

            // ... get the sun position
            var temp = sunAngleUtils.getSunPositionInDegrees(this.mapCenterPosition[0], this.mapCenterPosition[1], newTime);
            this.currentSunPosition = temp;

            // TODO, only update these if the day changed since last time.
            this.lightTimes = sunAngleUtils.getLightTimes(this.mapCenterPosition[0], this.mapCenterPosition[1], this.currently);
            this.lightRanges = sunAngleUtils.getLightRanges(this.lightTimes['highest']);
            this.privateUpdateNotification(false);
        } else {
            console.log("warning, this.mapCenterPosition undefined");
        }

        // update the date label and picker, and the hour label and the advice
        $('#dateLabel').text(sunAngleUtils.getShortDateString(this.currently));
        $('#datepicker')[0].chosen = this.currently;
        $('#datepicker')[0].view = this.currently;
        $('#hourLabel').text(sunAngleUtils.getShortTimeString(this.currently));
        var currentLightRange = this.getLightRangeForTime(this.currently);
        console.log('currentTimeChanged', currentLightRange);
        if (currentLightRange) {
            $('#summarytab').text(currentLightRange[4]);
        }

        // if we're tracking the current time...
        if (this.showCurrentDateTime) {
            // ... update the slider
            $('#timeslider')[0].value = this.currently.getHours() + (this.currently.getMinutes() / 60.0);
        }
    },

    // Center the map on the given location
    // Called after successful geolocation, or on app startup
    centerMapAt: function(inPosition, inZoom) {
       console.log('centerMapAt', inPosition, inZoom);

        if (inPosition[0] == 'NaN') throw "Bogus latitude" ;
        if (inPosition[1] == 'NaN') throw "Bogus longitude" ;

        // note: this triggers moveend
        this.map.setView(new ol.View({
            center: ol.proj.transform(inPosition, 'EPSG:4326', 'EPSG:3857'),
            zoom: inZoom
        }));        
    },

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    drawRadialSection: function(startName, stopName, theColor, theID) {
        console.log("START drawRadialSection", startName, stopName, theColor, theID);
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
            moveTo.x = 120 + arcRadius * Math.sin(Math.PI + startAzimuthInRadians);
            moveTo.y = 120 + arcRadius * Math.cos(Math.PI + startAzimuthInRadians);
            moveToWhite.x = 120 + arcRadiusWhite * Math.sin(Math.PI + startAzimuthInRadians);
            moveToWhite.y = 120 + arcRadiusWhite * Math.cos(Math.PI + startAzimuthInRadians);

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

            // console.log(theID + " " + startAzimuthInDegrees + " " + stopAzimuthInDegrees + " " + large + ", sweep " + sweep);

            ellipticalArc.r1 = arcRadius;
            ellipticalArc.r2 = arcRadius;
            ellipticalArcWhite.r1 = arcRadiusWhite;
            ellipticalArcWhite.r2 = arcRadiusWhite;

            ellipticalArc.x = 120 + arcRadius * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArc.y = 120 + arcRadius * Math.cos(Math.PI + stopAzimuthInRadians);
            ellipticalArcWhite.x = 120 + arcRadiusWhite * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArcWhite.y = 120 + arcRadiusWhite * Math.cos(Math.PI + stopAzimuthInRadians);
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
    },

    // TODO: needs localization!
    privateGetNextNotification: function() {
        var sortedRanges = sunAngleUtils.getSortedLightRangesAndTimes(this.lightTimes, this.lightRanges);
        var goodLightNotificationSpacing = 15;
        var badLightNotificationSpacing = 60;

        for (var i = 0; i < sortedRanges.length; i++) {
            var sortedEntry = sortedRanges[i];
            if (shotclockDraw.showCurrentDateTime && (sortedEntry[3] == 'light-best') && (sortedEntry[1] < shotclockDraw.currently.getTime()) && (shotclockDraw.currently.getTime() < sortedEntry[2])) {
                var minutesLeft = Math.round((sortedEntry[2] - shotclockDraw.currently) / (60 * 1000));
                return { next: Date.now().add(goodLightNotificationSpacing).minutes(), title: "Shoot", subtitle: minutesLeft + " minutes left" };
            }
        }

        for (var i = 0; i < sortedRanges.length; i++) {
            var sortedEntry = sortedRanges[i];
            if (shotclockDraw.showCurrentDateTime && (sortedEntry[3] == 'light-best') && (shotclockDraw.currently.getTime() < sortedEntry[1])) {
                var minutesUntil = Math.round((sortedEntry[1] - shotclockDraw.currently) / (60 * 1000));
                var hoursUntil = Math.round(minutesUntil / 60.0);
                if (hoursUntil > 1) {
                    return { next: Date.now().add(badLightNotificationSpacing).minutes(), title: "Wait", subtitle: "light could be good in " + hoursUntil + " hours" };
                } else {
                    var bestMinutesUntil = Math.min(minutesUntil, goodLightNotificationSpacing);
                    return { next: Date.now().add(bestMinutesUntil).minutes(), title: "Wait", subtitle: "light could be good in " + minutesUntil + " minutes" };
                }
            }
        }

        return { next: Date.today().next().day(), title: "Night", subtitle: "Sleep or process photos" };
    },

    privateUpdateNotification: function(inPlaceChanged) {
        var tempNotification = this.privateGetNextNotification();

        var existingNotificationPassed = this.notificationMessage && (Date.now() > this.notificationMessage.next);
        var noExistingNotification = (! this.notificationMessage);

        // see if we have an existing, passed notification
        if (existingNotificationPassed) {
            console.log(tempNotification.title + ": " + tempNotification.subtitle);
            var options = {
                            body: tempNotification.subtitle, 
                            icon: "data:image/png;base64,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"
                          };
            // NOTIFY!
            console.log("NOTIFY");
            sendNotification(tempNotification.title, options);  
        }

        // if there's no existing notification, or the place changed, or if there's an existing notification and it's in the past, recent the notification
        if (noExistingNotification || inPlaceChanged || existingNotificationPassed) {
            // create and store new notification
            this.notificationMessage = tempNotification;
            console.log("SET NOTIFICATION");
        }

        // TODO: need l10n; need template!
        $('#summarytab').text(tempNotification.title);
        $('#notificationSummary').html('<div class="notification-subtitle">' + this.locationNameString + '</div><div class="notification-title">' + tempNotification.title + '</div><div class="notification-subtitle">' + tempNotification.subtitle + '</div>');
        console.log(this.locationNameString + ": " + sunAngleUtils.getShortDateString(this.notificationMessage.next) + " @ " + sunAngleUtils.getShortTimeString(this.notificationMessage.next) + " -> " + this.notificationMessage.title + ": " + this.notificationMessage.subtitle);
    },

    // rerun whenever light times change or current time changes
    privateDrawShadow: function() {
        var cssClass = 'light-night';
        var lightRange = this.getLightRangeForTime(this.currently);

        if (lightRange) {
            cssClass = lightRange[3];
        }

        $('#shortsunangle')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);

        $('#sunangle').attr('class', cssClass);
        $('#shadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);
        $('#shortshadow')[0].transform.baseVal.getItem(0).setRotate(this.currentSunPosition.azimuth, 120, 120);

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

        $('#currentAzimuth').text(this.currentSunPosition.altitude.toFixed(0) + "°");
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
                $('#hour'+hourIndex+'tick')[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 120, 120);
                $('#hour'+hourIndex+'tick').show();

                if (hourMarkSunPositionInDegrees.altitude < 45) {
                    $('#hour'+hourIndex)[0].transform.baseVal.getItem(0).setRotate(hourMarkSunPositionInDegrees.azimuth, 120, 120);
                    $('#hour'+hourIndex).hide();
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
        })

        osmSource.addEventListener('tileloadend', function (e) {
            console.log('tileload done, we are probably ONLINE');
        })

        this.map.addLayer(osmLayer);

        // initialize from URL hash
        if (window.location.hash) {
            window.location.queryString = {};
            window.location.hash.substr(1).split("&").forEach(function (pair) {
                if (pair === "") return;
                var parts = pair.split("=");
                location.queryString[parts[0]] = parts[1] &&
                    decodeURIComponent(parts[1].replace(/\+/g, " "));
            });

            if (window.location.queryString.latitude == 'NaN') throw "Bogus latitude" ;
            if (window.location.queryString.longitude == 'NaN') throw "Bogus longitude" ;

            console.log('parsed', window.location.queryString);
            shotclockDraw.storePositionAndZoom([window.location.queryString.longitude, window.location.queryString.latitude], window.location.queryString.zoom);
        } else {
            console.log('no location.hash');
        }

        // initialize map to saved lat/long and zoom or else zoom to center of USA
        if (this.hasValidStoredData()) {
            var savedData = this.retrievePositionAndZoom();

            this.locationNameString = localStorage.getItem("locationNameString");
            this.centerMapAt(savedData.position, savedData.zoom);
        } else {
            shotclockDraw.storePositionAndZoom([-98, 38], 4);
            // initialize map to center of USA
            //TODO: don't be so USA-o-centric, think l10n
            this.centerMapAt([-98, 38], 4);
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
                shotclockDraw.currentTimeChanged(Date.now());
                shotclockDraw.logCurrentSunPosition();
            }
        }, 60000)      
    },
}