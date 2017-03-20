$(document).ready(function() {
    function addEvents(dir) {
        var type = dir === 1 ? "up" : "down";
        function addVotes(voteUI, nv) {
            $(".upvoteCount", voteUI).text(parseInt($(".upvoteCount", voteUI).text()) + nv);
        }
        $(document).on("click", "." + type + "vote", function(e) {
            var target = $(e.target);
            var voteUI = target.parent();
            var tid = voteUI.attr("tid");
            if(target.hasClass("voted")) {
                $.post("/vote", {thingId: tid, dir: 0}).done(function(data) {
                    //ok
                });
                target.removeClass("voted");
                addVotes(voteUI, -dir);
            } else {
                $.post("/vote", {thingId: tid, dir: dir}).done(function(data) {
                    //ok
                });
                var optype = (type === "up" ? "down" : "up");
                target.addClass("voted");
                if($("." + optype + "vote", voteUI).hasClass("voted")) {
                    $("." + optype + "vote", voteUI).removeClass("voted");
                    addVotes(voteUI, dir * 2);
                } else {
                    addVotes(voteUI, dir);
                }
            }
        });
    }
    addEvents(-1);
    addEvents(1);
});
