var loadingMore = false;

tagUI.addTagCallback = function(name, id) {
    $.post("/follow", {tagName: name}, function(data) {

    });
}

tagUI.removeTagCallback = function(tag) {
    var name = $(".tagText", tag).text();
    $.post("/unfollow", {tagName: name}, function(data) {

    });
}

tagUI.newTagClickCallback = function() {
    tagUI.editMode = true;
}

tagUI.closeNewTagFormCallback = function(name, id) {
    tagUI.editMode = false;
}

function loadMore() {
    if(loadingMore) return;
    loadingMore = true;
    $.post("/suggestions", {start: $(".suggestion").length, limit: 10, authorId: authorId, mode: "profile"}, function(data) {
        $("#suggestionsContainer").append($(data));
        loadingMore = false;
    });
}

$(document).ready(function() {
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
