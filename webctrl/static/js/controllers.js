var QueueController = function ($scope, $interval, QueueService) {
  function updateQueue () {
    QueueService.query(function (data) {
      $scope.queue = data
    })
  }

  updateQueue()
  $interval(updateQueue, 10000)
}

QueueController.$inject = ['$scope', '$interval', 'QueueService']

var ProgramController = function ($scope, $timeout, $window, QueueService) {
  $scope.program = {name: undefined, positions: []}
  $scope.position = [16, 0, 0]

  $scope.addPositionToProgram = function () {
    const position = []
    $scope.position.forEach(function (item) {
      position.push(parseInt(item, 10))
    })
    $scope.program.positions.push(position)
  }

  function compile (program) {
    const SERVO = [0, 64, 128]
    const SKIP_WAIT = 32

    const result = {name: program.name || undefined, commands: []}
    let last = null

    program.positions.forEach(function (position) {
      if (last) {
        let skipWait = false

        for (let channel = 0; channel < 3; ++channel) {
          if (last[channel] !== position[channel]) {
            result.commands.push(SERVO[channel] | (skipWait ? SKIP_WAIT : 0) | position[channel])
            skipWait = true
          }
        }
      } else {
        result.commands.push(SERVO[0] | position[0])
        result.commands.push(SERVO[1] | SKIP_WAIT | position[1])
        result.commands.push(SERVO[2] | SKIP_WAIT | position[2])
      }

      last = position
    })

    return result
  }

  $scope.sendProgram = function () {
    QueueService.save(compile($scope.program))
    $timeout(function () { $window.location.reload() }, 3000)
  }
}

ProgramController.$inject = ['$scope', '$timeout', '$window', 'QueueService']

angular.module('fabrikaic-demo.controllers', []) // eslint-disable-line no-undef
  .controller('QueueController', QueueController)
  .controller('ProgramController', ProgramController)
