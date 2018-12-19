angular.module('thyme')
  .factory('dbService', ['$q', ($q) => {
    let db = openDatabase('db', '1.0', 'database', 2 * 1024 * 1024);

    // Create tables
    db.transaction((tx) => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS `worklogs` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task` VARCHAR NOT NULL, `description` VARCHAR NOT NULL, `task_id` VARCHAR NOT NULL, `created` INTEGER)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS `time_entries` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task_id` INTEGER, `start` INTEGER, `stop` INTEGER)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS `register_info` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `worklog_id` INTEGER, `date_entered` INTEGER, `external_id` VARCHAR NOT NULL)');
    });

    let dbService = {
      tasks: {},

      getWorklogs: function (timeFrom, timeTo, unregistered) {
        let deferred = $q.defer();
        let sql = '';
        let data = [];

        let deferSelectTasks = $q.defer();
        // Get a list of tasks for the selected period.
        dbService.tasks = {};
        db.transaction((tx) => {
          sql = 'SELECT * FROM worklogs';
          sql = 'SELECT * FROM worklogs WHERE created > ? AND created < ?';
          data = [timeFrom, timeTo];

          tx.executeSql(sql, data, (tx, rs) => {
            for (let i = 0; i < rs.rows.length; i++) {
              let row = rs.rows.item(i);

              if (dbService.tasks[row.id] === undefined) {
                dbService.tasks[row.id] = {
                  id: row.id,
                  worklog: row.worklog,
                  created: row.created,
                  description: row.description,
                  task_id: row.task_id,
                  task: row.task,
                };
              }
            }

            deferSelectTasks.resolve();
          });
        });

        let deferSelectUnregistered = $q.defer();

        deferSelectTasks.promise.then(() => {
          // If selected, get all tasks that are not registered, regardless of date.
          if (unregistered) {
            db.transaction((tx) => {
              sql = 'SELECT T.id AS t_id, T.task_id AS t_task_id, * FROM worklogs AS T LEFT JOIN register_info AS R ON T.id = R.worklog_id WHERE R.worklog_id IS NULL';
              tx.executeSql(sql, [], (tx, rs) => {
                for (let i = 0; i < rs.rows.length; i++) {
                  let row = rs.rows.item(i);

                  if (row.t_id && dbService.tasks[row.t_id] === undefined) {
                    dbService.tasks[row.t_id] = {
                      id: row.t_id,
                      worklog: row.worklog,
                      created: row.created,
                      description: row.description,
                      task_id: row.t_task_id,
                      issue: row.issue
                    };
                  }
                }
                deferSelectUnregistered.resolve();
              });
            });
          } else {
            deferSelectUnregistered.resolve();
          }
        });

        deferSelectUnregistered.promise.then(() => {
          db.transaction((tx) => {
            sql = 'SELECT * FROM time_entries';
            tx.executeSql(sql, [], (tx, rs) => {
              for (let i = 0; i < rs.rows.length; i++) {
                let row = rs.rows.item(i);
                let task_id = row.id;

                if (dbService.tasks[task_id]) {
                  if (!dbService.tasks[task_id].time_entries) {
                    dbService.tasks[task_id].time_entries = {};
                  }

                  dbService.tasks[task_id].time_entries[row.id] = {};
                  dbService.tasks[task_id].time_entries[row.id].id = row.id;
                  dbService.tasks[task_id].time_entries[row.id].start = row.start;

                  if (row.stop == '' || row.stop === undefined) {
                    dbService.tasks[task_id].active = true;
                  } else {
                    dbService.tasks[task_id].time_entries[row.id].stop = row.stop;
                  }
                }
              }
            });

            sql = 'SELECT * FROM register_info';
            tx.executeSql(sql, [], (tx, rs) => {
              for (let i = 0; i < rs.rows.length; i++) {
                let row = rs.rows.item(i);
                let task_id = row.worklog_id;

                if (dbService.tasks[task_id]) {
                  dbService.tasks[task_id].register_info = row;
                  dbService.tasks[task_id].register_info.registered = true;
                }
              }


            });
          });

          deferred.resolve(_.toArray(dbService.tasks));
        });
        return deferred.promise;
      },

      getTimeEntries: function (task_id) {
        let deferred = $q.defer();
        const sql = 'SELECT * FROM time_entries WHERE task_id = ?';
        let data = [task_id];

        let result = [];
        db.transaction((tx) => {
          tx.executeSql(sql, data, (tx, rs) => {
            for (let i = 0; i < rs.rows.length; i++) {
              let row = rs.rows.item(i);
              result[i] = {
                id: row.id,
                start: row.start,
                stop: row.stop
              };
            }
            deferred.resolve(result);
          });
        });

        // Get tasks stuff
        return deferred.promise;
      },
      saveWorklog: function (worklog) {
        let deferred = $q.defer();

        if (worklog.task === undefined) {
          worklog.task = '';
        }
        if (worklog.description === undefined) {
          worklog.description = '';
        }
        if (worklog.created === undefined) {
          worklog.created = new Date().getTime();
        }

        if (isNaN(worklog.id)) {
          this.saveNewWorklog(worklog, deferred);
        } else {
          this.updateTask(worklog, deferred);
        }

        return deferred.promise;
      },

      saveNewWorklog: function (worklog, deferred) {
        const self = this;
        const sql = 'INSERT INTO worklogs(id, task, description, task_id, created) VALUES (?, ?, ?, ?, ?)';
        let data = [null, worklog.task, worklog.description, worklog.task_id, worklog.created];

        db.transaction((tx) => {
          tx.executeSql(sql, data, (transaction, result) => {
            if (result.insertId) {
              dbService.tasks[result.insertId] = worklog;
              worklog.id = result.insertId;
              self.updateTimeEntries(worklog, deferred);
            }
          });
        });
      },
      updateTask: function (worklog, deferred) {
        const self = this;
        const sql = 'Update worklogs SET task = ?, description = ?, task_id = ?, created = ? WHERE id = ?';
        let data = [worklog.task, worklog.description, worklog.task_id, worklog.created, worklog.id];

        db.transaction((tx) => {
          tx.executeSql(sql, data, () => {
            self.updateTimeEntries(worklog, deferred);
          });
        });
      },
      updateTimeEntries: function (worklog, deferred) {
        const self = this;
        let promises = [];

        db.transaction((tx) => {
          const sql = 'DELETE FROM time_entries WHERE task_id = ?';
          tx.executeSql(sql, [worklog.id], () => {

            angular.forEach(worklog.time_entries, (timeEntry) => {
              promises.push(self.addTimeEntry(worklog.id, timeEntry.start, timeEntry.stop));
            });
          });
        });

        $q.all(promises).then(() => {
          if (worklog.register_info !== undefined) {
            self.saveRegisterInfo(worklog);
          }

          deferred.resolve(worklog.id);
        });
      },
      deleteTask: function (id) {
        db.transaction((tx) => {
          let data = [id];
          let sql = 'DELETE FROM worklogs WHERE id = ?';
          tx.executeSql(sql, data);

          sql = 'DELETE FROM time_entries WHERE task_id = ?';
          tx.executeSql(sql, data);

          sql = 'DELETE FROM register_info WHERE task_id = ?';
          tx.executeSql(sql, data);
        });

        delete dbService.tasks[id];
      },
      addTimeEntry: function (task_id, start, stop) {
        let deferred = $q.defer();
        const sql = 'INSERT INTO time_entries(task_id, start, stop) VALUES (?, ?, ?)';
        let data = [task_id, start, stop];

        db.transaction((tx) => {
          tx.executeSql(sql, data, (transaction, result) => {
            deferred.resolve(result.insertId);
          });
        });

        return deferred.promise;
      },

      // End timetaking for all entries.
      endAllTimeEntries: function () {
        let deferred = $q.defer();

        angular.forEach(dbService.tasks, (value, key) => {
          if (value.active) {
            dbService.tasks[key].active = false;
          }
        });

        let sql = 'UPDATE time_entries SET stop = ? WHERE stop = \'\'';
        let data = [new Date().getTime()];

        db.transaction((tx) => {
          tx.executeSql(sql, data, () => {
            deferred.resolve();
          });
        });

        return deferred.promise;
      },
      updateTimeEntry: function (start, stop, id) {
        let sql = '';
        let data = [];

        if (start === null) {
          sql = 'UPDATE time_entries SET stop = ? WHERE id = ?';
          data = [stop, id];
        }
        else {
          sql = 'UPDATE time_entries SET start = ?, stop = ? WHERE id = ?';
          data = [start, stop, id];
        }

        db.transaction((tx) => {
          tx.executeSql(sql, data);
        });
      },
      deleteTimeEntry: function (task_id, time_entry_id) {
        let sql = 'DELETE FROM time_entries WHERE id = ?';
        let data = [time_entry_id];

        db.transaction((tx) => {
          tx.executeSql(sql, data);
        });
      },
      saveRegisterInfo: function (worklog) {
        let sql = 'INSERT INTO register_info(worklog_id, date_entered, external_id) VALUES (?, ?, ?)';
        let data = [
          worklog.id,
          worklog.register_info.date_entered,
          worklog.register_info.external_id
        ];

        db.transaction((tx) => {
          tx.executeSql(sql, data);
        });
      }
    };

    return dbService;
  }
  ]);
