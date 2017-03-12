tagUI.addTagCallback = function(name, id) {
    $.post("/follow", {tagName: name}, function(data) {

    });
}

tagUI.newTagClickCallback = function() {
    tagUI.editMode = true;
}

tagUI.closeNewTagFormCallback = function(name, id) {
    tagUI.editMode = false;
}

$(document).ready(function() {

});
