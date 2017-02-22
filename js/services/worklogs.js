/**
 * This object stores the current worklogs. It's only purpose is to act
 * as intermediate storage between the controller and the dbService.
 *
 * All updates to worklogs must be handled in controllers.
 */
angular.module('thyme')
  .factory('worklogs', ['$q', '$rootScope', 'dbService', ($q, $rootScope, dbService) => {

    /**
     * Generate GUID, used when creating new task, not yet saved
     * to persistent storage.
     */
    const guid = () => {
      const s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
      };
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    let worklogs = {
      worklogs: [],

        /**
         * Get Worklogs from storage.
         */
      get: (timeFrom, timeTo, unregistered) => {
        let deferred = $q.defer();

        dbService.getTasks(timeFrom, timeTo, unregistered).then((data) => {
          this.worklogs = data;
          deferred.resolve(this.worklogs);
        });

        return deferred.promise;
      },

        /**
         * Save worklog.
         */
      save: (worklog) => {

        if (!worklog.id) {
          worklog.id = guid();
          this.worklogs.push(worklog);
        }

        _.each(this.worklogs, (_worklog, key) => {
          if (_worklog.id == worklog.id) {
            this.worklogs[key] = worklog;
          }
        });

        dbService.saveTask(worklog).then((id) => {
          if (isNaN(worklog.id)) {
            _.each(this.worklogs, (_worklog, key) => {
              if (_worklog.id == worklog.id) {
                this.worklogs[key].id = id;
              }
            });
          }
        });
      },

        /**
         * Delete worklog by Id.
         */
      delete: (worklogId) => {
        _.each(this.worklogs, (_worklog, key) => {
          if (_worklog.id == worklogId) {
            this.worklogs.splice(key, 1);
          }
        });

        dbService.deleteTask(worklogId);
      }
    };

    return worklogs;
  }
  ]);
