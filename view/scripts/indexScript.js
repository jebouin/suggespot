function onLogin(e) {
    e.preventDefault();
    var data = $(e.target).serializeArray().reduce(function(data, item) {
        data[item.name] = item.value;
        return data;
    }, {});
    function onFail(errors) {
        if(errors.length > 0) {
            var err = errors[0];
            if(err === "U_NF") {
                console.log("user not found");
            } else if(err === "P_IN") {
                console.log("invalid password");
            }
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

