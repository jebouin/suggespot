function onFormSubmit(e) {
    e.preventDefault();
    var email = $(e.target).serializeArray()[0].value;
    $.post("/recover/password", {email: email}).done(function(data) {
        if(data === "E_INV") {
            console.log("invalid email");
        } else if(data === "U_NF") {
            console.log("user not found");
        } else {
            console.log(data);
        }
    }).fail(function(xhr, status, err) {
        
    });
    return false;
}
