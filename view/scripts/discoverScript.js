var loadingMore = false;

function onFollowClick(e) {
    $.post("/follow", {tagName: tag}, function(data) {
        $(".follow").hide();
    });
}

function loadMore() {
    if(loadingMore) return;
    loadingMore = true;
    var postData = {start: $(".suggestion").length, limit: 10, lat: currentLocation.lat, lon: currentLocation.lon};
    if(tag) {
        postData.tag = tag;
    }
    if(discoverMode) {
        postData.mode = discoverMode;
    }
    $.post("/suggestions", postData, function(data) {
        var toAppend = $(data);
        var distanceSpan = $(".distance", toAppend);
        distanceSpan.text(locationUtils.formatDistance(parseFloat(distanceSpan.text())));
        $("#suggestionsContainer").append(toAppend);
        loadingMore = false;
    });
}

$(document).ready(function() {
    currentLocation.get(function(err) {
        loadMore();
        $(window).scroll(function() {
            if(!loadingMore) {
                var cont = $("#suggestionsContainer");
                var windowBottom = $(window).scrollTop() + $(window).height();
                if(windowBottom + 50 >= cont.position().top + cont.outerHeight()) {
                    loadMore();
                }
            }
        });
    });
    $(".follow").on("click", onFollowClick);
});
