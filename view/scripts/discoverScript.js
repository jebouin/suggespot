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

function onRegister(e) {
    e.preventDefault();
    //convert form data
    var data = $(e.target).serializeArray().reduce(function(data, item) {
        data[item.name] = item.value;
        return data;
    }, {});
    //check details
    //send
    function onFail(err) {
        console.log(err);
    }
    $.post("/register", data).done(function(res) {
        if(res.errors && res.errors.length > 0) {
            onFail(res.errors);
            return;
        }
        window.location = res;
    }).fail(function(xhr, status, err) {
        onFail(err);
    });
    return false;
}

$(document).ready(function() {
    currentLocation.get(function(err) {
        loadMore();
        if(userLoggedIn) {
            $(window).scroll(function() {
                if(!loadingMore) {
                    var cont = $("#suggestionsContainer");
                    var windowBottom = $(window).scrollTop() + $(window).height();
                    if(windowBottom + 50 >= cont.position().top + cont.outerHeight()) {
                        loadMore();
                    }
                }
            });
        }
    });
    $(".follow").on("click", onFollowClick);
    var notificationButton = $("#notificationsContainer button");
    var nbNewNotifications = $(".notification").length - $(".notification.seen").length;
    if(nbNewNotifications > 0) {
        notificationButton.text(nbNewNotifications + " new " + notificationButton.text());
    }
});
