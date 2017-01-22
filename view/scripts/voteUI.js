$(document).ready(function() {
  function addEvents(elm, type) {
    function addVotes(nv) {
      $(".upvoteCount", elm).text(parseInt($(".upvoteCount", elm).text()) + nv);
    }
    $("." + type + "vote", elm).click(function(event) {
      var sid = $(this).parent().attr("sid");
      if($(this).hasClass("voted")) {
        $(this).removeClass("voted");
        addVotes(type === "up" ? -1 : 1);
        $.post("/vote", {suggestionID: sid, voteType: "cancel"});
      } else {
        $.post("/vote", {suggestionID: sid, voteType: type});
        var optype = (type == "up" ? "down" : "up");
        $(this).addClass("voted");
        if($("." + optype + "vote", elm).hasClass("voted")) {
          $("." + optype + "vote", elm).removeClass("voted");
          addVotes(type === "up" ? 2 : -2);
        } else {
          addVotes(type === "up" ? 1 : -1);
        }
      }
    });
  }
  $(".voteUI").each(function() {
    addEvents($(this), "up");
    addEvents($(this), "down");
  });
});