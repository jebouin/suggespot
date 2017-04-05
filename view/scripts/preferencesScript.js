function onSave(e) {
    e.preventDefault();
    var radios = $(".preference input[type='radio']:checked");
    var checkboxes = $(".preference input[type='checkbox']");
    var changed = false;
    var changesObject = {};
    function addChange(name, value) {
        if(preferences[name] !== value) {
            changed = true;
            changesObject[name] = value;
            preferences[name] = value;
        }
    }
    for(var i = 0; i < radios.length; i++) {
        var radio = radios.eq(i);
        addChange(radio.attr("name"), radio.val());
    }
    for(i = 0; i < checkboxes.length; i++) {
        var checkbox = checkboxes.eq(i);
        addChange(checkbox.attr("name"), checkbox.prop("checked") ? 1 : 0);
    }
    if(changed) {
        $("input#savePreferences").val("Saving...").prop("disabled", true);
        $.post("/editPreferences", changesObject).done(function(data) {
            $("input#savePreferences").val("Saved");
        }).fail(function(xhr, status, error) {

        });
    }
    return false;
}

function setDefaultOptions() {
    for(var pref in preferences) {
        if(preferences.hasOwnProperty(pref)) {
            var val = preferences[pref];
            if(typeof(val) === "string") {
                var radio = $(".preference input[name=" + pref + "][value=" + val + "]").prop("checked", true);
            } else if(val === 1) {
                var checkbox = $(".preference input[name=" + pref + "]").prop("checked", true);
            }
        }
    }
}

function onFormChange() {
    $("input#savePreferences").val("Save").prop("disabled", false);
}

$(document).ready(function() {
    setDefaultOptions();
    $(".preference input").on("change", onFormChange);
});
