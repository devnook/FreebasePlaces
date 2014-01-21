/**
 * @fileoverview The interactive app UI.
 */


/**
 * Initializes the UI.
 */
fbmap.initialize = function() {
  $('.card').hide();
  $('.places-card').hide();
  var lat = 37.75;  // Default: San Francisco.
  var lng = -122.5;  // Default: San Francisco.
  fbmap.initMap(lat, lng);
};

google.maps.event.addDomListener(window, 'load', fbmap.initialize);
