angular.module('fabrikaic-demo.services', []) // eslint-disable-line no-undef
  .factory('QueueService', function ($resource) {
    return $resource('/api/queue')
  })
