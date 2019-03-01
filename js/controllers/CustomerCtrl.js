angular.module('thyme').controller('CustomerCtrl', function($scope, $log) {
    const ipc = require('electron').ipcRenderer;

    $log.log('CustomerCtrl loaded');

    $scope.apiToken = localStorage['internalApiToken'];
    $scope.url = localStorage['dashboardUrl'];
    $scope.taskId = null;


    ipc.on('start-worklog', (event, data) => {
        let worklog = data.obj;
        if ($scope.taskId != worklog.task_id) {
            $scope.fetchCustomerInfo(worklog.task_id);
            $scope.taskId = worklog.task_id;
        }
    })

    ipc.on('save-worklog', (event, data) => {
        let worklog = data.obj;
        if ($scope.taskId != worklog.task_id) {
            $scope.fetchCustomerInfo(worklog.task_id)
            $scope.taskId = worklog.task_id;
        }
    })

    $scope.fetchCustomerInfo = (taskId) => {
        $scope.customerInfo = {}

        fetch(`${$scope.url}api/tracker/customer/info/${taskId}?api_token=${$scope.apiToken}`, {
            headers: helper.basicAuthHeaders
        })
            .then(res => res.json())
            .then(data => {
                console.log(data);
                $scope.customerInfo = data
            })
    }
});