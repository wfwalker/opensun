var global = this;

// returns a short time string for the given object, using hours:minutes
function getShortTimeString(theDate) {
    return theDate.toString("HH:mm");
}

// returns a short time string for the given object, using hours:minutes
function getShortDateString(theDate) {
    return theDate.toString("MMM d, yyyy");
}

// sun angles for rising and setting sun
global.firstSunAngles = { 'predawn': -1 , 'morningStart': 5, 'morningStop': 25, 'highStart': 40}
global.lastSunAngles = { 'sunset': -1, 'eveningStop': 5, 'eveningStart': 25, 'highStop': 40 }

// get the day number based on Julian calendar
function getJulianDate(y, m, d, u)
{
    return (367 * y) - Math.floor((7/4) * (Math.floor((m + 9) / 12) + y)) + Math.floor(275 * m / 9) + d - 730531.5 + (u / 24)
}

// get the sun position (altitude and azimuth) in degrees for the given latitude, longitude, and date
function getSunPositionInDegrees(lg, la, theDate)
{
    // TODO: don't use with (Math)

    var uu = theDate.getUTCHours() + theDate.getUTCMinutes() / 60.0;
    var jj = getJulianDate(theDate.getFullYear(), theDate.getMonth() + 1, theDate.getDate(), uu);

    var T = jj / 36525;
    var k = Math.PI / 180.0;
    var M=357.5291 + 35999.0503 * T - 0.0001559 * T*T - 0.00000045 * T*T*T

    M = M % 360
    
    var Lo = 280.46645 + 36000.76983 * T + 0.0003032 * T*T
    
    Lo = Lo % 360
    
    var DL = (1.9146 - 0.004817 * T - 0.000014 * T*T) * Math.sin(k * M) + (0.019993 - 0.000101 * T) * Math.sin(k * 2 * M) + 0.00029 * Math.sin(k * 3 * M)
    var L = Lo + DL
    var eps = 23.43999 - 0.013 * T
    var delta = (1 / k) * Math.asin(Math.sin(L * k) * Math.sin(eps * k))
    var RA = (1 / k) * Math.atan2(Math.cos(eps * k) * Math.sin(L* k ),Math.cos(L * k))
    
    RA = (RA + 360) % 360
    
    // compute sidearal time
    var GMST=280.46061837 + 360.98564736629 * jj + 0.000387933 * T*T - T*T*T / 38710000
    
    GMST=(GMST+360) % 360
    
    var LMST=GMST+lg
    var H=LMST-RA
    var eqt=(Lo-RA)*4

    var azm = (1 / k) * Math.atan2(-Math.sin(H * k), Math.cos(la * k) * Math.tan(delta * k)- Math.sin(la*k)* Math.cos(H*k))            
    azm = (azm + 360) % 360

    var alt = (1 / k) * Math.asin(Math.sin(la * k) * Math.sin(delta*k) + Math.cos(la*k) * Math.cos(delta*k) * Math.cos(H*k))

    return {'altitude': alt, 'azimuth': azm}
}

// returns the first time when the sun goes above the given angle
// NEED ONLY be called when location changes or once per day -- does not need to be called as time changes within a day
function getLightTimes(longitude, latitude, theDate) {
    var listOfTimes = {};
    var firstAngles = new Array();
    var firstNames = new Array();
    var lowest = 90;
    var highest = -90;

    for (key in global.firstSunAngles) {
        firstAngles.push(global.firstSunAngles[key]);
        firstNames.push(key);
    }   

    for (var hours = 0; hours < 24; hours++) {
        for (var minutes = 0; minutes < 60; minutes++) {
            var tempDate = new Date(theDate);
            tempDate.setHours(hours);
            tempDate.setMinutes(minutes);

            var tempAltitude = getSunPositionInDegrees(longitude, latitude, tempDate).altitude;

            if (tempAltitude > highest) {
                highest = tempAltitude;
            }

            if (tempAltitude < lowest) {
                lowest = tempAltitude;
            }

            if (tempAltitude >= firstAngles[0]) {
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

            var tempAltitude = getSunPositionInDegrees(longitude, latitude, tempDate).altitude;

            if (tempAltitude > highest) {
                highest = tempAltitude;
            }

            if (tempAltitude < lowest) {
                lowest = tempAltitude;
            }

            if (tempAltitude >= lastAngles[0]) {
                listOfTimes[lastNames[0]] = tempDate;
                lastAngles.shift();
                lastNames.shift();
            }

            if (lastAngles.length == 0) {
                break;
            }
        }
    }

    listOfTimes['highest'] = highest;
    listOfTimes['lowest'] = lowest;

    // privateShowTimesInConsole(listOfTimes);
    return listOfTimes;
}

function getLightRanges(highest) {
    ranges = {
        'Predawn' : ['predawn', 'morningStart', '#C4B11B'],
        'Morning': ['morningStart', 'morningStop', '#0F960F'],
        'Evening': ['eveningStart', 'eveningStop', '#0F960F'],
        'Twilight': ['eveningStop', 'sunset', '#C4B11B'],
    };

    // TODO :NIGHT!!

    if (highest >= 40.0) { // draw these if the sun goes above my harsh threshold
        ranges['Late Morning'] = ['morningStop', 'highStart', '#C4B11B'];
        ranges['Mid-day'] = ['highStart', 'highStop', '#999999'];
        ranges['Afternoon'] = ['highStop', 'eveningStart', '#C4B11B'];
    } else if (highest >= 25.0) { // draw these if the sun goes above my good angle
        ranges['Mid-day'] = ['morningStop', 'eveningStart', '#C4B11B'];
    } else { // draw these if the sun is good all day
        ranges['All Day'] = ['morningStart', 'eveningStop', '#0F960F'];
    }

    return ranges;
}


