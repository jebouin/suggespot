function getChangesObject(updatePrev) {
    var radios = $(".preference input[type='radio']:checked");
    var checkboxes = $(".preference input[type='checkbox']");
    var changed = false;
    var changesObject = {};
    function addChange(name, value) {
        if(preferences[name] !== value) {
            changed = true;
            changesObject[name] = value;
            if(updatePrev) {
                preferences[name] = value;
            }
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
    return changed ? changesObject : null;
}

function onSave(e) {
    e.preventDefault();
    var changesObject = getChangesObject(true);
    if(changesObject !== null) {
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
    var button = $("input#savePreferences");
    if(button.prop("disabled")) {
        button.val("Save").prop("disabled", false);
    } else {
        var changesObject = getChangesObject();
        if(changesObject === null) {
            button.val("Save").prop("disabled", true);
        }
    }
}

$(document).ready(function() {
    setDefaultOptions();
    $(".preference input").on("change", onFormChange);
});

$(window).on("beforeunload", function(e) {
    var changesObject = getChangesObject();
    if(changesObject !== null) return true;
});
