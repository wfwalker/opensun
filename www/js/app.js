
// The code below uses require.js, a module system for javscript:
// http://requirejs.org/docs/api.html#define

// Set the path to jQuery, which will fall back to the local version
// if google is down
require.config({
     baseUrl: "js/lib",

     paths: {'jquery': ['jquery'], 'jquery.tools': ['jquery.tools.min'], 'OpenLayers': ['OpenLayers']}
});

var global = this;

// When you write javascript in separate files, list them as
// dependencies along with jquery
require(['jquery', 'jquery.tools', 'date', 'OpenLayers'], function($) {

    // radius of Earth = 6,378,100 meters
    global.radiusOfEarthInMeters = 6378100.0;
    global.radiusOfCircleInMeters = 1000.0;

    // sun angles for rising and setting sun
    global.firstSunAngles = { 'predawn': -1 , 'morningStart': 5, 'morningStop': 25, 'highStart': 40}
    global.lastSunAngles = { 'sunset': -1, 'eveningStop': 5, 'eveningStart': 25, 'highStop': 40 }

    // named time ranges between the sun angles defined above
    global.ranges = {
        'Predawn' : ['predawn', 'morning', '#C4B11B'],
        'Morning': ['morningStart', 'morningStop', '#0F960F'],
        'Morning harsh': ['morningStop', 'highStart', '#C4B11B'],
        'Mid-day high': ['highStart', 'highStop', '#9C1E0B'],
        'Afternoon harsh': ['highStop', 'eveningStart', '#C4B11B'],
        'Evening': ['eveningStart', 'eveningStop', '#0F960F'],
        'Twilight': ['eveningStop', 'sunset', '#C4B11B'],
        'All day good': ['morningStart', 'eveningStop', '#0F960F']
    }

    // initialize so that we show current time and date
    global.showCurrentDateTime = true;
    global.currently = new Date();

    // center the map on the given location
    function centerMapAt(map, longitude, latitude, zoom) {
        //Set center and zoom
        var newMapCenter = new OpenLayers.LonLat(longitude, latitude).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
              );

        global.map.setCenter(newMapCenter, zoom);  
    };

    // returns a short time string for the given object, using hours:minutes
    function getShortTimeString(theDate) {
        return theDate.toString("HH:mm");
    }

    // returns a short time string for the given object, using hours:minutes
    function getShortDateString(theDate) {
        return theDate.toString("MMM d, yyyy");
    }

    // returns an OpenLayers.Geometry.Point that is a given distance from the map center
    // and distance in kilometers
    function createPointFromBearingAndDistance(bearing, distance) {
        // see http://www.movable-type.co.uk/scripts/latlong.html

        // convert lat and long from degrees to radians
        var lat1 = 2 * Math.PI  * global.mapCenterPosition.lat / 360.0;
        var lon1 = 2 * Math.PI  * global.mapCenterPosition.lon / 360.0;

        // compute destination in radians

        var lat2 = Math.asin( Math.sin(lat1)*Math.cos(distance / global.radiusOfEarthInMeters) + 
            Math.cos(lat1) * Math.sin(distance / global.radiusOfEarthInMeters) * Math.cos(bearing) );

        var lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / global.radiusOfEarthInMeters) * Math.cos(lat1), 
            Math.cos(distance / global.radiusOfEarthInMeters) - Math.sin(lat1) * Math.sin(lat2));

        // create new point from destination in radians
        return new OpenLayers.Geometry.Point(360.0 * lon2 / (2 * Math.PI), 360.0 * lat2 / (2 * Math.PI)).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
            );
    }

    // draw a radial line from the map center position at the azimuth determined by the sun's angle
    // at the given time of day
    function drawRadialLine(theColor, theLabel, fractionStart, fractionStop) {
        var sunPositionInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);
        var bearing = 2 * Math.PI * sunPositionInDegrees.azimuth / 360;

        var points = new Array(
            createPointFromBearingAndDistance(bearing, fractionStop * global.radiusOfCircleInMeters),
            createPointFromBearingAndDistance(bearing, fractionStart * global.radiusOfCircleInMeters)
        );

        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var lineStyle = { 
            strokeColor: theColor, 
            strokeOpacity: 1.0,
            fillOpacity: 1.0,
            strokeWidth: 4, 
            fillColor: theColor
        };

        // turn the line into a feature with the given style
        var lineFeature = new OpenLayers.Feature.Vector(line, null, lineStyle);
        global.lineLayer.addFeatures([lineFeature]);
    }

    function computeRadialSectionPoints(startAzimuthInRadians, stopAzimuthInRadians, startFraction, stopFraction) {
        var points = new Array();

        // draw the points around the edge of the circle
        for (var bearing = startAzimuthInRadians; bearing <= stopAzimuthInRadians; bearing += 0.2) {
            points.push(createPointFromBearingAndDistance(bearing, stopFraction * global.radiusOfCircleInMeters))
        }

        // add one last point around the circle for the final bearing
        points.push(createPointFromBearingAndDistance(stopAzimuthInRadians, stopFraction * global.radiusOfCircleInMeters));

        // draw the points around the edge of the circle
        for (var bearing = stopAzimuthInRadians; bearing >= startAzimuthInRadians; bearing -= 0.2) {
            points.push(createPointFromBearingAndDistance(bearing, startFraction * global.radiusOfCircleInMeters))
        }

        // add one last point around the circle for the final bearing
        points.push(createPointFromBearingAndDistance(startAzimuthInRadians, startFraction * global.radiusOfCircleInMeters));

        return points;
    }

    function fillPolygon(points, theColor) {
        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var lineStyle = { 
            strokeColor: theColor, 
            strokeOpacity: 0.5,
            fillOpacity: 1.0,
            stroke: false, 
            fillColor: theColor,
        };

        var linear_ring = new OpenLayers.Geometry.LinearRing(points);
        var polygonFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon([linear_ring]), null, lineStyle);

        global.lineLayer.addFeatures([polygonFeature]);
    }

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    function drawRadialSection(startName, stopName, startFraction, theColor) {
        if (global.lightTimes[startName] & global.lightTimes[stopName]) {
            var startAzimuthInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.lightTimes[startName]).azimuth;
            var startAzimuthInRadians = 2 * Math.PI * startAzimuthInDegrees / 360;

            var stopAzimuthInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.lightTimes[stopName]).azimuth;
            if (stopAzimuthInDegrees < startAzimuthInDegrees) {
                stopAzimuthInDegrees = stopAzimuthInDegrees + 360;
            }

            var stopAzimuthInRadians = 2 * Math.PI * stopAzimuthInDegrees / 360;

            fillPolygon(computeRadialSectionPoints(startAzimuthInRadians, stopAzimuthInRadians, startFraction, 1.0), theColor);
        }
    }

    function privateDrawCurrentTime(sunPositionInDegrees) {
        var summary = "Night";
        var color = "#000000";

        for (key in global.ranges) {
            rangeBounds = global.ranges[key];
            if (global.lightTimes[rangeBounds[0]] & global.lightTimes[rangeBounds[1]]) {
                if ((global.lightTimes[rangeBounds[0]] < global.currently) & (global.currently < global.lightTimes[rangeBounds[1]])) {
                    summary =
                        sunPositionInDegrees.altitude.toFixed(0) + "°, " + 
                        ((global.lightTimes[rangeBounds[1]] - global.currently) / 60000).toFixed(0) + " of " + 
                        ((global.lightTimes[rangeBounds[1]] - global.lightTimes[rangeBounds[0]]) / 60000) + " " + key.toLowerCase() + " mins left" 
                    color = rangeBounds[2];
                    break;
                }
            }
        }

        $('#trafficlight').attr('style', 'background-color: ' + color);
        $('#textSummary').text(summary);

        if (sunPositionInDegrees.altitude > 0) {
            drawRadialLine('#FFFFFF', getShortTimeString(currently), -0.9, 0.9);
            if (sunPositionInDegrees.altitude < 40) {
                drawRadialLine(color, getShortTimeString(currently), 0.0, 1.2);
                drawRadialLine('#000000', getShortTimeString(currently), 0.0, -0.8);
            } else {
                drawRadialLine('#000000', getShortTimeString(currently), 0.9, 1.2);
                drawRadialLine('#000000', getShortTimeString(currently), 0.0, -0.2);
            }
        }

        var markerPoint = createPointFromBearingAndDistance(0.0, 0.0);
        var markerFeature = new OpenLayers.Feature.Vector(markerPoint, {}, { graphicName: 'circle', pointRadius: 10, strokeColor: '#000', strokeWidth: 2, label: sunPositionInDegrees.altitude.toFixed(0) + "°", fontSize: '14pt', labelYOffset: -30 });
        global.lineLayer.addFeatures([markerFeature]);
    }

    function privateLabelHours() {
        for (var hourIndex = 0; hourIndex < 24; hourIndex++) {
            var hourMarksDate = new Date(global.currently);
            hourMarksDate.setHours(hourIndex);
            hourMarksDate.setMinutes(0);
            hourMarksDate.setSeconds(0);

            var hourMarkSunPositionInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, hourMarksDate);

            if (hourMarkSunPositionInDegrees.altitude > -10) {
                var bearing = 2 * Math.PI * hourMarkSunPositionInDegrees.azimuth / 360.0;

                var tickMarkPoints = new Array(
                    createPointFromBearingAndDistance(bearing, 1.0 * global.radiusOfCircleInMeters),
                    createPointFromBearingAndDistance(bearing, 1.02 * global.radiusOfCircleInMeters)
                );

                // make a line from the transformed points
                var tickMark = new OpenLayers.Geometry.LineString(tickMarkPoints);

                var tickMarkStyle = { 
                    strokeColor: '#222222', 
                    strokeOpacity: 0.9,
                    fillOpacity: 0.9,
                    strokeWidth: 2, 
                    fillColor: '#222222',
                };

                // turn the line into a feature with the given style
                var tickMarkFeature = new OpenLayers.Feature.Vector(tickMark, null, tickMarkStyle);
                global.lineLayer.addFeatures([tickMarkFeature]);

                if (hourMarkSunPositionInDegrees.altitude < 45) {

                    var hourLabelPoints = new Array(
                        createPointFromBearingAndDistance(bearing, 1.1 * global.radiusOfCircleInMeters),
                        createPointFromBearingAndDistance(bearing, 1.2 * global.radiusOfCircleInMeters)
                    );

                    // make a line from the transformed points
                    var hourLabel = new OpenLayers.Geometry.LineString(hourLabelPoints);

                    // turn the line into a feature with the given style
                    var hoursLabel = hourIndex + "";
                    if (hourIndex < 10) {
                        hoursLabel = "0" + hourIndex;
                    }
                    var hourLabelFeature = new OpenLayers.Feature.Vector(hourLabel, null, { stroke: false, label: hoursLabel, fontSize: '10pt' });
                    global.lineLayer.addFeatures([hourLabelFeature]);
                }
            }
        }
    }

    function privateDrawCircles() {
        var radialSectionFraction = 0.9;

        // draw some constant circles
        fillPolygon(computeRadialSectionPoints(0.001, 1.999 * Math.PI, 1.0, 1.2), '#FFFFFF');

        // TODO: are these always valid?
        drawRadialSection('eveningStop', 'sunset', radialSectionFraction, '#C4B11B');
        drawRadialSection('sunset', 'predawn', radialSectionFraction, '#000000');
        drawRadialSection('predawn', 'morningStart', radialSectionFraction, '#C4B11B');

        drawRadialSection('morningStart', 'morningStop', radialSectionFraction, '#0F960F');
        drawRadialSection('eveningStart', 'eveningStop', radialSectionFraction, '#0F960F');

        if ((global.lightTimes['morningStop']) & (global.lightTimes['highStart']) & (global.lightTimes['highStop']) & (global.lightTimes['eveningStart'])) {
            drawRadialSection('morningStart', 'morningStop', radialSectionFraction, '#0F960F');
            drawRadialSection('eveningStart', 'eveningStop', radialSectionFraction, '#0F960F');

            drawRadialSection('morningStop', 'highStart', radialSectionFraction, '#C4B11B');
            drawRadialSection('highStart', 'highStop', radialSectionFraction, '#9C1E0B');
            drawRadialSection('highStop', 'eveningStart', radialSectionFraction, '#C4B11B');
        } else if ((global.lightTimes['morningStop']) & (global.lightTimes['eveningStart'])) {
            drawRadialSection('morningStop', 'eveningStart', radialSectionFraction, '#C4B11B');
        } else {
            drawRadialSection('morningStart', 'eveningStop', radialSectionFraction, '#0F960F');            
        }
    }

    // draws the sun rose at the current map center for the given date and time
    function logCurrentSunPosition(map) {
        var windowBounds = global.map.calculateBounds();

        // scale up the radius of the circle according to the bounds of the map
        global.radiusOfCircleInMeters = Math.min(windowBounds.top - windowBounds.bottom, windowBounds.right - windowBounds.left) / 3.5;
        // but don't go above a certain size no matter what.
        global.radiusOfCircleInMeters = Math.min(global.radiusOfCircleInMeters, 1000000);

        $('#datebutton').text(getShortDateString(global.currently));
        $('#timebutton').text(getShortTimeString(global.currently));

        global.mapCenterPosition = global.map.getCenter().transform(
                global.map.getProjectionObject(), // to Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
            );

        // save the map center in local storage
        localStorage.setItem("latitude", global.mapCenterPosition.lat);
        localStorage.setItem("longitude", global.mapCenterPosition.lon);
        localStorage.setItem("zoom", global.map.getZoom());

        global.lightTimes = getLightTimes(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);

        var sunPositionInDegrees = getSunPositionInDegrees(global.mapCenterPosition.lon, global.mapCenterPosition.lat, global.currently);

        // remove all features from the layer
        global.lineLayer.removeAllFeatures();

        privateDrawCircles()

        privateLabelHours()

        privateDrawCurrentTime(sunPositionInDegrees);
    }

    // get the day number based on Julian calendar
    function getJulianDate(y, m, d, u)
    {
        return (367 * y) - Math.floor((7/4) * (Math.floor((m + 9) / 12) + y)) + Math.floor(275 * m / 9) + d - 730531.5 + (u / 24)
    }

    function getSunPositionInDegrees(lg, la, theDate)
    {
        with (Math) {
            var uu = theDate.getUTCHours() + theDate.getUTCMinutes() / 60.0;
            var jj=getJulianDate(theDate.getFullYear(), theDate.getMonth() + 1, theDate.getDate(), uu);

            var T=jj/36525;
            var k=PI/180.0;
            var M=357.5291+35999.0503*T-0.0001559*T*T-0.00000045*T*T*T

            M=M % 360
            
            var Lo=280.46645+36000.76983*T+0.0003032*T*T
            
            Lo=Lo % 360
            
            var DL=(1.9146-0.004817*T-0.000014*T*T)*sin(k*M)+(0.019993-0.000101*T)*sin(k*2*M)+0.00029*sin(k*3*M)
            var L=Lo+DL
            var eps=23.43999-0.013*T
            var delta=(1/k)*asin(sin(L*k)*sin(eps*k))
            var RA=(1/k)*atan2(cos(eps*k)*sin(L*k),cos(L*k))
            
            RA=(RA+360) % 360
            
            // compute sidearal time
            var GMST=280.46061837+360.98564736629*jj+0.000387933*T*T-T*T*T/38710000
            
            GMST=(GMST+360) % 360
            
            var LMST=GMST+lg
            var H=LMST-RA
            var eqt=(Lo-RA)*4

            var azm=(1/k)*atan2(-sin(H*k),cos(la*k)*tan(delta*k)-sin(la*k)*cos(H*k))            
            azm=(azm+360) % 360

            var alt=(1/k)*asin(sin(la*k)*sin(delta*k)+cos(la*k)*cos(delta*k)*cos(H*k))

            return {'altitude': alt, 'azimuth': azm}
        }
    }

    // returns the first time when the sun goes above the given angle
    function getLightTimes(longitude, latitude, theDate) {
        var listOfTimes = {};
        var firstAngles = new Array();
        var firstNames = new Array();

        for (key in global.firstSunAngles) {
            firstAngles.push(global.firstSunAngles[key]);
            firstNames.push(key);
        }   

        for (var hours = 0; hours < 24; hours++) {
            for (var minutes = 0; minutes < 60; minutes++) {
                var tempDate = new Date(theDate);
                tempDate.setHours(hours);
                tempDate.setMinutes(minutes);

                if (getSunPositionInDegrees(longitude, latitude, tempDate).altitude >= firstAngles[0]) {
                    listOfTimes[firstNames[0]] = tempDate;
                    firstAngles.shift();
                    firstNames.shift();
                }

                if (firstAngles.length == 0) {
                    break;
                }
            }
        }

        var lastAngles = new Array();
        var lastNames = new Array();

        for (key in global.lastSunAngles) {
            lastAngles.push(global.lastSunAngles[key]);
            lastNames.push(key);
        }   

        for (var hours = 23; hours >= 0; hours--) {
            for (var minutes = 59; minutes >= 0; minutes--) {
                var tempDate = new Date(theDate);
                tempDate.setHours(hours);
                tempDate.setMinutes(minutes);

                if (getSunPositionInDegrees(longitude, latitude, tempDate).altitude >= lastAngles[0]) {
                    listOfTimes[lastNames[0]] = tempDate;
                    lastAngles.shift();
                    lastNames.shift();
                }

                if (lastAngles.length == 0) {
                    break;
                }
            }
        }

        return listOfTimes;
    }

    $(document).ready(function(){
        // create the map associated with the div
        global.map = new OpenLayers.Map("mapdiv");

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

        // http://blog.slashpoundbang.com/post/1479986159/using-cloudmade-tiles-on-openlayers-maps-with
        // my API key: 65b34ce81f654104966762b19832ab13

        // global.map.addLayer(new OpenLayers.Layer.CloudMade('CloudMade', {
        //   key: '65b34ce81f654104966762b19832ab13',
        //   styleId: '5870'
        // }));

        global.map.addLayer(mapquestOSM);
        global.map.addLayer(cloudCoverTiles);
        // global.map.addLayer(openCycleTiles);
        // global.map.addLayer(aerialTiles);

        // create a line layer, for drawing lines to show sun direction
        global.lineLayer = new OpenLayers.Layer.Vector("Line Layer"); 
        global.map.addLayer(global.lineLayer);       

        // var pois = new OpenLayers.Layer.Text( "My Points",
        //     { location:"./birding.txt",
        //         projection: global.map.displayProjection
        //     });

        // global.map.addLayer(pois);      

        // initialize map to saved lat/long and zoom or else zoom to center of USA
        if ( localStorage.getItem("latitude")) {
            var savedLatitude = localStorage.getItem("latitude");
            var savedLongitude = localStorage.getItem("longitude");
            var savedZoom = localStorage.getItem("zoom");
            centerMapAt(global.map, savedLongitude, savedLatitude, savedZoom);            
        } else {
            // initialize map to center of USA
            centerMapAt(global.map, -98, 38, 4);
        }      

        // show sundial for current date/time
        logCurrentSunPosition(global.map); 

        // redo the timeline whenever we move the map
        global.map.events.register('move', global.map, function() {
            logCurrentSunPosition(global.map);
        });

        // check once a minute to track date/time
        window.setInterval(function() {
            if (global.showCurrentDateTime) {
                global.currently = new Date();
                logCurrentSunPosition(global.map);
            }
        }, 60000);

        // clicking the HERE button tries to geolocate
        $("#herebutton").click(function() {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    centerMapAt(global.map, position.coords.longitude, position.coords.latitude, 15);
                },
                function(err) {
                    console.log("GEOLOCATION FAIL " + err.message);
                });
        });

        // clicking the DATE button tries to set the date and stop tracking current date/time
        $("#datebutton").click(function() {
            var currentDate = new Date();
            var chosenDateString = prompt("Set Date", getShortDateString(currentDate));
            global.currently = Date.parse(chosenDateString);
            global.showCurrentDateTime = false;
            $('#nowbuttonimage').attr('src', 'img/icons/media_play.png');
            logCurrentSunPosition(global.map);
        });

        // clicking the TIME button tries to set the date and stop tracking current date/time
        $("#timebutton").click(function() {
            var currentTime = new Date();
            var chosenTimeString = prompt("Set Date", getShortTimeString(currentTime));
            var chosenTime = Date.parse(chosenTimeString);
            global.currently.setMinutes(chosenTime.getMinutes());
            global.currently.setHours(chosenTime.getHours());
            global.showCurrentDateTime = false;
            $('#nowbuttonimage').attr('src', 'img/icons/media_play.png');
            logCurrentSunPosition(global.map);
       });

        // clicking the NOW button toggles whether we're tracking the current date/time
        $("#nowbutton").click(function() {
            if (global.showCurrentDateTime) {
                global.showCurrentDateTime = false;
                $('#nowbuttonimage').attr('src', 'img/icons/media_play.png');
            } else {
                global.showCurrentDateTime = true;
                global.currently = new Date();
                logCurrentSunPosition(global.map);
                $('#nowbuttonimage').attr('src', 'img/icons/media_pause.png');
            }
        });

        // clicking the help button opens the help screen
        $("#helpbutton").click(function() {
            console.log("SHOW");
            $("#helpContainer").show();            
        });

        // clicking the close button closes the help screen
        $("#closebutton").click(function() {
            console.log("HIDE");
            $("#helpContainer").hide();            
        });

    });

    // If using Twitter Bootstrap, you need to require all the
    // components that you use, like so:
    // require('bootstrap/dropdown');
    // require('bootstrap/alert');
});

// Include the in-app payments API, and if it fails to load handle it
// gracefully.
// https://developer.mozilla.org/en/Apps/In-app_payments
require(['https://marketplace-cdn.addons.mozilla.net/mozmarket.js'],
        function() {},
        function(err) {
            global.mozmarket = global.mozmarket || {};
            global.mozmarket.buy = function() {
                alert('The in-app purchasing is currently unavailable.');
            };
        });
