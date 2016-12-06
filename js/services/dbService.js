angular.module('thyme')
  .factory('dbService', ['$q', '$rootScope', function($q, $rootScope) {
  var db = openDatabase('db', '1.0', 'database', 2 * 1024 * 1024);

  // Create tables
  db.transaction( function(tx) {
    tx.executeSql("CREATE TABLE IF NOT EXISTS `tasks` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task` VARCHAR NOT NULL, `description` VARCHAR NOT NULL, `issue` VARCHAR NOT NULL, `issue_key` VARCHAR NOT NULL, `created` INTEGER)");
    tx.executeSql("CREATE TABLE IF NOT EXISTS `time_entries` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task_id` INTEGER, `start` INTEGER, `stop` INTEGER)");
    tx.executeSql("CREATE TABLE IF NOT EXISTS `register_info` (`id` INTEGER PRIMARY KEY NOT NULL UNIQUE, `task_id` INTEGER, `date_entered` INTEGER, `issue_key` VARCHAR NOT NULL, `sugar_id` VARCHAR NOT NULL, `time_length` VARCHAR)");
  });

  /**
   * Fetch tasks.
   */
  function getTasks(timeFrom, timeTo, unregistered) {
    var deferred = $q.defer();
    var sql = "";
    var data = [];

    // Get a list of tasks for the selected period.
    dbService.tasks = {};
    db.transaction(function(tx) {
      sql = "SELECT * FROM tasks WHERE created > ? AND created < ?";
      data = [timeFrom, timeTo];

      tx.executeSql(sql, data, function(tx, rs) {
        for(var i=0; i<rs.rows.length; i++) {
          var row = rs.rows.item(i);

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
        sql = "SELECT T.id AS t_id, T.issue_key AS t_issue_key, * FROM tasks AS T LEFT JOIN register_info AS R ON T.id = R.task_id WHERE R.task_id IS NULL";
        tx.executeSql(sql, [], function(tx, rs) {
          for(var i=0; i<rs.rows.length; i++) {
            var row = rs.rows.item(i);

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

      sql = "SELECT * FROM time_entries";
      tx.executeSql(sql, [], function(tx, rs) {
        for(var i=0; i<rs.rows.length; i++) {
          var row = rs.rows.item(i);
          var task_id = row.task_id;

          if (dbService.tasks[task_id]) {
            if (!dbService.tasks[task_id].time_entries) {
              dbService.tasks[task_id].time_entries = {};
            }
            if (row.stop === '') {
              dbService.tasks[task_id].active = true;
            }
            dbService.tasks[task_id].time_entries[row.id] = {};
            dbService.tasks[task_id].time_entries[row.id].id = row.id;
            dbService.tasks[task_id].time_entries[row.id].start = row.start;
            if (row.stop !== '') {
              dbService.tasks[task_id].time_entries[row.id].stop = row.stop;
            }
          }
        }
      });

      sql = "SELECT * FROM register_info";
      tx.executeSql(sql, [], function(tx, rs) {
        for(var i=0; i<rs.rows.length; i++) {
          var row = rs.rows.item(i);
          var task_id = row.task_id;

          if (dbService.tasks[task_id]) {
            dbService.tasks[task_id].register_info = row;
            dbService.tasks[task_id].register_info.registered = true;
          }
        }

      });

      deferred.resolve(dbService.tasks);
    });
    return deferred.promise;
  }

  var dbService = {
    tasks: {},
    getTasks: function(timeFrom, timeTo, unregistered) {
      return getTasks(timeFrom, timeTo, unregistered);
    },
    getTimeEntries: function(task_id) {
      var deferred = $q.defer();
      var sql = "SELECT * FROM time_entries WHERE task_id = ?";
      var data = [task_id];

      result = [];
      db.transaction(function(tx) {
        tx.executeSql(sql, data, function(tx, rs) {
          for (var i = 0; i < rs.rows.length; i++) {
                var row = rs.rows.item(i);
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
      var deferred = $q.defer();
      var sql = '';
      var data = [];

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

      if (task.id === undefined) {
        var id = null;
        sql = "INSERT INTO tasks(id, task, description, issue, issue_key, created) VALUES (?, ?, ?, ?, ?, ?)";
        data = [id, task.task, task.description, task.issue, task.issue_key, task.created];

        // If this is a new task. The timer will be started.
        dbService.endAllTimeEntries().then(function() {
          db.transaction(function(tx) {
            tx.executeSql(sql, data, function(transaction, result){
              if (task.id === undefined && result.insertId) {
                dbService.tasks[result.insertId] = task;
                dbService.startTime(result.insertId).then(function() {
                  deferred.resolve()
                });
              }
            });
          });
        });
      }
      else {
        sql = "Update tasks SET task = ?, description = ?, issue = ?, issue_key = ?, created = ? WHERE id = ?";
        data = [task.task, task.description, task.issue, task.issue_key, task.created, task.id];

        db.transaction(function(tx) {
          tx.executeSql(sql, data, function(transaction, result){
            deferred.resolve()
          });
        });
      }

      return deferred.promise;
    },
    deleteTask: function(id) {
      db.transaction(function(tx) {
        var data = [id];
        var sql = "DELETE FROM tasks WHERE id = ?";
        tx.executeSql(sql, data);

        sql = "DELETE FROM time_entries WHERE task_id = ?";
        tx.executeSql(sql, data);

        sql = "DELETE FROM register_info WHERE task_id = ?";
        tx.executeSql(sql, data);
      });

      delete dbService.tasks[id];
    },
    addTimeEntry: function(task_id, start, stop) {
      var deferred = $q.defer();
      var sql = "INSERT INTO time_entries(task_id, start, stop) VALUES (?, ?, ?)";
      var data = [task_id, start, stop];

      db.transaction(function(tx) {
        tx.executeSql(sql, data, function(transaction, result) {
          deferred.resolve(result.insertId);
        });
      });

      return deferred.promise;
    },
    // Start the timer for a task.
    startTime: function(task_id) {
      var deferred = $q.defer();

      dbService.endAllTimeEntries().then(function(){
        var start = new Date().getTime();
        dbService.addTimeEntry(task_id, start, '').then(function(insertId){

          dbService.tasks[task_id].active = true;

          if (dbService.tasks[task_id].time_entries === undefined) {
            dbService.tasks[task_id].time_entries = {};
          }
          dbService.tasks[task_id].time_entries[insertId] = {
            task_id: task_id,
            id: insertId,
            start: start,
          };

          deferred.resolve();
        });
      });
      return deferred.promise;
    },
    // End timetaking for all entries.
    endAllTimeEntries: function() {
      var deferred = $q.defer();

      angular.forEach(dbService.tasks, function(value, key){
        if (value.active) {
          dbService.tasks[key].active = false;
        }
      });

      var sql = "UPDATE time_entries SET stop = ? WHERE stop = ''";
      var data = [new Date().getTime()];

      db.transaction(function(tx) {
        tx.executeSql(sql, data, function(){
          deferred.resolve();
        });
      });

      return deferred.promise;
    },
    updateTimeEntry: function(start, stop, id) {
      var sql = '';
      var data = [];

      if (start === null) {
        sql = "UPDATE time_entries SET stop = ? WHERE id = ?";
        data = [stop, id];
      }
      else {
        sql = "UPDATE time_entries SET start = ?, stop = ? WHERE id = ?";
        data = [start, stop, id];
      }

      db.transaction(function(tx) {
        tx.executeSql(sql, data);
      });
    },
    deleteTimeEntry: function(task_id, time_entry_id) {
      delete dbService.tasks[task_id].time_entries[time_entry_id];
      var sql = "DELETE FROM time_entries WHERE id = ?";
      var data = [time_entry_id];

      db.transaction(function(tx) {
        tx.executeSql(sql, data);
      });
    },
    registerTask: function(task) {
      var deferred = $q.defer();

      // @todo: redo the calculation of minutes
      task.total = calculate_total_for_task(task);

      var data = {
        login: {
          endpoint: localStorage.crmEndpoint,
          user: localStorage.crmUsername,
          pass: localStorage.crmPassword
        },
        task: task
      };

      $.post(localStorage.trckrServer + '/trckr.php?q=register', data).success(function(data){
        if(data.status === "success"){
          dbService.tasks[task.id].register_info = {};
          dbService.tasks[task.id].register_info.issue_key = data.message.issue_key;
          dbService.tasks[task.id].register_info.sugar_id = data.message.crm_id;
          dbService.tasks[task.id].register_info.date_entered = data.message.timestamp;
          dbService.tasks[task.id].register_info.time_length = data.message.time_length;
          dbService.saveRegiserInfo(dbService.tasks[task.id]);

          deferred.resolve({'registered': true});
        }
        else {
          $rootScope.$broadcast('displayError', data);
        }
      });
      return deferred.promise;
    },
    updateRegisterTask: function(info) {
      var deferred = $q.defer();
      var task = {};
      task.total = info.timeLength;
      task.entry_id = info.id;
      task.issue_key = info.issue_key;
      task.created = info.time;
      task.id = info.task_id;

      var data = {
        login: {
          endpoint: localStorage.crmEndpoint,
          user: localStorage.crmUsername,
          pass: localStorage.crmPassword
        },
        task: task
      };

      $.post(localStorage.trckrServer + '/trckr.php?q=register', data).success(function(data){
        if(data.status === "success"){
          dbService.tasks[task.id].register_info = {};
          dbService.tasks[task.id].register_info.issue_key = data.message.issue_key;
          dbService.tasks[task.id].register_info.sugar_id = data.message.crm_id;
          dbService.tasks[task.id].register_info.date_entered = data.message.timestamp;
          dbService.tasks[task.id].register_info.time_length = data.message.time_length;
          dbService.saveRegiserInfo(dbService.tasks[task.id]);

          deferred.resolve({'registered': true});
        }
      });
      return deferred.promise;
    },
    saveRegisterInfo: function(task) {
      var sql = "INSERT INTO register_info(task_id, date_entered, sugar_id, issue_key, time_length) VALUES (?, ?, ?, ?, ?)";
      var data = [
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
