(function (window) {
  'use strict';

  function basicAuthHeaders () {
    let headers = new Headers()
    headers.set('Authorization', 'Basic ' + btoa('ip:mode33DEV'))
    headers.set('Content-Type', 'application/json')

    return headers
  }

  window.helper = {
    'basicAuthHeaders': basicAuthHeaders(),
  };

})(window);
