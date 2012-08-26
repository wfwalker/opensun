
// The code below uses require.js, a module system for javscript:
// http://requirejs.org/docs/api.html#define

// Set the path to jQuery, which will fall back to the local version
// if google is down
require.config({
     baseUrl: "js/lib",

     paths: {'jquery': ['jquery'], 'jquery.tools': ['jquery.tools.min']}
});

var global = this;

// When you write javascript in separate files, list them as
// dependencies along with jquery
require(['jquery', 'jquery.tools', 'date'], function($) {

    // radius of Earth = 6,378,100 meters
    global.radiusOfEarthInMeters = 6378100.0;
    global.radiusOfCircleInMeters = 1000.0;
 
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
        return theDate.toString("yyyy-MM-dd");
    }

    // returns a floating point value between 0 and 1 based on hours and minutes
    function getFractionOfDay(theDate) {
        return (theDate.getHours() + (theDate.getMinutes() / 60.0)) / 24.0;
    }

    // returns a floating point value between 0 and 1 based on hours and minutes
    function getDateFromFraction(theFraction) {
        var hours = (24 * theFraction).toFixed(0);
        var minutes = (24 * 60 * theFraction) - (hours * 60)
        theDate = new Date();
        theDate.setHours(hours);
        theDate.setMinutes(minutes);
        return theDate;
    }

    // returns an OpenLayers.Geometry.Point that is a given distance from the map center
    // and distance in kilometers
    function createPointFromBearingAndDistance(mapCenterPosition, bearing, distance) {
        // see http://www.movable-type.co.uk/scripts/latlong.html

        // convert lat and long from degrees to radians
        var lat1 = 2 * Math.PI  * mapCenterPosition.lat / 360.0;
        var lon1 = 2 * Math.PI  * mapCenterPosition.lon / 360.0;

        // compute destination in radians

        var lat2 = Math.asin( Math.sin(lat1)*Math.cos(distance / global.radiusOfEarthInMeters) + 
        Math.cos(lat1)*Math.sin(distance / global.radiusOfEarthInMeters)*Math.cos(bearing) );

        var lon2 = lon1 + Math.atan2(Math.sin(bearing)*Math.sin(distance / global.radiusOfEarthInMeters)*Math.cos(lat1), 
        Math.cos(distance / global.radiusOfEarthInMeters)-Math.sin(lat1)*Math.sin(lat2));

        // create new point from destination in radians
        return new OpenLayers.Geometry.Point(360.0 * lon2 / (2 * Math.PI), 360.0 * lat2 / (2 * Math.PI)).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
            );
    }

    // draw a radial line from the map center position at the azimuth determined by the sun's angle
    // at the given time of day
    function drawRadialLine(mapCenterPosition, theDate, lineLayer, theColor, theLabel) {
        var azimuthInDegrees = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, theDate);
        var bearing = 2 * Math.PI * azimuthInDegrees / 360;

        var points = new Array(
            createPointFromBearingAndDistance(mapCenterPosition, bearing, global.radiusOfCircleInMeters),
            createPointFromBearingAndDistance(mapCenterPosition, bearing, 0.0 * global.radiusOfCircleInMeters)
        );

        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var lineStyle = { 
            strokeColor: theColor, 
            strokeOpacity: 0.8,
            fillOpacity: 0.8,
            strokeWidth: 3, 
            fillColor: theColor
        };

        // turn the line into a feature with the given style
        var lineFeature = new OpenLayers.Feature.Vector(line, null, lineStyle);
        lineLayer.addFeatures([lineFeature]);
    }

    // draw a radial line from the map center position at the azimuth determined by the sun's angle
    // at the given time of day
    function drawRadialLabel(mapCenterPosition, theDate, lineLayer, theColor, theLabel) {
        var azimuthInDegrees = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, theDate);
        var bearing = 2 * Math.PI * azimuthInDegrees / 360;

        var points = new Array(
            createPointFromBearingAndDistance(mapCenterPosition, bearing, global.radiusOfCircleInMeters),
            createPointFromBearingAndDistance(mapCenterPosition, bearing, 0.0 * global.radiusOfCircleInMeters)
        );

        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var lineStyle = { 
            strokeColor: theColor, 
            strokeOpacity: 0.8,
            fillOpacity: 0.8,
            stroke: false, 
            fillColor: theColor
        };

        // turn the line into a feature with the given style
        var lineFeature = new OpenLayers.Feature.Vector(line, null, lineStyle);
        lineLayer.addFeatures([lineFeature]);
    }

    // draw a radial section from the map center through a range of angles determined by the 
    // sun's azimuth at the given times of day
    function drawRadialSection(mapCenterPosition, theStartDate, theStopDate, lineLayer, theColor) {
        var startAzimuthInDegrees = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, theStartDate);
        var startAzimuthInRadians = 2 * Math.PI * startAzimuthInDegrees / 360;

        var stopAzimuthInDegrees = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, theStopDate);

        if (stopAzimuthInDegrees < startAzimuthInDegrees) {
            stopAzimuthInDegrees = stopAzimuthInDegrees + 360;
        }

        var stopAzimuthInRadians = 2 * Math.PI * stopAzimuthInDegrees / 360;

        // transform the lats and longs into the proper coordinate system
        var points = new Array(
           new OpenLayers.Geometry.Point(mapCenterPosition.lon, mapCenterPosition.lat).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                global.map.getProjectionObject() // to Spherical Mercator Projection
              ));

        // draw the points around the edge of the circle
        for (var bearing = startAzimuthInRadians; bearing < stopAzimuthInRadians; bearing += 0.2) {
            points.push(createPointFromBearingAndDistance(mapCenterPosition, bearing, global.radiusOfCircleInMeters))
        }
        // add one last point around the circle for the final bearing
        points.push(createPointFromBearingAndDistance(mapCenterPosition, stopAzimuthInRadians, global.radiusOfCircleInMeters));

        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var lineStyle = { 
            strokeColor: theColor, 
            strokeOpacity: 0.5,
            fillOpacity: 0.5,
            stroke: false, 
            fillColor: theColor,
        };

        var linear_ring = new OpenLayers.Geometry.LinearRing(points);
        var polygonFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon([linear_ring]), null, lineStyle);

        lineLayer.addFeatures([polygonFeature]);

        // draw a radial line at the start of the radial section to label the start time
        drawRadialLabel(mapCenterPosition, theStartDate, lineLayer, '#444444', getShortTimeString(theStartDate));
    }


    // draws the sun rose at the current map center for the given date and time
    function logCurrentSunPosition(map, lineLayer, currently) {
        currently = currently || new Date();

        var windowBounds = global.map.calculateBounds();
        global.radiusOfCircleInMeters = Math.min(windowBounds.top - windowBounds.bottom, windowBounds.right - windowBounds.left) / 3.5;

        $('#datebutton').text(getShortDateString(currently));

        var mapCenterPosition = global.map.getCenter().transform(
                global.map.getProjectionObject(), // to Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
            );

        var morningStart = getFirstLight(mapCenterPosition.lon, mapCenterPosition.lat, currently, 5);
        var morningStop = getFirstLight(mapCenterPosition.lon, mapCenterPosition.lat, currently, 30);
        var eveningStart = getLastLight(mapCenterPosition.lon, mapCenterPosition.lat, currently, 30);
        var eveningStop = getLastLight(mapCenterPosition.lon, mapCenterPosition.lat, currently, 5);

        var currentAzimuth = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, currently);
        var currentAltitude = getAltitudeInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, currently);

        // remove all features from the layer
        lineLayer.removeAllFeatures();

        drawRadialSection(mapCenterPosition, morningStop, eveningStart, lineLayer, '#DD0000');
        // drawRadialSection(mapCenterPosition, eveningStop, morningStart, lineLayer, '#999999');
        drawRadialSection(mapCenterPosition, morningStart, morningStop, lineLayer, '#009900');
        drawRadialSection(mapCenterPosition, eveningStart, eveningStop, lineLayer, '#009900');

        drawRadialLine(mapCenterPosition, currently, lineLayer, '#000000', getShortTimeString(currently));

        var markerStyle = {
            graphicName: 'circle',
            strokeColor: '#000',
            strokeWidth: 2,
            fillOpacity: 0,
            pointRadius: 15,
        };

        for (var hourIndex = 0; hourIndex < 24; hourIndex++) {
            var hourMarksDate = new Date(currently);
            hourMarksDate.setHours(hourIndex);
            hourMarksDate.setMinutes(0);

            var azimuthInDegrees = getAzimuthInDegrees(mapCenterPosition.lon, mapCenterPosition.lat, hourMarksDate);
            var bearing = 2 * Math.PI * azimuthInDegrees / 360.0;
            var tickMarkPoints = new Array(
                createPointFromBearingAndDistance(mapCenterPosition, bearing, global.radiusOfCircleInMeters),
                createPointFromBearingAndDistance(mapCenterPosition, bearing, 0.95 * global.radiusOfCircleInMeters)
            );

            // make a line from the transformed points
            var tickMark = new OpenLayers.Geometry.LineString(tickMarkPoints);

            var tickMarkStyle = { 
                strokeColor: '#222222', 
                strokeOpacity: 0.9,
                fillOpacity: 0.9,
                strokeWidth: 2, 
                fillColor: '#222222'
            };

            // turn the line into a feature with the given style
            var tickMarkFeature = new OpenLayers.Feature.Vector(tickMark, null, tickMarkStyle);
            lineLayer.addFeatures([tickMarkFeature]);

            var hourLabelPoints = new Array(
                createPointFromBearingAndDistance(mapCenterPosition, bearing, 1.1 * global.radiusOfCircleInMeters),
                createPointFromBearingAndDistance(mapCenterPosition, bearing, 1.2 * global.radiusOfCircleInMeters)
            );

            // make a line from the transformed points
            var hourLabel = new OpenLayers.Geometry.LineString(hourLabelPoints);

            var hourLabelStyle = { 
                strokeColor: '#222222', 
                strokeOpacity: 0.9,
                fillOpacity: 0.9,
                stroke: false, 
                label: hourIndex + "",
                fillColor: '#222222'
            };

            // turn the line into a feature with the given style
            var hourLabelFeature = new OpenLayers.Feature.Vector(hourLabel, null, hourLabelStyle);
            lineLayer.addFeatures([hourLabelFeature]);
        }
    }

    // get the universal time in fractional hours
    function getUniversalTime(h,m,z)
    {
        return (h-z+m/60);
    }

    // get the julian date (I think) for the given year, month, date, and universal time
    function getJulianDate(y,m,d,u)
    {
        return (367*y)-Math.floor((7/4)*(Math.floor((m+9)/12)+y))+Math.floor(275*m/9)+d-730531.5+(u/24)
    }

    function getAzimuthInDegrees(lg, la, theDate)
    {
        with (Math) {
            var uu=getUniversalTime(theDate.getUTCHours(), theDate.getUTCMinutes(), 0);
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
            
            var GMST=280.46061837+360.98564736629*jj+0.000387933*T*T-T*T*T/38710000
            
            GMST=(GMST+360) % 360
            
            var LMST=GMST+lg
            var H=LMST-RA
            var eqt=(Lo-RA)*4
            var azm=(1/k)*atan2(-sin(H*k),cos(la*k)*tan(delta*k)-sin(la*k)*cos(H*k))
            
            azm=(azm+360) % 360

            return azm
        }
    }

    function getAltitudeInDegrees(lg, la, theDate)
    {
        with (Math) {
            var uu=getUniversalTime(theDate.getUTCHours(), theDate.getUTCMinutes(), 0);
            var jj=getJulianDate(theDate.getFullYear(), theDate.getMonth() + 1, theDate.getDate(), uu);
            var T=jj/36525;
            var k=PI/180.0;
            var M=357.5291+35999.0503*T-0.0001559*T*T-0.00000045*T*T*T

            M=M % 360
            
            var Lo=280.46645+36000.76983*T+0.0003032*T*T

            Lo=Lo % 360

            var DL=(1.9146-0.004817*T-0.000014*T*T)*sin(k*M)+(0.019993-0.000101*T)*sin(k*2*M)+0.00029*sin(k*3*M)

            L=Lo+DL

            var eps=23.43999-0.013*T
            var delta=(1/k)*asin(sin(L*k)*sin(eps*k))
            var RA=(1/k)*atan2(cos(eps*k)*sin(L*k),cos(L*k))

            RA=(RA+360) % 360

            var GMST=280.46061837+360.98564736629*jj+0.000387933*T*T-T*T*T/38710000

            GMST=(GMST+360) % 360

            var LMST=GMST+lg
            var H=LMST-RA
            var eqt=(Lo-RA)*4
            var alt=(1/k)*asin(sin(la*k)*sin(delta*k)+cos(la*k)*cos(delta*k)*cos(H*k))

            return alt;
        }
    }

    // returns the first time when the sun goes above the given angle
    function getFirstLight(longitude, latitude, theDate, angleInDegrees) {
        for (var hours = 0; hours < 24; hours++) {
            for (var minutes = 0; minutes < 60; minutes++) {
                var tempDate = new Date(theDate);
                tempDate.setHours(hours);
                tempDate.setMinutes(minutes);

                if (getAltitudeInDegrees(longitude, latitude, tempDate) >= angleInDegrees) {
                    return tempDate;
                }
            }
        }
    }

    // returns the last time when the sun goes below the given angle
    function getLastLight(longitude, latitude, theDate, angleInDegrees) {
        for (var hours = 23; hours >= 0; hours--) {
            for (var minutes = 59; minutes >= 0; minutes--) {
                var tempDate = new Date(theDate);
                tempDate.setHours(hours);
                tempDate.setMinutes(minutes);

                if (getAltitudeInDegrees(longitude, latitude, tempDate) >= angleInDegrees) {
                    return tempDate;
                }
            }
        }
    }

    $(document).ready(function(){
        // create the map associated with the div
        global.map = new OpenLayers.Map("mapdiv");
        global.map.addLayer(new OpenLayers.Layer.OSM());

        // create a line layer, for drawing lines to show sun direction
        var lineLayer = new OpenLayers.Layer.Vector("Line Layer"); 
        global.map.addLayer(lineLayer);       

        var pois = new OpenLayers.Layer.Text( "My Points",
            { location:"./birding.txt",
                projection: global.map.displayProjection
            });

        global.map.addLayer(pois);            

        // initialize map to center of USA
        centerMapAt(global.map, -98, 38, 4);

        // set up the day's timeline
        logCurrentSunPosition(global.map, lineLayer); 

        // redo the timeline whenever we move the map
        global.map.events.register('move', global.map, function() {
            logCurrentSunPosition(global.map, lineLayer);
        });

        window.setInterval(function() { logCurrentSunPosition(global.map, lineLayer) }, 60000);

        $("#herebutton").click(function() {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    centerMapAt(global.map, position.coords.longitude, position.coords.latitude, 15);
                },
                function(err) {
                    console.log("GEOLOCATION FAIL");
                });
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
