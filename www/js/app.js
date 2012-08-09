
// The code below uses require.js, a module system for javscript:
// http://requirejs.org/docs/api.html#define

// Set the path to jQuery, which will fall back to the local version
// if google is down
require.config({
     baseUrl: "js/lib",

     paths: {'jquery':
             ['jquery']}
});

var global = this;

// When you write javascript in separate files, list them as
// dependencies along with jquery
require(['jquery', 'date'], function($) {

    // draw a line at the given angle centered on the given point
    function drawLine(map, lineLayer, longitude, latitude, angleInDegrees, altitudeInDegrees) {
        // remove all features from the layer
        lineLayer.removeAllFeatures();

        // compute line endpoints based around given lat and long
        var angleInRadians = 2 * Math.PI * angleInDegrees / 360;

        var lon1 = longitude - 0.00 * Math.sin(angleInRadians);
        var lat1 = latitude - 0.00 * Math.cos(angleInRadians);
        var lon2 = longitude + 0.01 * Math.sin(angleInRadians);
        var lat2 = latitude + 0.01 * Math.cos(angleInRadians);

        // transform the lats and longs into the proper coordinate system
        var points = new Array(
           new OpenLayers.Geometry.Point(lon1, lat1).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                map.getProjectionObject() // to Spherical Mercator Projection
              ),
           new OpenLayers.Geometry.Point(lon2, lat2).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                map.getProjectionObject() // to Spherical Mercator Projection
              )
        );

        // make a line from the transformed points
        var line = new OpenLayers.Geometry.LineString(points);

        var markerStyle = {
            graphicName: 'circle',
            strokeColor: '#000',
            strokeWidth: 2,
            fillOpacity: 0,
            pointRadius: 15,
            label: "angle " + angleInDegrees.toFixed(1) + " altitude " + altitudeInDegrees.toFixed(1),
            labelYOffset: -30,
        };

        var lineStyle = { 
            strokeColor: '#333333', 
            strokeOpacity: 0.7,
            fillOpacity: 0.5,
            strokeWidth: 3, 
            fillColor: "#999999"
        };

        // turn the line into a feature with the given style
        var lineFeature = new OpenLayers.Feature.Vector(line, null, lineStyle);

        // make an origin point
        var markerOrigin = new OpenLayers.Geometry.Point(lon1, lat1).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                map.getProjectionObject() // to Spherical Mercator Projection
            );

        // place a circle graphic at the origin point
        var markerFeature = new OpenLayers.Feature.Vector(markerOrigin, {}, markerStyle);

        // add the line and the circle to the vector layer
        lineLayer.addFeatures([markerFeature]);
        lineLayer.addFeatures([lineFeature]);
    }

    // center the map on the given location
    function centerMapAt(map, longitude, latitude, zoom) {
        //Set center and zoom
        var newMapCenter = new OpenLayers.LonLat(longitude, latitude).transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                map.getProjectionObject() // to Spherical Mercator Projection
              );

        map.setCenter(newMapCenter, zoom);  
    };

    // returns a short time string for the given object, using hours:minutes
    function getShortTimeString(theDate) {
        return theDate.toString("HH:mm");
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

    // for a given date and location, show when we think the golden light is
    // note: time expressed in local time for the user
    function drawGoldenHours(theDate, longitude, latitude) {
        var morningStart = getFirstLight(longitude, latitude, theDate, 5);
        var morningStop = getFirstLight(longitude, latitude, theDate, 35);
        var eveningStart = getLastLight(longitude, latitude, theDate, 35);
        var eveningStop = getLastLight(longitude, latitude, theDate, 5);

        var timelineWidth = window.innerWidth;

        $('#morning').attr("x", 5 + getFractionOfDay(morningStart) * timelineWidth);
        $('#morning').attr("width", 5 + (getFractionOfDay(morningStop) - getFractionOfDay(morningStart)) * timelineWidth);

        $('#evening').attr("x", 5 + getFractionOfDay(eveningStart) * timelineWidth);
        $('#evening').attr("width", 5 + (getFractionOfDay(eveningStop) - getFractionOfDay(eveningStart)) * timelineWidth);

        $('#now').attr("x", 5 + getFractionOfDay(theDate) * timelineWidth);
        $('#nowLabel').attr("x", 8 + getFractionOfDay(theDate) * timelineWidth);
        $('#nowLabel').text(getShortTimeString(theDate));

        $('#timeline').attr('width', timelineWidth);
        $('#axis1').attr('x2', timelineWidth - 5);
        $('#axis2').attr('x2', timelineWidth - 5);
    }

    // draws a line on the map for the current sun angle
    // insert the current azimuth and altitude into the HTML
    function logCurrentSunPosition(map, lineLayer, currently) {
        currently = currently || new Date();

        var mapCenterPosition = map.getCenter().transform(
                map.getProjectionObject(), // to Spherical Mercator Projection
                new OpenLayers.Projection("EPSG:4326") // transform from WGS 1984
              );

        drawGoldenHours(currently, mapCenterPosition.lon, mapCenterPosition.lat);

        var currentAzimuth = azimuth(mapCenterPosition.lon, mapCenterPosition.lat, currently);
        var currentAltitude = altitude(mapCenterPosition.lon, mapCenterPosition.lat, currently);

        drawLine(map, lineLayer, mapCenterPosition.lon, mapCenterPosition.lat, currentAzimuth, currentAltitude);            

        $("#azimuth").text(currentAzimuth.toFixed(0));
        $("#altitude").text(currentAltitude.toFixed(0));
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

    function azimuth(lg, la, theDate)
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

    function altitude(lg, la, theDate)
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

                if (altitude(longitude, latitude, tempDate) >= angleInDegrees) {
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

                if (altitude(longitude, latitude, tempDate) >= angleInDegrees) {
                    return tempDate;
                }
            }
        }
    }

    $(document).ready(function(){
        // create the map associated with the div
        var map = new OpenLayers.Map("mapdiv");
        map.addLayer(new OpenLayers.Layer.OSM());

        // create a line layer, for drawing lines to show sun direction
        var lineLayer = new OpenLayers.Layer.Vector("Line Layer"); 
        map.addLayer(lineLayer);           

        // initialize map to center of USA
        centerMapAt(map, -98, 38, 4);

        // set up the day's timeline
        logCurrentSunPosition(map, lineLayer); 

        // redo the timeline whenever we resize
        $(window).resize(function() {
            logCurrentSunPosition(map, lineLayer); 
        });        

        // redo the timeline whenever we move the map
        map.events.register('moveend', map, function() {
            logCurrentSunPosition(map, lineLayer);
        });

        window.setInterval(function() { logCurrentSunPosition(map, lineLayer) }, 60000);

        $("#herebutton").click(function() {

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    centerMapAt(map, position.coords.longitude, position.coords.latitude, 15);
                },
                function(err) {
                    console.log("GEOLOCATION FAIL");
                });
        });

        $('#timeline').bind("click", function (event) {
            var value = event.clientX - 8;
            var timelineWidth = window.innerWidth;
            $('#thumb').attr("transform", "translate(" + (value) + " 0)");
            var thumbDate = getDateFromFraction(value / timelineWidth);
            logCurrentSunPosition(map, lineLayer, thumbDate);
        });
        $('#timeline').bind("mousemove", function (event) {
            var value = event.clientX - 8;
            if (sliderActive) {
                var timelineWidth = window.innerWidth;
                $('#thumb').attr("transform", "translate(" + (value) + " 0)");
                var thumbDate = getDateFromFraction(value / timelineWidth);
                logCurrentSunPosition(map, lineLayer, thumbDate);
            }
        });
        $('#timeline').bind("mouseup", function (event) {
            sliderActive = false;
        });
        $('#timeline').bind("mousedown", function (event) {
            sliderActive = true;
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
