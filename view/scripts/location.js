currentLocation = {
    lat: null,
    lon: null,
    accuracy: null,
    requested: false,
    get: function(callback) {
        this.requested = true;
        /*if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
                this.lat = pos.coords.latitude;
                this.lon = pos.coords.longitude;
                callback(null);
            }, function(err) {
                console.log(err);
                switch(err.code) {
                    case err.PERMISSION_DENIED:
                        //user denied
                        break;
                    case err.POSITION_UNAVAILABLE:
                        break;
                    case err.TIMEOUT:
                        break;
                    case err.UNKNOWN_ERROR:
                        break;
                }
                callback(true);
            });
        } else {
            callback(true);
        }*/
        $.post("https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyASVg61LXd3hA_WJeeNEJnHidmjEQOwDeo", {}).done(function(data) {
            currentLocation.lat = data.location.lat;
            currentLocation.lon = data.location.lng;
            currentLocation.accuracy = data.accuracy;
            callback(null);
        }).fail(function(xhr, status, error) {
            callback(true);
        });
    }
};
