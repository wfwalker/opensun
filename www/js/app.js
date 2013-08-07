
// The code below uses require.js, a module system for javscript:
// http://requirejs.org/docs/api.html#define

// Set the path to jQuery, which will fall back to the local version
// if google is down
require.config({
    baseUrl: "js/lib",
});

// When you write javascript in separate files, list them as
// dependencies along with jquery
require([], function() {

    var global = this;

    global.hasTouch = ('ontouchstart' in window) ||
                   window.DocumentTouch &&
                   document instanceof DocumentTouch;

    global.actEvent = hasTouch ? "touchstart" : "click";

    function showErrorMessage(inErrorMessageText) {
        $('#errorMessageLabel').text(inErrorMessageText);
        $('#errorMessageContainer').fadeIn();
        var location_timeout = window.setTimeout(function() { $('#errorMessageContainer').fadeOut(); }, 5000);
    }

    function mapCenterChanged() {
        // cache map center position in degrees in global struct
        global.mapCenterPosition = global.map.getCenter().transform(
                global.map.getProjectionObject(), // to Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
            );

        var delta = new OpenLayers.LonLat(global.mapCenterPosition.lon - localStorage.getItem("longitude"), global.mapCenterPosition.lat - localStorage.getItem("latitude")).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
              );

        // decide whether we just made a big move and need to recalculate light times
        var bigMove = (Math.abs(global.mapCenterPosition.lat - localStorage.getItem("latitude")) > 0.5) ||
                       (Math.abs(global.mapCenterPosition.lon - localStorage.getItem("longitude")) > 0.5)

        // if we know the current time, get the sun position, get the light times and light ranges for today, update labels.

        if (global.currently) {
            var temp = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);
            global.currentSunPosition = temp;

            if (bigMove) {
                global.lightTimes = getLightTimes(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);
                global.lightRanges = getLightRanges(global.lightTimes['highest']);
                privateUpdateLightRangesSummary();
            }
        } else {
            console.log("warning: global.currently undefined");
        }

        // save the map center in local storage
        localStorage.setItem("latitude", global.mapCenterPosition.lat);
        localStorage.setItem("longitude", global.mapCenterPosition.lon);
        localStorage.setItem("zoom", global.map.getZoom());
    }

    function currentTimeChanged(newTime) {
        // cache the current time in the global data struct
        global.currently = newTime;

        // if we know the current position, get the sun position

        if (global.mapCenterPosition) {
            var temp = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, newTime);
            global.currentSunPosition = temp;

            // TODO, only update these if the day changed since last time.

            global.lightTimes = getLightTimes(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);
            global.lightRanges = getLightRanges(global.lightTimes['highest']);
            privateUpdateLightRangesSummary();
        } else {
            console.log("warning, global.mapCenterPosition undefined");
        }

        $('#dateLabel').text(getShortDateString(global.currently));
        $('#datepicker')[0].chosen = global.currently;
        $('#datepicker')[0].view = global.currently;
        $('#hourLabel').text(getShortTimeString(global.currently));

        if (global.showCurrentDateTime) {
            $('#timeslider')[0].value = global.currently.getHours() + (global.currently.getMinutes() / 60.0);
        }
    }

    // center the map on the given location
    function centerMapAt(longitude, latitude, zoom) {
        // compute the new center
        var newMapCenter = new OpenLayers.LonLat(longitude, latitude).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
              );

        // send the map there
        global.map.setCenter(newMapCenter, zoom);  

        // notify event handler
        mapCenterChanged();
    };

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    function drawRadialSection(startName, stopName, startFraction, stopFraction, theColor, theID) {
        console.log("START drawRadialSection " + theID);
        if (global.lightTimes[startName] & global.lightTimes[stopName]) {
            var startAzimuthInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.lightTimes[startName]).azimuth;
            var startAzimuthInRadians = 2 * Math.PI * startAzimuthInDegrees / 360;

            var stopAzimuthInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.lightTimes[stopName]).azimuth;
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
            ellipticalArc.largeArcFlag = (theID == 'sunlight');
            ellipticalArc.sweepFlag = false;
            ellipticalArc.r1 = arcRadius;
            ellipticalArc.r2 = arcRadius;
            ellipticalArc.x = 120 + arcRadius * Math.sin(Math.PI + stopAzimuthInRadians);
            ellipticalArc.y = 120 + arcRadius * Math.cos(Math.PI + stopAzimuthInRadians);
        }
    }

    function privateUpdateLightRangesSummary() {
        $('#sunContainer').empty();

        var sortable = [];

        for (key in global.lightRanges) {
            var rangeBounds = global.lightRanges[key];

            if (global.lightTimes[rangeBounds[0]] & global.lightTimes[rangeBounds[1]]) {
                var newEntry = [key, global.lightTimes[rangeBounds[0]], global.lightTimes[rangeBounds[1]], rangeBounds[2]];
                sortable.push(newEntry);
            }
            else
            {
                console.log("can't find " + rangeBounds[0] + " and/or " + rangeBounds[1] + " in global.lighttimes");
            }
        };

        sortable.sort(function(a, b) {
            return (a[1] > (b[1]));
        });

        for (var i = 0; i < sortable.length; i++) {
            var sortedEntry = sortable[i];
            $('#sunContainer').append(
                "<div>" + "<span style='background-color: " + sortedEntry[3] + "'>&nbsp;&nbsp;&nbsp;</span> " +
                getShortTimeString(sortedEntry[1]) + " to " +
                getShortTimeString(sortedEntry[2]) + "</div>"
                );
        }
    }

    // rerun whenever light times change or current time changes
    function privateDrawShadow() {
        var color = "#000000";

        for (key in global.lightRanges) {
            rangeBounds = global.lightRanges[key];

            if (global.lightTimes[rangeBounds[0]] & global.lightTimes[rangeBounds[1]]) {
                if ((global.lightTimes[rangeBounds[0]] < global.currently) & (global.currently <= global.lightTimes[rangeBounds[1]])) {
                    color = rangeBounds[2];
                    break;
                }
            }
        }

        $('#sunangle')[0].transform.baseVal.getItem(0).setRotate(global.currentSunPosition.azimuth, 120, 120);
        $('#shortsunangle')[0].transform.baseVal.getItem(0).setRotate(global.currentSunPosition.azimuth, 120, 120);
        $('#sunangle')[0].style.setProperty('stroke', color);
        $('#shadow')[0].transform.baseVal.getItem(0).setRotate(global.currentSunPosition.azimuth, 120, 120);
        $('#shortshadow')[0].transform.baseVal.getItem(0).setRotate(global.currentSunPosition.azimuth, 120, 120);

        $('#trafficlight').attr('style', 'background-color: ' + color);

        if (global.currentSunPosition.altitude > 0) {
            if (global.currentSunPosition.altitude < 40) {
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

        $('#currentAzimuth').text(global.currentSunPosition.altitude.toFixed(0) + "° at " + getShortTimeString(global.currently) + " on " + getShortDateString(global.currently));
    }

    function privateLabelHours() {
        for (var hourIndex = 0; hourIndex < 24; hourIndex++) {
            var hourMarksDate = new Date(global.currently);
            hourMarksDate.setHours(hourIndex);
            hourMarksDate.setMinutes(0);
            hourMarksDate.setSeconds(0);

            var hourMarkSunPositionInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, hourMarksDate);

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
    }

    function privateDrawCircles() {
        var radialSectionFraction = 0.9;

        $('path').hide();

        // draw some constant circles
        drawRadialSection('predawn', 'sunset', 1.0, 1.2, '#FFFFFF', 'sunlight');

        // for each range, draw a radial section with the right color.
        for (rangeName in global.lightRanges) {
            rangeData = global.lightRanges[rangeName];
            drawRadialSection(rangeData[0], rangeData[1], radialSectionFraction, 1.0, rangeData[2], rangeName);
        }
    }

    // draws the sun rose at the current map center using information in the global data structure
    function logCurrentSunPosition(delta) {
        var windowBounds = global.map.calculateBounds();

        // draw radial sections in different colors using today's lightTimes
        privateDrawCircles();

        // label hours of the day using current position
        privateLabelHours();

        privateDrawShadow(global.currentSunPosition);
    }

    $(document).ready(function(){
        // create the map associated with the div
        global.map = new OpenLayers.Map("mapdiv", { theme : null });

        console.log("MY LOCALE IS " + (document.documentElement.lang || navigator.language));

        // Open Street Maps layer

        // terse example:
        // global.map.addLayer(new OpenLayers.Layer.OSM());

        // fully specified example:
        var mapquestOSM = new OpenLayers.Layer.OSM("MapQuest-OSM",
          ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
           "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
           "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"]);

        var openCycleTiles = new OpenLayers.Layer.OSM("OpenCycleMap",
          ["http://a.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
           "http://b.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
           "http://c.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png"]);

        var aerialTiles = new OpenLayers.Layer.OSM("MapQuest Open Aerial Tile",
          ["http://oatile1.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png",
           "http://oatile2.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png",
           "http://oatile3.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png"]);

        // http://openweathermap.org/wiki/Layer/clouds
        var cloudCoverTiles = new OpenLayers.Layer.OSM("OpenWeatherMap Cloud Tile",
          ["http://openweathermap.org/t/tile.cgi/1.0.0/CLOUDS/${z}/${x}/${y}.png",
           "http://openweathermap.org/t/tile.cgi/1.0.0/CLOUDS/${z}/${x}/${y}.png",
           "http://openweathermap.org/t/tile.cgi/1.0.0/CLOUDS/${z}/${x}/${y}.png"]);

        global.map.addLayer(mapquestOSM);
        // global.map.addLayer(cloudCoverTiles);
        // global.map.addLayer(openCycleTiles);
        // global.map.addLayer(aerialTiles);

        // initialize map to saved lat/long and zoom or else zoom to center of USA
        if ( localStorage.getItem("latitude")) {
            var savedLatitude = localStorage.getItem("latitude");
            var savedLongitude = localStorage.getItem("longitude");
            var savedZoom = localStorage.getItem("zoom");
            centerMapAt(savedLongitude, savedLatitude, savedZoom);            
        } else {
            // initialize map to center of USA
            //TODO: don't be so USA-o-centric, think l10n
            centerMapAt(-98, 38, 4);
        }  

        // initialize so that we show current time and date
        global.showCurrentDateTime = true;
        currentTimeChanged(Date.now());      

        // show sundial for current date/time
        mapCenterChanged();
        logCurrentSunPosition(); 

        // redo the timeline whenever we move the map
        global.map.events.register('moveend', global.map, function(eventThing) {
            var delta = mapCenterChanged();
            logCurrentSunPosition(delta);
        });

        // check once a minute to track date/time
        window.setInterval(function() {
            if (global.showCurrentDateTime) {
                currentTimeChanged(Date.now());
                logCurrentSunPosition();
            }
        }, 60000);

        // automatically hide the splash / about screen after a few seconds
        window.setTimeout(function() {
            document.getElementById('map').show();            
        }, 500);

        // clicking the HERE button tries to geolocate
        $("#herebutton").bind(global.actEvent, function(e) {
            e.preventDefault();

            // SET THE SPINNER
            // TODO: show/hide pre-existing spinner, don't put HTML in strings.
            $('#geolocatespinner').html('<img src="img/small-progress.gif" />');

            var location_timeout = window.setTimeout(function() {
                console.log("location timeout");
                $('#geolocatespinner').html('');
            }, 32000);

            console.log("about to start geolocate");
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    console.log("geolocate success " + position);
                    clearTimeout(location_timeout);
                    $('#geolocatespinner').html('');
                    centerMapAt(position.coords.longitude, position.coords.latitude, 15);
                    document.getElementById('map').show();
                },
                function(err) {
                    console.log("geolocate failure " + err);
                    clearTimeout(location_timeout);
                    $('#geolocatespinner').html('');
                    // TODO: error message not localized
                    console.log("can't find your location: " + err);
                    showErrorMessage("can't find your location");
                },
                {timeout: 30000, maximumAge: 60000, enableHighAccuracy:true});
            console.log("just started geolocate");
        });

        // initialize datepicker
        $("#datepicker").on("datetoggleon", function (event) {
            var chosenDate = Date.parse(event.originalEvent.detail.iso);
            // parse date and notify event listener
            var newDate = new Date(global.currently);
            newDate.setDate(chosenDate.getDate());
            newDate.setMonth(chosenDate.getMonth());
            newDate.setFullYear(chosenDate.getFullYear());
            global.showCurrentDateTime = false;
            currentTimeChanged(newDate);

            $('#nowbutton').attr('disabled', 'false');

            logCurrentSunPosition();
        });

        // initialize timeslider -- now a web component!
        $('#timeslider').on("change",
            function (event) {
                var newTime = new Date(global.currently);
                newTime.setMinutes((this.value * 60) % 60);
                newTime.setHours(this.value);
                global.showCurrentDateTime = false;
                currentTimeChanged(newTime);

                $('#nowbutton').attr('disabled', 'false');

                logCurrentSunPosition();
            }
        );

        // clicking the NOW button toggles whether we're tracking the current date/time
        $("#nowbutton").bind(global.actEvent, function(e) {
            e.preventDefault();

            if (! global.showCurrentDateTime) {
                global.showCurrentDateTime = true;
                currentTimeChanged(Date.now());
                logCurrentSunPosition();
                $('#nowbutton').attr('disabled', 'true');
            }
        });

        $('#findtext').bind(global.actEvent, function (e) { this.select() });

        $('#findform').submit(function(e) {
            e.preventDefault();

            // TODO: just show/hide div already containing animated gif. avoids putting HTML in string constants :-(
            $('#placelookupspinner').html('<img src="img/small-progress.gif" />');        

            var searchText = $('#findtext').val();

            $.ajax({
                url: "http://nominatim.openstreetmap.org/search?format=json&polygon=0&addressdetails=1&q=" + searchText,
                dataType: "json",

                error: function(results) {
                    $('#placelookupspinner').html('');    
                    // TODO: localize error msgs    
                    console.log("can't search for places, " + results);
                    showErrorMessage("can't search for places");
                },               

                success: function(results) {     
                    $('#placelookupspinner').html('');        
                 
                    if (results && results.length > 0) {
                        centerMapAt(results[0].lon, results[0].lat, 10);
                        document.getElementById('map').show();
                    }
                    else
                    {
                        $('#placelookupspinner').html('');        
                        showErrorMessage("no places found for '" + searchText + "'");
                    }
                },
             });

        });

    });

    // If using Twitter Bootstrap, you need to require all the
    // components that you use, like so:
    // require('bootstrap/dropdown');
    // require('bootstrap/alert');
});

