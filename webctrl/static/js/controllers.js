var QueueController = function ($scope) {
  $scope.queue = this.getQueue()
}

QueueController.prototype.getQueue = function () {
  return [{
    name: undefined,
    commands: 322,
    status: 0
  }, {
    name: 'program_2',
    commands: 2,
    status: 1
  }, {
    name: 'program_3',
    commands: 20,
    status: 2
  }]
}

var ProgramController = function ($scope) {
  $scope.program = {name: undefined, positions: []}
  $scope.position = [16, 0, 0]
  $scope.addPositionToProgram = function () {
    $scope.program.positions.push(angular.copy($scope.position)) // eslint-disable-line no-undef
  }
}

angular.module('fabrikaic-demo.controllers', []) // eslint-disable-line no-undef
  .controller('QueueController', QueueController)
  .controller('ProgramController', ProgramController)
