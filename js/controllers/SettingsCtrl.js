angular.module('thyme').controller('SettingsCtrl', function($scope, $log, gapiService) {
  const keytar = require('keytar');

  // Default open tab.
  $scope.tab = {};
  $scope.tab.general = true;

	// All scope properties to handle.
  let properties = [
    'focusApp',
    'notificationInterval',
    'jiraUrl',
    'jiraUsername',
    'jiraProjectJql',
    'zendeskUsername',
    'zendeskUserId',
    'zendeskUrl'
  ];

  let passwords = [
    'zendeskPassword',
    'jiraPassword'
  ];

  $scope.config = {};

  for (let i = 0; i < properties.length; i++) {
    let property = properties[i];
    $scope.config[property] = localStorage[property];
  }

  let cachedPasswords = {};

  for (let i = 0; i < passwords.length; i++) {
    let property = passwords[i];

    let password;

    password = keytar.getPassword('thyme.' + property, property);
    // Cache the passwords, so we can check later if we are updatring them.
    cachedPasswords[property] = password;
    $scope.config[property] = password;
  }

	// Save settings when scope changes.
	// @todo: do some debouncing
  $scope.$watch(function() {
      // Normal preferences
    for (let i = 0; i < properties.length; i++) {
      let property = properties[i];

      localStorage[property] = $scope.config[property];
    }

      // Critical preferences, saved in system keychain
    for (let i = 0; i < passwords.length; i++) {
      let property = passwords[i];

      let password = $scope.config[property];

      if ((cachedPasswords[property] != password) && password) {
        cachedPasswords[property] = $scope.config[property];

        let retval = keytar.addPassword('thyme.' + property, property, password);

          // If we cant add, replace instead
        if (!retval) {
          retval = keytar.replacePassword('thyme.' + property, property, password);
        }
      }
    }
  });

  $scope.connectGoogle = function() {
    gapiService.authorize();
  };

  $scope.disconnectGoogle = function() {
    gapiService.revoke();
  };
});
