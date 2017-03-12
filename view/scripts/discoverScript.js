function onFollowClick(e) {
    $.post("/follow", {tagName: tag}, function(data) {
        $(".follow").hide();
    });
}

$(document).ready(function() {
    $(".follow").on("click", onFollowClick);
});
