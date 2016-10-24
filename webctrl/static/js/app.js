angular.module('fabrikaic-demo', ['ngResource', // eslint-disable-line no-undef
  'fabrikaic-demo.controllers',
  'fabrikaic-demo.services'
])
  .filter('hex', function () {
    return function (input) {
      return hexValue(input)
    }
  })

function hexValue (input) {
  return '0x' + ('00' + Number(input).toString(16).toUpperCase()).slice(-2)
}
