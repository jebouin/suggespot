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