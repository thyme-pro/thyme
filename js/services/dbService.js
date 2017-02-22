angular.module('thyme')
  .factory('dbService', ['$q', ($q) => {
    let db = openDatabase('db', '1.0', 'database', 2 * 1024 * 1024);

  // Create tables
    db.transaction( function(tx) {
      tx.executeSql('CREATE TABLE IF NOT EXISTS `tasks` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task` VARCHAR NOT NULL, `description` VARCHAR NOT NULL, `issue` VARCHAR NOT NULL, `issue_key` VARCHAR NOT NULL, `created` INTEGER)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS `time_entries` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task_id` INTEGER, `start` INTEGER, `stop` INTEGER)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS `register_info` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task_id` INTEGER, `date_entered` INTEGER, `issue_key` VARCHAR NOT NULL, `sugar_id` VARCHAR NOT NULL, `time_length` VARCHAR)');
    });

    let dbService = {
      tasks: {},

      getTasks: function(timeFrom, timeTo, unregistered) {
        let deferred = $q.defer();
        let sql = '';
        let data = [];

        // Get a list of tasks for the selected period.
        dbService.tasks = {};
        db.transaction(function(tx) {
          sql = 'SELECT * FROM tasks WHERE created > ? AND created < ?';
          data = [timeFrom, timeTo];

          tx.executeSql(sql, data, function(tx, rs) {
            for (let i=0; i<rs.rows.length; i++) {
              let row = rs.rows.item(i);

              if (dbService.tasks[row.id] === undefined) {
                dbService.tasks[row.id] = {
                  id: row.id,
                  task: row.task,
                  created: row.created,
                  description: row.description,
                  issue_key: row.issue_key,
                  issue: row.issue
                };
              }
            }
          });

      // If selected, get all tasks that are not registered, regardless of date.
          if (unregistered) {
            sql = 'SELECT T.id AS t_id, T.issue_key AS t_issue_key, * FROM tasks AS T LEFT JOIN register_info AS R ON T.id = R.task_id WHERE R.task_id IS NULL';
            tx.executeSql(sql, [], function(tx, rs) {
              for (let i=0; i<rs.rows.length; i++) {
                let row = rs.rows.item(i);

                if (row.t_id && dbService.tasks[row.t_id] === undefined) {
                  dbService.tasks[row.t_id] = {
                    id: row.t_id,
                    task: row.task,
                    created: row.created,
                    description: row.description,
                    issue_key: row.t_issue_key,
                    issue: row.issue
                  };
                }
              }
            });
          }

          sql = 'SELECT * FROM time_entries';
          tx.executeSql(sql, [], function(tx, rs) {
            for (let i=0; i<rs.rows.length; i++) {
              let row = rs.rows.item(i);
              let task_id = row.task_id;

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
          tx.executeSql(sql, [], function(tx, rs) {
            for (let i=0; i<rs.rows.length; i++) {
              let row = rs.rows.item(i);
              let task_id = row.task_id;

              if (dbService.tasks[task_id]) {
                dbService.tasks[task_id].register_info = row;
                dbService.tasks[task_id].register_info.registered = true;
              }
            }

          });

          deferred.resolve(_.toArray(dbService.tasks));
        });
        return deferred.promise;
      },

      getTimeEntries: function(task_id) {
        let deferred = $q.defer();
        const sql = 'SELECT * FROM time_entries WHERE task_id = ?';
        let data = [task_id];

        let result = [];
        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(tx, rs) {
            for (let i = 0; i < rs.rows.length; i++) {
              let row = rs.rows.item(i);
              result[i] = { id: row.id,
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
      saveTask: function(task) {
        const self = this;
        let deferred = $q.defer();

        if (task.task === undefined) {
          task.task = '';
        }
        if (task.description === undefined) {
          task.description = '';
        }
        if (task.issue === undefined) {
          task.issue = '';
        }
        if (task.created === undefined) {
          task.created = new Date().getTime();
        }

        if (isNaN(task.id)) {
          self.saveNewTask(task, deferred);
        } else {
          self.updateTask(task, deferred);
        }

        return deferred.promise;
      },

      saveNewTask: function(task, deferred) {
        const self = this;
        const sql = 'INSERT INTO tasks(id, task, description, issue, issue_key, created) VALUES (?, ?, ?, ?, ?, ?)';
        let data = [null, task.task, task.description, task.issue, task.issue_key, task.created];

      // If this is a new task. The timer will be started.
      //dbService.endAllTimeEntries().then(function() {
        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(transaction, result){
            if (result.insertId) {
              dbService.tasks[result.insertId] = task;
              task.id = result.insertId;
              self.updateTimeEntries(task, deferred);
            }
          });
       // });
        });
      },
      updateTask: function(task, deferred) {
        const self = this;
        const sql = 'Update tasks SET task = ?, description = ?, issue = ?, issue_key = ?, created = ? WHERE id = ?';
        let data = [task.task, task.description, task.issue, task.issue_key, task.created, task.id];

        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(){
            self.updateTimeEntries(task, deferred);
          });
        });
      },
      updateTimeEntries: function(task, deferred) {
        const self = this;
        let promises = [];

        db.transaction(function(tx) {
          const sql = 'DELETE FROM time_entries WHERE task_id = ?';
          tx.executeSql(sql, [task.id], () => {

            angular.forEach(task.time_entries, function(timeEntry) {
              promises.push(self.addTimeEntry(task.id, timeEntry.start, timeEntry.stop));
            });
          });
        });

        $q.all(promises).then(() => {
          if (task.register_info !== undefined) {
            self.saveRegisterInfo(task);
          }

          deferred.resolve(task.id);
        });
      },
      deleteTask: function(id) {
        db.transaction(function(tx) {
          let data = [id];
          let sql = 'DELETE FROM tasks WHERE id = ?';
          tx.executeSql(sql, data);

          sql = 'DELETE FROM time_entries WHERE task_id = ?';
          tx.executeSql(sql, data);

          sql = 'DELETE FROM register_info WHERE task_id = ?';
          tx.executeSql(sql, data);
        });

        delete dbService.tasks[id];
      },
      addTimeEntry: function(task_id, start, stop) {
        let deferred = $q.defer();
        const  sql = 'INSERT INTO time_entries(task_id, start, stop) VALUES (?, ?, ?)';
        let data = [task_id, start, stop];

        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(transaction, result) {
            deferred.resolve(result.insertId);
          });
        });

        return deferred.promise;
      },

    // End timetaking for all entries.
      endAllTimeEntries: function() {
        let deferred = $q.defer();

        angular.forEach(dbService.tasks, function(value, key){
          if (value.active) {
            dbService.tasks[key].active = false;
          }
        });

        let sql = 'UPDATE time_entries SET stop = ? WHERE stop = \'\'';
        let data = [new Date().getTime()];

        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(){
            deferred.resolve();
          });
        });

        return deferred.promise;
      },
      updateTimeEntry: function(start, stop, id) {
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

        db.transaction(function(tx) {
          tx.executeSql(sql, data);
        });
      },
      deleteTimeEntry: function(task_id, time_entry_id) {
        let sql = 'DELETE FROM time_entries WHERE id = ?';
        let data = [time_entry_id];

        db.transaction(function(tx) {
          tx.executeSql(sql, data);
        });
      },
      saveRegisterInfo: function(task) {
        let sql = 'INSERT INTO register_info(task_id, date_entered, sugar_id, issue_key, time_length) VALUES (?, ?, ?, ?, ?)';
        let data = [
          task.id,
          task.register_info.date_entered,
          task.register_info.sugar_id,
          task.register_info.issue_key,
          task.register_info.time_length,
        ];

        db.transaction(function(tx) {
          tx.executeSql(sql, data);
        });
      }
    };

    return dbService;
  }
  ]);
