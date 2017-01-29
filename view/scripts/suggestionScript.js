$(document).ready(function() {
	$(document).keydown(function(e) {
  	if(e.which === 13 && e.ctrlKey) {
    		$("input[type='submit'").click();
    	}
	});
});

function reply(event) {
	var comment = $(event.target).parent();
	var commentUI = $(".commentUI");
	commentUI.css("display", "block");
	commentUI.detach().appendTo(comment);
	var cid = comment.attr("cid");
	$("input[name='parent']", commentUI).val(cid);
}

function cancelComment(event) {
	var commentUI = $(".commentUI");
	commentUI.css("display", "none");
}