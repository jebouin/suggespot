function getSid() {
	return window.location.pathname.substr(3);
}

$(document).ready(function() {
	$(document).keydown(function(e) {
  		if(e.which === 13 && e.ctrlKey) {
    		$("input[type='submit'").click();
    	}
	});
	$("#publishButton").click(function(e) {
		var sid = getSid();
		$.post("/publish", {sid: sid}, function(data) {
			window.location.reload(true);
		});
	});

	$(document).on("click", ".editLink", function(e) {
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
	});

	$(".uploadUI > :button").on("click", function(e) {
		var files = $(".uploadUI > :file")[0].files;
		var formData = new FormData();
		formData.append("photo", files[0]);
		formData.append("thingId", "0_" + getSid());
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
	        error: function(xhr, err) {},
	        success: function(data) {
	        	$(".cancelUploadLink").text("Upload photo");
	        	$(".uploadUI").css("display", "none");
	        	$("<img src='" + data + "'>").appendTo("#suggestionBody");
	        	$(".cancelUploadLink").attr("class", "uploadLink");
	        }
	    });
	});
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