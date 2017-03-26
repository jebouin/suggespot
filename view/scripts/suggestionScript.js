var editMode = false;
var reportMode = false;
var commentEditMode = false;
var photosExpanded = false;
var loadingMoreComments = false;
var mh, txt;
var changedPhotosOrder = false;
var enlargedContainer, enlargedPhoto, enlarged;
var changes = [];
var editObject = {thingId: "0_" + getSid()};
var prevDescription;
var reportButtonPushed;
var reportCid;
var prevCommentText;

window.onbeforeunload = function() {
    if(changes.length > 0) {
        return true;
    }
    if(prevDescription && prevDescription != $("#description p").html()) {
        return true;
    }
}

function getSid() {
	return window.location.pathname.substr(3);
}

function editableContentToText(txt) {
    return txt.replace(/<br\s*[\/]?>/gi, "\n").replace(/&nbsp/gi, "");
}

function uploadPhoto() {
	var files = $("#newPhoto input[type='file']")[0].files;
	if(!files || files.length == 0) return;
    var formData = new FormData();
    formData.append("photo", files[0]);
    formData.append("thingId", "0_" + getSid());
    formData.append("fromUrl", "false");
    $.ajax({
		url: "/uploadPhoto",
			type: "POST",
			data: formData,
			cache: false,
			contentType: false,
			processData: false,
			xhr: function() {
				var xhr = $.ajaxSettings.xhr();
				if (xhr.upload) {
					xhr.upload.addEventListener('progress', function(e) {
						if (e.lengthComputable) {
							/*$('progress').attr({
									value: e.loaded,
									max: e.total,
							});*/
							console.log(e.loaded, e.total);
						}
					}, false);
				}
				return xhr;
			},
			error: function(xhr, err) {
                var errorText = xhr.responseText || "Error while uploading";
                $("#newPhoto .error").css("visibility", "visible").text(errorText);
            },
			success: function(data) {
                $("#newPhoto .error").css("visibility", "hidden");
                addPhoto(data);
				updatePhotos();
                resetNewPhotoForm();
                updateNewPhotoForm();
			}
	});
}

function updatePhotos() {
	var b = $("button#morePhotos");
	var e = $("#photosGrid")[0];
	var overflows = (e.offsetHeight < e.scrollHeight);
	if(!overflows) b.css("display", "none");
	else b.css("display", "");
}

function expandPhotos() {
	if(photosExpanded) return;
	photosExpanded = true;
	$("#photosGrid").css("max-height", "none");
	$("button#morePhotos").text("Less");
}

function collapsePhotos() {
	if(!photosExpanded) return;
	photosExpanded = false;
	$("#photosGrid").css("max-height", mh);
	$("button#morePhotos").text(txt);
}

function addPhoto(data) {
    var photo = $(".photo:eq(0)").clone().insertBefore($("#newPhoto"));
    photo.attr("pid", data.pid);
    $("img:eq(0)", photo).attr("src", data.path);
    photo.show();
}

function deletePhoto(e) {
    var photo = $(".photo").has($(e.target));
    $.post("/deletePhoto", {thingId: "3_" + photo.attr("pid")}, function(data) {
        photo.remove();
        updateNewPhotoForm();
    });
}

function enlargePhoto(e) {
    if(enlarged) return;
    enlarged = true;
    enlargedPhoto = $(e.target);
    enlargedContainer = enlargedPhoto.parent();
    enlargedPhoto.remove().appendTo("body").addClass("enlarged");
    $("body").css("position", "fixed");
    $("#dark").show();
}

function shrinkPhoto() {
    if(!enlarged) return;
    $("#dark").hide();
    $("body").css("position", "");
    enlargedPhoto.remove().prependTo(enlargedContainer).removeClass("enlarged");
    enlargedContainer = null;
    enlargedPhoto = null;
    enlarged = false;
}

function resetNewPhotoForm() {
    $("#newPhoto button").show();
    $("#newPhoto input").hide().val("");
}

function updateNewPhotoForm() {
    var photoCount = $("#photosGrid .photo").length;
    if(photoCount > maximumPhotos) {
        $("#newPhoto").hide();
    } else {
        $("#newPhoto").show();
    }
}

function setEditMode(e) {
	var b = $(e.target);
	if(editMode) disableEditMode(b);
	else enableEditMode(b);
}

function enableEditMode(b) {
	if(editMode) return;
	editMode = true;
    //reset edit object
    editObject.tagsAdded = [];
    editObject.tagsRemoved = [];
    editObject.photosOrder = [];
	$("#author").css("visibility", "hidden");
    $("#publishButton").css("visibility", "hidden");
	$("button#morePhotos").css("display", "none");
	$("#newPhoto").css("display", "");
    $(".photoOverlay").css("display", "block");
	$("#photosGrid .photo").attr("draggable", "true");
    $("#newTag").show();
    $("#description p").attr("contentEditable", "true");
    $("#info").hide();
    $("#publishedContainer").hide();
    $(".tag:not(#newTag)").addClass("canBeRemoved");
    if(reportMode) {
        disableReportMode();
    }
    prevDescription = $("#description p").html();
    tagUI.editMode = true;
	expandPhotos();
    updateNewPhotoForm();
	b.text("Save changes");
}

