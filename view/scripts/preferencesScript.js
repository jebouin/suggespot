function onSave(e) {
    e.preventDefault();
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
