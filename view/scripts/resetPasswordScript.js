function onFormSubmit(e) {
    e.preventDefault();
    var formData = $(e.target).serializeArray();
    var password = formData[0].value;
    var password2 = formData[1].value;
    var token = window.location.href.substr(window.location.href.lastIndexOf("/") + 1);
    //perform client side checks
    $.post("/reset/password", {password: password, password2: password2, token: token}).done(function(data) {
        console.log(data);
    }).fail(function(xhr, status, err) {

    });
    return false;
}
