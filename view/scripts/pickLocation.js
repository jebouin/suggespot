var currentLocation = {lat: 40, lon: 0};
var map;
var marker;

function onMapResize() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
}

function googleMapsLoaded() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(loc) {
            currentLocation = {lat : loc.coords.latitude, lon : loc.coords.longitude};
            initMap(true);
        }, function(err) {
            initMap(true);
        }, {maximumAge: 10000, timeout: 1000, enableHighAccuracy: true});
    } else {
        initMap(false);
    }
}

function initMap(foundLocation) {
    map = new google.maps.Map(document.getElementById("map"), {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoom : foundLocation ? 15 : 2,
        center : {
            lat : currentLocation.lat,
            lng : currentLocation.lon
        },
        scrollwheel : true
    });
    google.maps.event.addDomListener(window, 'resize', onMapResize);

    //search box
    var input = document.getElementById('searchBox');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length == 0) {
            return;
        }
        var place = places[0];
        marker.setPosition(place.geometry.location);

        var bounds = new google.maps.LatLngBounds();
        if(place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
        map.fitBounds(bounds);
    });

    map.addListener("click", function(e) {
        if(!marker) {
            marker = new google.maps.Marker({
                position : e.latLng,
                map : map,
                draggable : true
            });
            $("#mapNext").attr("class", "visible");
        } else {
            marker.setPosition(e.latLng);
        }
        map.panTo(e.latLng);
    });
    /*$.getJSON("/api", function(data) {
        var markers = [];
        for(i in data.suggestions) {
            markers.push(new google.maps.Marker({
                position : {
                    lat : data.suggestions[i].lat / 10000000,
                    lng : data.suggestions[i].lon / 10000000
                },
                map : map
            }));
        }
    });*/
}

$(document).ready(function() {
    $("form[name='submit']").submit(function() {
        $("input[name='lat']").val(marker.getPosition().lat);
        $("input[name='lon']").val(marker.getPosition().lng);
        return true;
    });
    $(document).on("click", "#mapNext.visible", function(e) {
        var target = $(e.target);
        target.attr("class", "hidden");
        $("#map").animate({height: "35%"}, {
            step: function(now, fx) {
                onMapResize();
            }
        });
    });
    $("#mapBack").on("click", function(e) {
        $("#mapNext").attr("class", "visible");
        $("#map").animate({height: "100%"}, {
            step: function(now, fx) {
                onMapResize();
            }
        });
    });
});
