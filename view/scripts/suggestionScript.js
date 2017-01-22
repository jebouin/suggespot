$(document).ready(function() {
  $(document).keydown(function(e) {
    if(e.which === 13 && e.ctrlKey) {
      $("input[type='submit'").click();
    }
  });
});
