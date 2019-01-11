angular.module('thyme').controller('SettingsCtrl', function ($scope, $log, gapiService) {

  // Default open tab.
  $scope.tab = {};
  $scope.tab.general = true;

  // All scope properties to handle.
  let properties = [
    'focusApp',
    'notificationInterval',
    'internalApiToken',
    'dashboardUrl',
    'jiraUsername',
    'jiraProjectJql',
    'zendeskUsername',
    'zendeskUserId',
    'zendeskUrl',
    'zendeskPassword',
    'jiraPassword'
  ];

  $scope.config = {};

  for (let i = 0; i < properties.length; i++) {
    let property = properties[i];
    $scope.config[property] = localStorage[property];
  }


  // Save settings when scope changes.
  // @todo: do some debouncing
  $scope.$watch(function () {
    // Normal preferences
    for (let i = 0; i < properties.length; i++) {
      let property = properties[i];

      localStorage[property] = $scope.config[property];
    }
  });

  $scope.connectGoogle = function () {
    gapiService.authorize();
  };

  $scope.disconnectGoogle = function () {
    gapiService.revoke();
  };

  $scope.close = function () {
    // Close window
    const remote = require('electron').remote;
    let window = remote.getCurrentWindow();
    window.close();
  };
});