function disableEditMode(b) {
	if(!editMode) return;
	editMode = false;
	$("#author").css("visibility", "visible");
    $("#publishButton").css("visibility", "visible");
	$("#newPhoto").css("display", "none");
    $(".photoOverlay").css("display", "none");
	$("#photosGrid .photo").attr("draggable", "false");
    $("#newTag").hide();
    $("#description p").attr("contentEditable", "false");
    $("#info").show();
    $("#publishedContainer").show();
    $(".tag:not(#newTag)").removeClass("canBeRemoved");
    var newDescription = $("#description p").html();
    if(newDescription != prevDescription) {
        editObject.descr = editableContentToText(newDescription);
        changes.push({type: "editDescr"});
        prevDescription = newDescription;
    }
    tagUI.editMode = false;
    tagUI.closeNewTagForm();
	collapsePhotos();
    updatePhotos();
	b.text("Edit");
    if(changedPhotosOrder) {
        changedPhotosOrder = false;
        var order = [];
        var photos = $("#photosGrid .photo:visible");
        for(var i = 0; i < photos.length; i++) {
            order.push(photos[i].getAttribute("pid"));
        }
        editObject.photosOrder = order;
    }
    if(editObject.photosOrder.length == 0) {
        delete editObject.photosOrder;
    }
    if(editObject.tagsAdded.length == 0) {
        delete editObject.tagsAdded;
    }
    if(editObject.tagsRemoved.length == 0) {
        delete editObject.tagsRemoved;
    }
    if((editObject.photosOrder && editObject.photosOrder.length > 0) ||
       (editObject.tagsAdded && editObject.tagsAdded.length > 0) ||
       (editObject.tagsRemoved && editObject.tagsRemoved.length > 0) ||
       (typeof(editObject.descr) !== "undefined")) {
        console.log(editObject);
        $.post("/edit", editObject, function(data) {
            //edit succesful
        });
    }
    resetNewPhotoForm();
    console.log(changes);
    changes = [];
}

function initDD() {
    $(".photoOverlay").css("display", "none");
	var draggedElement;
    var n = $("#photosGrid .photo").length;
    var target = false;
	$(document).on({
        mousedown: function(e) {
            target = $(e.target);
        }, dragstart: function(e) {
            //console.log(target, );
            if(!target.is($(".dragHandle", $(e.target)))) {
                e.preventDefault();
                return;
            }
            e.originalEvent.dataTransfer.setData("text/plain", "");
            e.originalEvent.dataTransfer.effectAllowed = "move";
			draggedElement = $(this);
            /*$(".photoOverlay").css("display", "none");
            $(".photoOverlay", draggedElement).css("display", "");*/
			setTimeout(function() {
				draggedElement.css("transform", "translateX(-9000px)");
			});
		}, dragenter: function(e) {
            if(!draggedElement) return;
            var $this = $(this);
            var after = e.clientX > $this.offset().left + $this.width() * .5;
            if($this.is(":animated")) return;
            var id = $this.index();
            var draggedId = draggedElement.index();
            if(draggedId > id) {
                draggedElement.remove().insertBefore($("#photosGrid .photo").eq(id));
            } else if(draggedId < id) {
                draggedElement.remove().insertAfter($("#photosGrid .photo").eq(id - 1));
            }
			/*var off = $this.offset();
			var doff = draggedElement.offset();
			$this.css({"left": doff.left - off.left + 9000 + "px", "top": doff.top - off.top + "px"});
			$this.animate({"top": "0px", "left": "0px"}, "fast");*/
		}, dragleave: function() {

		}, dragover: function(e) {

		}, drop: function(e) {
			e.preventDefault();
            //$(".photoOverlay").css("display", "");
            changes.push({type: "movePhoto"});
			draggedElement.css("transform", "");
            draggedElement = null;
            changedPhotosOrder = true;
		}, dragend: function() {
			if(!draggedElement) return;
            //$(".photoOverlay").css("display", "");
            changes.push({type: "movePhoto"});
			draggedElement.css("transform", "");
			draggedElement = null;
            changedPhotosOrder = true;
		}
	}, "#photosGrid .photo");
}

function photoFromURL(e) {
    e.preventDefault();
    $("#newPhoto button").hide();
    $("#newPhoto input").show().focus();
    updateNewPhotoForm();
}

