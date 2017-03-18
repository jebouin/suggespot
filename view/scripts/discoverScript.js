var loadingMore = false;

function onFollowClick(e) {
    $.post("/follow", {tagName: tag}, function(data) {
        $(".follow").hide();
    });
}

function loadMore() {
    if(loadingMore) return;
    loadingMore = true;
    $.post("/suggestions", {}, function(data) {
        $("#suggestionsContainer").append($(data));
        loadingMore = false;
    });
}

$(document).ready(function() {
    loadMore();
    $(".follow").on("click", onFollowClick);
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
