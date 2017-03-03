$(document).ready(function() {
  function addEvents(elm, dir) {
    var type = dir === 1 ? "up" : "down";
    function addVotes(nv) {
      $(".upvoteCount", elm).text(parseInt($(".upvoteCount", elm).text()) + nv);
    }
    $("." + type + "vote", elm).click(function(event) {
      var tid = $(this).parent().attr("tid");
      if($(this).hasClass("voted")) {
        $.post("/vote", {thingId: tid, dir: 0});
        $(this).removeClass("voted");
        addVotes(-dir);
      } else {
        $.post("/vote", {thingId: tid, dir: dir});
        var optype = (type === "up" ? "down" : "up");
        $(this).addClass("voted");
        if($("." + optype + "vote", elm).hasClass("voted")) {
          $("." + optype + "vote", elm).removeClass("voted");
          addVotes(dir * 2);
        } else {
          addVotes(dir);
        }
      }
    });
  }
  $(".voteUI").each(function() {
    addEvents($(this), -1);
    addEvents($(this), 1);
  });
});