var lastChange = new Date().getTime();
var inputTimer;
function onPhotoURLChange(e) {
    $("#newPhoto .error").css("visibility", "hidden");
    clearTimeout(inputTimer);
    var current = new Date().getTime();
    var dt = current - lastChange;
    if(dt < 600) {
        inputTimer = setTimeout(function() {onPhotoURLChange(e);}, 800 - dt);
        return;
    }
    lastChange = current;
    var url = e.target.value;
    var regex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}[-a-zA-Z0-9@:%._\/+~#=]*/g;
    var match = regex.exec(url);
    if(match) {
        if(!match[1]) {
            url = "http://" + url;
        }
        $.post("/uploadPhoto", {"fromUrl": true, "thingId": "0_" + getSid(), "url": url}).done(function(data) {
            if(data.code == 400) {
                $("#newPhoto .error").css("visibility", "visible").text("Invalid file");
            } else {
                addPhoto(data);
                resetNewPhotoForm();
            }
        }).fail(function(xhr, status, error) {

        });
    }
}

//tags
tagUI.canAddCategory = true;
tagUI.removeTagCallback = function(tag) {
    var tid = tag.attr("tid");
    var name = tag.eq(0).val();
    var found = editObject.tagsAdded.findIndex(function findName(t) {
        return t.name === name;
    });
    if(found >= 0) {
        editObject.tagsAdded.splice(found, 1);
    } else if(tid) {
        editObject.tagsRemoved.push({tid: tid});
    }
    changes.push({type: "removeTag", name: name, tid: tid});
}

tagUI.addTagCallback = function(name, id) {
    changes.push({type: "addTag", tid: id, name: name});
    var found = editObject.tagsRemoved.findIndex(function findTag(t) {
        return t.tid === id;
    });
    if(found >= 0) {
        editObject.tagsRemoved.splice(found, 1);
    } else {
        editObject.tagsAdded.push({tid: id, name : name});
    }
}

tagUI.addCategoryCallback = function(name) {
    changes.push({type: "addCat", name: name});
    editObject.tagsAdded.push({name : name});
}

//report
function reportSubmit(e) {
    e.preventDefault();
    //test if radio button ...
    var container = $(".reportContainer:visible");
    var checkedRadio = $("input[type='radio']:checked", container);
    var thingId;
    if(reportCid) {
        thingId = "1_" + reportCid;
    } else {
        thingId = "0_" + getSid();
    }
    if(checkedRadio.length == 1) {
        var val = checkedRadio.val();
        var reportJSON = {thingId: thingId, type: val};
        if(val == "other") {
            var message = $(".reportOtherInput", container).val();
            if(message.length == 0) {
                return false;
            }
            reportJSON.message = message;
        }
        $.post("/report", reportJSON).done(function(data) {
            console.log(data);
            disableReportMode();
        }).fail(function(xhr, status, data) {

        });
    }
    return false;
}

function report(e) {
    var button = $(e.target);
    if(reportMode) {
        disableReportMode(e);
        if(reportButtonPushed && !button.is(reportButtonPushed)) {
            enableReportMode(e);
        }
    } else {
        enableReportMode(e);
    }
    reportButtonPushed = button;
}

function enableReportMode(e) {
    if(!e || reportMode) return;
    reportMode = true;
    var target = $(e.target);
    var cid = target.attr("cid");
    if(!cid) {
        reportCid = null;
        $(".reportContainer.reportSuggestion").remove().appendTo($("#suggestionBody")).show();
    } else {
        reportCid = cid;
        $(".reportContainer.reportComment").remove().appendTo(target.parent().parent()).show();
    }
    $(".reportOtherInput").hide();
}

function disableReportMode(e) {
    if(!reportMode) return;
    reportMode = false;
    $("input", ".reportContainer:visible").prop("checked", false);
    $(".reportContainer").hide();
}

//edit comment
function editComment(e) {
    if(commentEditMode) disableCommentEditMode($(e.target).parent().parent());
    else enableCommentEditMode(e);
}

function enableCommentEditMode(e) {
    if(commentEditMode) return;
    commentEditMode = true;
    var comment = $(e.target).parent().parent();
    $("p", comment).attr("contentEditable", "true");
    $(".commentFooter", comment).hide();
    $(".commentFooter.editFooter", comment).show();
}

function disableCommentEditMode(comment) {
    if(!commentEditMode) return;
    commentEditMode = false;
    $("p", comment).attr("contentEditable", "false");
    $(".commentFooter", comment).hide().first().show();
}

function saveCommentEdit(e) {
    var comment = $(e.target).parent().parent();
    var newCommentText = $("p", comment).html();
    if(newCommentText != prevCommentText) {
        var text = newCommentText.replace(/<br\s*[\/]?>/gi, "\n").replace(/&nbsp/gi, "");
        var thingId = "1_" + $(e.target).attr("cid");
        $.post("/edit", {thingId: thingId, content: text}, function(data) {
            //edit succesful
            prevCommentText = newCommentText;
        });
    }
    disableCommentEditMode(comment);
}

