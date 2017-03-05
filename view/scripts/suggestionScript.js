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
				$("#newPhoto").before($("<img>").attr({"src": data.path, "draggable": "true", "pid": data.pid}));
				updatePhotos();
                resetNewPhotoForm();
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
	var b = $("button#morePhotos");
	$("#photosGrid").css("max-height", "none");
	b.text("Less");
	b.attr("class", "on");
}

function collapsePhotos() {
	if(!photosExpanded) return;
	photosExpanded = false;
	var b = $("button#morePhotos");
	$("#photosGrid").css("max-height", mh);
	b.text(txt);
	b.attr("class", "off");
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
	$("button#morePhotos").css("display", "none");
	$("#newPhoto").css("display", "");
	$("#photosGrid img").attr("draggable", "true");
	expandPhotos();
	b.text("Save changes");
}

function disableEditMode(b) {
	if(!editMode) return;
	editMode = false;
	$("#author").css("visibility", "visible");
	updatePhotos();
	$("#newPhoto").css("display", "none");
	$("#photosGrid img").attr("draggable", "false");
	collapsePhotos();
	b.text("Edit");
    var editObject = {};
    if(changedPhotosOrder) {
        changedPhotosOrder = false;
        var order = [];
        var photos = $("#photosGrid img");
        for(var i = 0; i < photos.length; i++) {
            order.push(photos[i].getAttribute("pid"));
        }
        editObject.photosOrder = order;
    }
    if(!jQuery.isEmptyObject(editObject)) {
        editObject.thingId = "0_" + getSid();
        $.post("/edit", editObject, function(data) {
            //edit succesful
        });
    }
    resetNewPhotoForm();
}

function initDD() {
	var draggedElement;
    var n = $("#photosGrid img").length;
	$(document).on({
		dragstart: function(e) {
            e.originalEvent.dataTransfer.effectAllowed = "move";
			draggedElement = $(this);
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
                draggedElement.remove().insertBefore($("#photosGrid img").eq(id));
            } else if(draggedId < id) {
                draggedElement.remove().insertAfter($("#photosGrid img").eq(id - 1));
            }
			/*var off = $this.offset();
			var doff = draggedElement.offset();
			$this.css({"left": doff.left - off.left + 9000 + "px", "top": doff.top - off.top + "px"});
			$this.animate({"top": "0px", "left": "0px"}, "fast");*/
		}, dragleave: function() {

		}, dragover: function(e) {

		}, drop: function(e) {
			e.preventDefault();
			draggedElement.css("transform", "");
            draggedElement = null;
            changedPhotosOrder = true;
		}, dragend: function() {
			if(!draggedElement) return;
			draggedElement.css("transform", "");
			draggedElement = null;
            changedPhotosOrder = true;
		}
	}, "#photosGrid img");
}

function photoFromURL(e) {
    e.preventDefault();
    $("#newPhoto button").hide();
    $("#newPhoto input").show().focus();
}

var lastChange = new Date().getTime();
function onPhotoURLChange(e) {
    var current = new Date().getTime();
    var dt = current - lastChange;
    if(dt < 600) {
        setTimeout(function() {onPhotoURLChange(e);}, 800 - dt);
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
        $.post("/upload", {"fromUrl": true, "thingId": "0_" + getSid(), "url": url}, function(data) {
            $("#newPhoto").before($("<img>").attr({"src": data.path, "draggable": "true", "pid": data.pid}));
            resetNewPhotoForm();
        });
    }
}

function resetNewPhotoForm() {
    $("#newPhoto button").show();
    $("#newPhoto input").hide().val("");
}

$(document).ready(function() {
	//photo grid
	mh = $("#photosGrid").css("max-height");
	txt = $("button#morePhotos").text();
	$("button#morePhotos").on("click", function(e) {
		var b = $(e.target);
		if(b.hasClass("off")) expandPhotos();
		else collapsePhotos();
	});
	$("#newPhoto > input[type='file']").on("change", function() {
		uploadPhoto();
	});
    $("#newPhoto > button").on("click", photoFromURL);
    $("#newPhoto > input[name='url']").on("input", onPhotoURLChange);
	initDD();
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
    		$("input[type='submit'").click();
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
}

function cancelComment(event) {
	var commentUI = $(".commentUI");
	commentUI.css("display", "none");
	$("a", commentUI.parent()).css("display", "block");
}
