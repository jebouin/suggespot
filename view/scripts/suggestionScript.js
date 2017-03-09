var editMode = false;
var photosExpanded = false;
var mh, txt;
var changedPhotosOrder = false;

window.onbeforeunload = function() {
    if(changedPhotosOrder) {
        return true;
    }
}

function getSid() {
	return window.location.pathname.substr(3);
}

function uploadPhoto() {
	var files = $("#newPhoto input[type='file']")[0].files;
	if(!files || files.length == 0) return;
    var formData = new FormData();
    formData.append("photo", files[0]);
    formData.append("thingId", "0_" + getSid());
    formData.append("fromUrl", "false");
    $.ajax({
		url: "/upload",
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

            },
			success: function(data) {
                //todo
                addPhoto(data);
				updatePhotos();
                resetNewPhotoForm();
                updateNewPhotoForm();
				//reset input value?
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
    });
}

function resetNewPhotoForm() {
    $("#newPhoto button").show();
    $("#newPhoto input").hide().val("");
}

function updateNewPhotoForm() {
    var photoCount = $("#photosGrid .photo").length;
    if(photoCount >= maximumPhotos) {
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
	$("#author").css("visibility", "hidden");
    $("#publishButton").css("visibility", "hidden");
	$("button#morePhotos").css("display", "none");
	$("#newPhoto").css("display", "");
    $(".photoOverlay").css("display", "block");
	$("#photosGrid .photo").attr("draggable", "true");
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
	collapsePhotos();
    updatePhotos();
	b.text("Edit");
    var editObject = {};
    if(changedPhotosOrder) {
        changedPhotosOrder = false;
        var order = [];
        var photos = $("#photosGrid .photo:visible");
        console.log(photos);
        for(var i = 0; i < photos.length; i++) {
            order.push(photos[i].getAttribute("pid"));
        }
        editObject.photosOrder = order;
    }
    console.log(editObject);
    if(!jQuery.isEmptyObject(editObject)) {
        editObject.thingId = "0_" + getSid();
        $.post("/edit", editObject, function(data) {
            //edit succesful
        });
    }
    resetNewPhotoForm();
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
			draggedElement.css("transform", "");
            draggedElement = null;
            changedPhotosOrder = true;
		}, dragend: function() {
			if(!draggedElement) return;
            //$(".photoOverlay").css("display", "");
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
        $.post("/upload", {"fromUrl": true, "thingId": "0_" + getSid(), "url": url}).done(function(data) {
            if(data.code == 400) {
                $("#newPhoto .error").css("visibility", "visible");
            } else {
                addPhoto(data);
                resetNewPhotoForm();
            }
        }).fail(function(xhr, status, error) {

        });
    }
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
    //$(".deleteButton").on("click", deletePhoto);
	updatePhotos();

	//edit
	$("#info button").click(setEditMode);

	//publish
	$("#publishButton").click(function(e) {
		var sid = getSid();
		$.post("/publish", {sid: sid}, function(data) {
			window.location.reload(true);
		});
	});
	//comment
	$(document).keydown(function(e) {
  		if(e.which === 13 && e.ctrlKey) {
    		$("input[type='submit']:visible").last().click();
    	}
	});

	/*$(document).on("click", ".editLink", function(e) {
		var target = $(e.target);
		target.text("Save");
		target.attr("class", "saveLink");
		var editUI = $("#editUI");
		var descr = $("p#descr");
		editUI.css("display", "block");
		descr.css("display", "none");
		$("textarea", editUI).text(descr.text());
		editUI.insertAfter(descr);
	});
	$(document).on("click", ".saveLink", function(e) {
		var target = $(e.target);
		target.text("Edit");
		target.attr("class", "editLink");
		var editUI = $("#editUI");
		var descr = $("textarea", editUI).val();
		$.post("/edit", {thingId: "0_" + getSid(), descr: descr}, function(data) {
			editUI.css("display", "none");
			$("p#descr").text(descr).css("display", "block");
		});
	});

	$(document).on("click", ".uploadLink", function(e) {
		var target = $(e.target);
		target.text("Cancel upload");
		target.attr("class", "cancelUploadLink");
		var uploadUI = $(".uploadUI");
		uploadUI.css("display", "block");
	});
	$(document).on("click", ".cancelUploadLink", function(e) {
		var target = $(e.target);
		target.text("Upload photo");
		target.attr("class", "uploadLink");
		var uploadUI = $(".uploadUI");
		uploadUI.css("display", "none");
	});*/
});

function reply(event) {
    $(event.target).css("display", "none");
	var replies = $(event.target).parent();
	var commentUI = $(".commentUI");
	commentUI.css("display", "block");
    commentUI.detach().appendTo(replies);
	var cid = replies.attr("cid");
	$("input[name='parent']", commentUI).val(cid);
    $(".commentUI textarea").focus();
}

function cancelComment(event) {
	var commentUI = $(".commentUI");
	commentUI.css("display", "none");
	$("a", commentUI.parent()).css("display", "block");
}
