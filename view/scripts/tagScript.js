var tagUI = {
    editMode: false,
    canAddCategory: false,
    newTagClickCallback: function() {},
    closeNewTagFormCallback: function() {},
    removeTagCallback: function() {},
    inputNewTagCallback: function() {},
    addTagCallback: function() {},
    addCategoryCallback: function() {},
    addTag: function(name, tid) {
        var tag = $("#newTag").clone().removeAttr("id").attr("tid", tid).insertBefore("#newTag").show();
        tag.html("<h3 class='tagText'>" + name + "</h3>");
        $("input", "#tags").eq(0).val("");
        $("#tags input").eq(0).focus();
        this.addTagCallback(name, tid);
    },
    addCategory: function(name) {
        var tag = $("#newTag").clone().removeAttr("id").insertBefore("#newTag").show();
        tag.html("<h3 class='tagText'>" + name + "</h3>");
        $("input", "#tags").eq(0).val("");
        $("#tags input").eq(0).focus();
        this.addCategoryCallback(name);
    },
    closeNewTagForm: function() {
        $("input", "#tags").eq(0).val("");
        $("form", "#tags").hide();
        this.closeNewTagFormCallback();
    }
}

var evt;
$(document).on("mousemove", function(e) {
    e = e || window.event;
    evt = e;
});

$(document).ready(function() {
    $(document).on("click", ".tag:not(#newTag)", function(e) {
        //tagUI.tagClickCallback();
        if(tagUI.editMode) {
            var tag = $(".tag").has($(e.target)).remove();
            tagUI.removeTagCallback(tag);
        } else {
            window.location.href = "/discover?tag=" + $(e.target).text();
        }
    });
    $("#newTag").on("click", function(e) {
        $("input", "#tags").eq(0).val("");
        $("#newTag").hide();
        $("#tags form").show();
        if(!tagUI.canAddCategory) {
            $("#tags form input").eq(1).hide();
        }
        $("#tags input").eq(0).focus();
        tagUI.newTagClickCallback();
    });
    $("#tags input").on("input", function(e) {
        //timer...
        var val = e.target.value;
        val = val.replace(/\w\S*/g, function(t) {
            return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
        });
        e.target.value = val;
        var datalist = $("datalist#categories");
        datalist.children().each(function(i) {
            var t = datalist.children().eq(i);
            if(val === t.val()) {
                tagUI.addTag(t.val(), t.attr("tid"));
                e.target.value = "";
                return;
            }
        });
        $.get("/t", {prefix: val}, function(data) {
            var tags = $(".tag");
            datalist.empty();
            for(var i = 0; i < data.length; i++) {
                var exists = false;
                for(var j = 0; j < tags.length; j++) {
                    if(tags.eq(j).attr("tid") == data[i].id) {
                        exists = true;
                        break;
                    }
                }
                if(exists) {
                    continue;
                }
                $("<option>", {tid: data[i].id}).text(data[i].name).appendTo(datalist);
            }
        });
        tagUI.inputNewTagCallback(e);
    });
    $("#tags form input").eq(0).on("focusout", function(e) {
        if($(evt.target).is("input[type='submit']") || $(evt.target).is(".tagText")) {
            $("#tags input").eq(0).focus();
            return;
        }
        tagUI.closeNewTagForm();
        $("#newTag").show();
    });
    $("#tags form").on("submit", function(e) {
        e.preventDefault();
        if(tagUI.canAddCategory) {
            tagUI.addCategory($("#tags input").eq(0).val());
        }
    });
});
