
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

    // from https://raw.github.com/nickdesaulniers/fxos-irc/master/notification.js
    function sendNotification (title, options) {
        // Memoize based on feature detection.
        if ("Notification" in window) {
            sendNotification = function (title, options) {
                new Notification(title, options);
            };
        } else if ("mozNotification" in navigator) {
            sendNotification = function (title, options) {
                // Gecko < 22
                navigator.mozNotification
                .createNotification(title, options.body, options.icon)
                .show();
            };
        } else {
            sendNotification = function (title, options) {
                alert(title + ": " + options.body);
            };
        }

        sendNotification(title, options);
    };

    function notifyUser(inMessage) {
        // If the user agreed to get notified
        if (window.Notification && Notification.permission === "granted") {
          var n = new Notification(inMessage);
        }

        // If the user hasn't told if he wants to be notified or not
        // Note: because of Chrome, we are not sure the permission property
        // is set, therefore it's unsafe to check for the "default" value.
        else if (Notification && Notification.permission !== "denied") {
          Notification.requestPermission(function (status) {
            if (Notification.permission !== status) {
              Notification.permission = status;
            }

            // If the user said okay
            if (status === "granted") {
              var n = new Notification(inMessage);
            }

            // Otherwise, we can fallback to a regular modal alert
            else {
              alert("Hi!");
            }
          });
        }

        // If the user refuses to get notified
        else {
          // We can fallback to a regular modal alert
          alert(inMessage);
        }        
    }

    document.addEventListener('DOMComponentsLoaded', function(){        
        // At first, let's check if we have permission for notification
        // If not, let's ask for it
        if (window.Notification && Notification.permission !== "granted") {
            Notification.requestPermission(function (status) {
                if (Notification.permission !== status) {
                    Notification.permission = status;
                }
            });
        }

        document.getElementById('map').addEventListener('show', function() {
            if (shotclockDraw.map == '') {
                console.log('about to initialize');            
                shotclockDraw.initialize(new OpenLayers.Map("mapdiv", { theme : null }));
            } else {
                console.log('openlayers map already initialized');
            }
        });          

        // automatically hide the splash / about screen after a few seconds
        window.setTimeout(function() {
            console.log('about to show map');
            document.getElementById('map').setAttribute('selected', true);
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
                    shotclockDraw.centerMapAt(position.coords.longitude, position.coords.latitude, 15);
                    document.getElementById('map').setAttribute('selected', true);

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
            var newDate = new Date(shotclockDraw.currently);
            newDate.setDate(chosenDate.getDate());
            newDate.setMonth(chosenDate.getMonth());
            newDate.setFullYear(chosenDate.getFullYear());
            shotclockDraw.showCurrentDateTime = false;
            shotclockDraw.currentTimeChanged(newDate);

            $('#nowbutton').attr('disabled', 'false');

            shotclockDraw.logCurrentSunPosition();
        });

        // initialize timeslider -- now a web component!
        $('#timeslider').on("change",
            function (event) {
                var newTime = new Date(shotclockDraw.currently);
                newTime.setMinutes((this.value * 60) % 60);
                newTime.setHours(this.value);
                shotclockDraw.showCurrentDateTime = false;
                shotclockDraw.currentTimeChanged(newTime);

                $('#nowbutton').attr('disabled', 'false');

                shotclockDraw.logCurrentSunPosition();
            }
        );

        // clicking the NOW button toggles whether we're tracking the current date/time
        $("#nowbutton").bind(global.actEvent, function(e) {
            e.preventDefault();

            if (! shotclockDraw.showCurrentDateTime) {
                shotclockDraw.showCurrentDateTime = true;
                shotclockDraw.currentTimeChanged(Date.now());
                shotclockDraw.logCurrentSunPosition();
                $('#nowbutton').attr('disabled', 'true');
            }

            // immediately flip to map tab
            document.getElementById('map').setAttribute('selected', true);
        });

        // clicking in the find text box selects all the text for easy replacing of the sample text
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
                        shotclockDraw.centerMapAt(results[0].lon, results[0].lat, 10);

                        // immediately flip to map tab
                        document.getElementById('map').setAttribute('selected', true);
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
