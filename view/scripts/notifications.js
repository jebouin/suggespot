var notificationsVisible = false;

function onNotificationClick(e) {
    var nid = $(e.target).parents(".notification").attr("nid");
    $.post("/users/notifications/mark/seen", {nid: nid});
}

function showNotifications() {
    if(notificationsVisible) return;
    notificationsVisible = true;
    $("#notificationsBody").show();
}

function hideNotifications() {
    if(!notificationsVisible) return;
    notificationsVisible = false;
    $("#notificationsBody").hide();
}

$(document).ready(function() {
    $(document).on("click", "#notificationsContainer button", function(e) {
        if(notificationsVisible) hideNotifications();
        else showNotifications();
    });
});
