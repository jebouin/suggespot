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

$(document).ready(function() {
    $.post("/suggestions", {}, function(data) {
        $("#suggestionsContainer").append($(data));
        loadingMore = false;
    });
});
