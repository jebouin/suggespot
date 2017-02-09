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