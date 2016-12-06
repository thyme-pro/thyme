_ = require('lodash');
angular.module('thyme', ['ui.bootstrap', 'ngRoute', 'utils.autofocus']);

/**
 * Route provider
 */
angular.module('thyme').config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/list', {
        templateUrl: 'templates/list/pageTaskList.html',
        controller: 'TaskListCtrl'
      }).
      otherwise({
        redirectTo: '/list'
      });
  }
]);

angular.module('thyme').filter('object2Array', function() {
  return function(input) {
    return _.toArray(input);
  };
});

/**
 * the HTML5 autofocus property can be finicky when it comes to dynamically loaded
 * templates and such with AngularJS. Use this simple directive to
 * tame this beast once and for all.
 *
 * Usage:
 * <input type="text" autofocus>
 */
angular.module('utils.autofocus', [])
  .directive('autofocus', ['$timeout', function($timeout) {
    return {
      restrict: 'A',
      link : function($scope, $element) {
        $timeout(function() {
          $element[0].focus();
        });
      }
    };
  }]);

/**
 * Two Controllers that should not be here.
 */
angular.module('thyme').controller('ModalErrorCtrl', function($scope, $modalInstance, error) {
  $scope.message = error;
});
