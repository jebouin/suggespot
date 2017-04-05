function onSave(e) {
    e.preventDefault();
    var radios = $(".preference input[type='radio']:checked");
    var changed = false;
    var changesObject = {};
    for(var i = 0; i < radios.length; i++) {
        var radio = radios.eq(i);
        var name = radio.attr("name");
        var value = radio.val();
        if(preferences[name] !== value) {
            changed = true;
            changesObject[name] = value;
            preferences[name] = value;
        }
    }
    if(changed) {
        $("input#savePreferences").hide();
        $.post("/editPreferences", changesObject).done(function(data) {
            $("input#savePreferences").show();
        }).fail(function(xhr, status, error) {

        });
    }
    return false;
}

function setDefaultOptions() {
    for(var pref in preferences) {
        if(preferences.hasOwnProperty(pref)) {
           var radio = $(".preference input[name=" + pref + "][value=" + preferences[pref] + "]").prop("checked", true);
        }
    }
}

$(document).ready(function() {
    setDefaultOptions();
});
