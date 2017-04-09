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
        for(var i = 0; i < distanceSpan.length; i++) {
            var span = $(distanceSpan[i]);
            span.text(locationUtils.formatDistance(parseFloat(span.text())));
        }
        $("#suggestionsContainer").append(toAppend);
        loadingMore = false;
    });
}

function onRegister(e) {
    e.preventDefault();
    var data = $(e.target).serializeArray().reduce(function(data, item) {
        data[item.name] = item.value;
        return data;
    }, {});
    function onFail(err) {
        var errorDiv = $("#error");
        var errorText = $("#errorText").html("");
        err.forEach(function(e) {
            var messages = {"U_EX": "Username taken",
                            "U_INV": "Username should contain only alphanumeric characters and underscores",
                            "U_TL": "Username should be between 3 and 20 characters long",
                            "U_TS": "Username should be between 3 and 20 characters long",
                            "P_TS": "Password should be at least 12 characters long",
                            "P_TL": "Password is too long",
                            "P_DM": "Passwords don't match",
                            "P_INV": "Password contains invalid characters",
                            "E_INV": "Invalid email address",
                            "E_EX": "Email is already used"};
            var msg = messages[e];
            if(!msg) return;
            errorText.html(errorText.html() + msg + "<br>");
        });
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

function loadPopularTags() {
    $.post("/tags/popular", {lat: currentLocation.lat, lon: currentLocation.lon}).done(function(html) {
        var element = $(html).appendTo("#popularTags");
    }).fail(function(xhr, status, err) {
        console.log(err);
    });
}

$(document).ready(function() {
    currentLocation.get(function(err) {
        loadMore();
        loadPopularTags();
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
