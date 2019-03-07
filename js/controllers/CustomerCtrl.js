angular.module('thyme').controller('CustomerCtrl', function($scope, $controller) {
    $controller('InfoCtrl', {$scope: $scope});

    const ipc = require('electron').ipcRenderer;

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
                $scope.customerInfo = data
            })
    }
});