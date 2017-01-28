var currentLocation;
var map;
var marker;

function googleMapsLoaded() {
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(loc) {
      currentLocation = {lat : loc.coords.latitude, lon : loc.coords.longitude};
      initMap();
    }, function(err) {
      initMap();
    }, {maximumAge: 10000, timeout: 1000, enableHighAccuracy: true});
  } else {
    initMap();
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom : 2,
    center : {
      lat : currentLocation ? currentLocation.lat : 0,
      lng : currentLocation ? currentLocation.lon : 0
    },
    scrollwheel : false
  });
  marker = new google.maps.Marker({
    position : {
      lat : 0, lng : 0
    },
    map : map,
    draggable : true
  });
  if(currentLocation) {
    map.setZoom(15);
    marker.setPosition({lat : currentLocation.lat, lng : currentLocation.lon});
  }
  map.addListener("click", function(e) {
    marker.setPosition(e.latLng);
  });
  $.getJSON("/api", function(data) {
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
  });
}

$(document).ready(function() {
  $("form[name='submit']").submit(function() {
    $("input[name='lat']").val(marker.getPosition().lat);
    $("input[name='lon']").val(marker.getPosition().lng);
    return true;
  });
});
