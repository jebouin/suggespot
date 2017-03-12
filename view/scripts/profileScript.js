function onTagClick(e) {
    window.location.href = "/discover?tag=" + $(e.target).text();
}

$(document).ready(function() {
    $(".tag").on("click", onTagClick);
});
