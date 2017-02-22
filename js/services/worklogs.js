/**
 * This object stores the current worklogs. It's only purpose is to act
 * as intermediate storage between the controller and the dbService.
 *
 * All updates to worklogs must be handled in controllers.
 */
angular.module('thyme')
  .factory('worklogs', ['$q', '$rootScope', 'dbService', function($q, $rootScope, dbService) {

    /**
     * Generate GUID, used when creating new task, not yet saved
     * to persistent storage.
     */
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    var worklogs = {
        worklogs: [],

        /**
         * Get Worklogs from storage.
         */
        get: (timeFrom, timeTo, unregistered) => {
            console.log('getTasks');
            var self = this;

            var deferred = $q.defer();

            dbService.getTasks(timeFrom, timeTo, unregistered).then(function(data){
                self.worklogs = data;
                deferred.resolve(self.worklogs);
            });

            return deferred.promise;
        },

        /**
         * Save worklog.
         */
        save:(worklog) => {

            var self = this;
            if (!worklog.id) {
                worklog.id = guid()
                self.worklogs.push(worklog);
            }

            _.each(self.worklogs, function(_worklog, key) {
                if (_worklog.id == worklog.id) {
                    self.worklogs[key] = worklog;
                }
            });

            dbService.saveTask(worklog).then(function(id) {
                if (isNaN(worklog.id)) {
                    _.each(self.worklogs, function(_worklog, key) {
                        if (_worklog.id == worklog.id) {
                            self.worklogs[key].id = id;
                        }
                    });
                }
            });
        },

        /**
         * Delete worklog by Id.
         */
        delete: (worklogId) => {
            var self = this;

            _.each(self.worklogs, function(_worklog, key) {
                if (_worklog.id == worklogId) {
                    self.worklogs.splice(key, 1);
                }
            });

            dbService.deleteTask(worklogId);
        }
    };

    return worklogs;
  }
]);
