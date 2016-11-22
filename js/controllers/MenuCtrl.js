/**
 * Main page controller.
 */
angular.module('thyme').controller('MenuCtrl', function($scope, $http, $modal, $rootScope, $location) {
  $scope.$on('$locationChangeStart', function(event) {
    $scope.showFaciendo = ($location.path() !== '/faciendo' &&
      localStorage.alwaysShowFaciendo === "true"
    );

    $scope.colWidth = 12;
    if ($scope.showFaciendo) {
      $scope.colWidth = 6;
    }
  });

  $rootScope.$on('displayError', function(event, data) {
    var modalInstance = $modal.open({
      templateUrl: 'templates/modalError.html',
      controller: 'ModalErrorCtrl',
      size: 'sm',
      resolve: {
        error: function () {
          return data;
        }
      }
    });
  });

  $scope.modal = function() {
    var modalInstance = $modal.open({
      templateUrl: 'templates/add/modalAddTask.html',
      controller: 'ModalCreateCtrl',
      size: 'lg',
      resolve: {
        task: function () {
          return {};
        }
      }
    });
    modalInstance.result.then(function (selectedItem) {
      setTimeout(function(){
        $rootScope.$broadcast('addedTask');
      }, 100);
      $scope.new_task = selectedItem;
    }, function () {
    });
  };

  $scope.openSettings = function() {
    nw.Window.open('no_menu.html#/settings', {}, function(new_win) {
      new_win.height = 300;
      new_win.width = 620;
    });
  }
});
