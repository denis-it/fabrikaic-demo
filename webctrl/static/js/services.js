angular.module('fabrikaic-demo.services', []) // eslint-disable-line no-undef
  .factory('queue', function ($resource) {
    return $resource('/api/posts/:id')
  })