function cancelCommentEdit(e) {
    var comment = $(e.target).parent().parent();
    $("p", comment).text(prevCommentText);
    disableCommentEditMode(comment);
}

$(document).ready(function() {
	//photo grid
	mh = $("#photosGrid").css("max-height");
	txt = $("button#morePhotos").text();
	$("button#morePhotos").on("click", function(e) {
		var b = $(e.target);
		if(photosExpanded) collapsePhotos();
		else expandPhotos();
	});
	$("#newPhoto > input[type='file']").on("change", function() {
		uploadPhoto();
	});
    $("#newPhoto > button").on("click", photoFromURL);
    $("#newPhoto > input[name='url']").on("input", onPhotoURLChange);
	initDD();
    $(document).on("click", ".deleteButton", deletePhoto);
    $(document).on("click", ".photo", function(e) {
        if(!editMode) enlargePhoto(e);
    });
    $(document).on("click", "#dark", function(e) {
        if(enlarged) {
            shrinkPhoto();
        }
    });
	updatePhotos();

	//edit
	$("#editButton").click(setEditMode);

    //report
    $(document).on("change", $("input[type='radio']", ".reportContainer"), function(e) {
        if($(e.target).val() == "other") {
            $(".reportOtherInput").val("");
            $(".reportOtherInput").show();
        } else {
            $(".reportOtherInput").hide();
        }
    });

	//publish
	$("#publishButton").click(function(e) {
		var sid = getSid();
		$.post("/publish", {sid: sid}, function(data) {
			window.location.reload(true);
		});
	});

	//handle keys for accessibility
	$(document).keydown(function(e) {
        var k = e.which;
        if(k === 13) {
            if(e.ctrlKey) {
                var focused = $(document.activeElement);
                if(editMode) {
                    disableEditMode($("#editButton"));
                } else if(commentEditMode) {
                    $("a", ".editFooter:visible").first().click();
                } else {
                    //test focused...
                    $("button", focused.parent()).first().click();
                }
            }
        } else if(k === 27) {
            if(enlarged) {
                shrinkPhoto();
            }
        }
	});

    //location
    currentLocation.get(function(err) {
        if(err) return;
        $.post("/s/" + getSid() + "/d", {lat: currentLocation.lat, lon: currentLocation.lon}, function(data) {
            $("h2").first().append(" (" + locationUtils.formatDistance(data.distance) + ")");
        });
    });

    //comments
    loadMoreComments();
    $(window).scroll(function() {
        if(!loadingMoreComments) {
            var cont = $("#comments");
            var windowBottom = $(window).scrollTop() + $(window).height();
            if(windowBottom + 50 >= cont.position().top + cont.outerHeight()) {
                loadMoreComments();
            }
        }
    });
});

function reply(event) {
    $(event.target).css("display", "none");
	var replies = $(event.target).parent();
	var commentUI = $(".commentUI").last();
	commentUI.css("display", "block");
    commentUI.detach().appendTo(replies);
	$(".textarea", commentUI).focus();
}

function sendComment(event) {
    var target = $(event.target);
    var thread = target.parents(".replies").attr("thread");
    var html = $(".textarea", target.parents(".commentUI")).html();
    var content = editableContentToText(html);
    var commentData = {suggestionId: getSid(), content: content};
    if(thread) {
        commentData.thread = thread;
    }
    $.post("/comment", commentData).done(function(data) {
        var buttons = $("button", target.parent());
        buttons.hide();
        console.log(data);
        $.post("/comments/" + data, {newThread: typeof(thread) === "undefined"}, function(html) {
            buttons.show();
            var newComment = $(html);
            if(thread) {
                newComment.insertBefore($(".replyButton", ".replies[thread=" + thread + "]"));
                onCommentSent();
            } else {
                $("#comments").prepend(newComment);
                $(".textarea").html("");
            }
        });
    });
    function onCommentSent() {
        var commentUI = $(event.target).parent();
    	commentUI.css("display", "none");
        $(".textarea").html("");
    	$("a", commentUI.parent()).show();
    }
}

function cancelComment(event) {
	var commentUI = $(event.target).parent();
	commentUI.hide();
    $(".textarea").html("");
	$("a", commentUI.parent()).show();
}

function loadMoreComments() {
    if(loadingMoreComments) return;
    loadingMoreComments = true;
    var postData = {start: $(".commentThread").length, limit: 10, id: getSid()};
    $.post("/comments", postData, function(data) {
        var toAppend = $(data);
        $("#comments").append(toAppend);
        loadingMoreComments = false;
    });
}
