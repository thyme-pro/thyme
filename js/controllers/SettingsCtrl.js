angular.module('thyme').controller('SettingsCtrl', function($scope, $log, gapiService) {

  keytar = require('keytar');

  // Default open tab.
  $scope.tab = {};
  $scope.tab.general = true;

	// All scope properties to handle.
  var properties = [
		"focusApp",
		"notificationInterval",
    "jiraUrl",
    "jiraUsername",
    "jiraProjectJql",
    "zendeskUsername",
    "zendeskUserId",
    "zendeskUrl"
  ];

  var passwords = [
    "zendeskPassword",
    "jiraPassword"
  ];

  $scope.config = {};

  for (i = 0; i < properties.length; i++) {
    var property = properties[i];
    $scope.config[property] = localStorage[property];
  }

  var cachedPasswords = {};

  for (i = 0; i < passwords.length; i++) {
    var property = passwords[i];

    var password;

    password = keytar.getPassword('thyme.' + property, property);
    // Cache the passwords, so we can check later if we are updatring them.
    cachedPasswords[property] = password;
    $scope.config[property] = password;
  }

	// Save settings when scope changes.
	// @todo: do some debouncing
  $scope.$watch(function() {
      // Normal preferences
      for (i = 0; i < properties.length; i++) {
        var property = properties[i];

        localStorage[property] = $scope.config[property];
      }

      // Critical preferences, saved in system keychain
      for (i = 0; i < passwords.length; i++) {
        var property = passwords[i];

        var password = $scope.config[property];

        if ((cachedPasswords[property] != password) && password) {
          cachedPasswords[property] = $scope.config[property];

          retval = keytar.addPassword('thyme.' + property, property, password);

          // If we cant add, replace instead
          if (!retval) {
            retval = keytar.replacePassword('thyme.' + property, property, password);
          }
        }
      }
  });

  $scope.connectGoogle = function() {
    gapiService.authorize();
  }

  $scope.disconnectGoogle = function() {
    gapiService.revoke();
  }
});
