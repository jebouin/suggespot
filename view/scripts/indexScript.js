function onLogin(e) {
    e.preventDefault();
    var data = $(e.target).serializeArray().reduce(function(data, item) {
        data[item.name] = item.value;
        return data;
    }, {});
    function onFail(errors) {
        if(errors.length > 0) {
            var errorText = $("#error #errorText");
            errors.forEach(function(err) {
                if(err === "U_NF") {
                    errorText.text("User not found");
                } else if(err === "P_IN") {
                    errorText.text("Invalid password");
                    $("#error a").show();
                }
            });
        }
    }
    $.post("/login", data).done(function(res) {
        if(res.errors && res.errors.length > 0) {
            onFail(res.errors);
            return;
        }
        location.reload();
    }).fail(function(xhr, status, err) {
        onFail(err);
    });
    return false;
}

$(document).ready(function() {

});

