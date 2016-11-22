/**
 * Mousetrap stuff
 */
Mousetrap.bind(['command+n', 'ctrl+n'], function(e) {
  if ($('body .modal-content').length == 0) {
    $('#js-add-task').click();
  }
  return false;
});
