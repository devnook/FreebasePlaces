/**
 * @fileoverview Example maps app, allowing the user to view data from Freebase.
 */


/**
 * Namespace.
 */
var fbmap = {
  apiKey: 'AIzaSyA--BfDpMn2dJWZOssuXQhrhODwCH0exvY',
  map: null,
  currentLatLng: null,
  markers: [], //Keep track of currently displayed markers.
  searchUrl: 'https://www.googleapis.com/freebase/v1/search',
  topicUrl: 'https://www.googleapis.com/freebase/v1/topic/',
  reconcileUrl: 'https://www.googleapis.com/freebase/v1/reconcile',
  category: '/dining/restaurant',
  locString: '/location/location/geolocation',
  icons: {
    reconciled: 'http://mt.googleapis.com/vt/icon/name=icons/spotlight/' +
        'spotlight-ad.png&scale=1',
    places: 'http://mt.googleapis.com/vt/icon/name=icons/spotlight/' +
        'spotlight-waypoint-blue.png&scale=1',
  }
};


/**
 * Sets a flash message for the user.
 * @param {string} msg The content of the message.
 * @param {string=} opt_type The optional type of the message: error or info.
 */
fbmap.setFlash = function(msg, opt_type) {
  var type = opt_type || 'info';
  $('#flash').addClass(type).text(msg);
};


/**
 * Initializes the map, sets up base click listeners.
 * @param {number} lat Latitude for the map center.
 * @param {number} lng Longitude for the map center.
 */
fbmap.initMap = function(lat, lng) {
  var mapOptions = {
    zoom: 8,
    center: new google.maps.LatLng(lat, lng),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  fbmap.currentLatLng = mapOptions.center;
  fbmap.map = new google.maps.Map($('#map-canvas')[0], mapOptions);

  // Query for new features on a click.
  google.maps.event.addListener(fbmap.map, 'click', function(e) {
    fbmap.currentLatLng = e.latLng;
    fbmap.clearMap();
    fbmap.getFreebaseLocations();
    fbmap.getPlacesLocations();
  });

  fbmap.clearMap();
  fbmap.getFreebaseLocations();
  fbmap.getPlacesLocations();
};

// This wrapper function allows to pass additional argument, 'category'.
fbmap.createMarkers = function(response) {
      if (!response.result) {
        fbmap.setFlash('No results found for this area.', 'error');
      }
      var bounds = new google.maps.LatLngBounds();
      $.each(response.result, function(i, result) {
        var loc = result.output[fbmap.locString][fbmap.locString][0];
        var latLng = new google.maps.LatLng(loc.latitude, loc.longitude);
        var marker = new google.maps.Marker({
          position: latLng,
          map: fbmap.map,
          title: result.name
        });
        fbmap.markers.push(marker);
        // Keep track of the bounding box of all results.
        bounds.extend(latLng);
        google.maps.event.addListener(marker, 'click', function() {
          $('.places-card').hide();
          if (!cards.isCardDisplayed(result.mid)) {
            var params = {
              filter: 'allproperties'
            };
            $.getJSON(fbmap.topicUrl + result.mid, cards.displayCard);
          }
        });
      });
      if (response.result.length > 1) {
        fbmap.map.fitBounds(bounds);
      }
  };

/**
 * Queries for new freebase locations.
 */
fbmap.getFreebaseLocations = function() {
  var latLng = fbmap.currentLatLng;
  // Create the Freebase API query.
  var loc = ' lon:' + latLng.lng() + ' lat:' + latLng.lat();
  loc = '(all type:' + fbmap.category + ' (within radius:50000ft' +
      loc + '))';
  var params = {
    filter: loc,
    output: '(' + fbmap.locString + ')'
  };
  $.getJSON(fbmap.searchUrl, params, fbmap.createMarkers);
};


fbmap.nearbySearchCallback = function(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0, result; result = results[i]; i++) {
      var marker = new google.maps.Marker({
        map: fbmap.map,
        position: result.geometry.location,
        icon: fbmap.icons.places
      });
      marker.result = result;

      // Create Freebase Reconcile query
      var reconcileUrl = fbmap.reconcileUrl + '?key=' + fbmap.apiKey +
          '&kind=' + fbmap.category + '&name=';
      var name = result.name.replace(' ', '+');

      // This wrapper function allows to pass additional argument, 'category'.
      var reconcileMarker = function(marker) {
        return function(response) {
          if (!response.candidate) {
            return;
          }
          marker.setIcon(fbmap.icons.reconciled);
          marker.mid = response.candidate[0].mid;
          google.maps.event.addListener(marker, 'click', function() {
            if (!cards.isCardDisplayed(marker.mid)) {
              $('.card').hide();
              var params = {
                filter: 'allproperties'
              };
              $.getJSON(
                  fbmap.topicUrl + response.candidate[0].mid,
                  cards.displayCard);
            }
          });
        }
      };
      $.get(reconcileUrl+name, reconcileMarker(marker));

      google.maps.event.addListener(marker, 'click', function() {
        if (this.mid !== $('.card').attr('data-mid')) {
          $('.card').hide();
        }
        var request = {
          reference: this.result.reference
        };
        service = new google.maps.places.PlacesService(fbmap.map);
        service.getDetails(request, callback);
        function callback(place, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            cards.displayPlacesCard(place);
          }
        }
      });
    }
  }
};


/**
 * Queries for new Places API locations.
 */
fbmap.getPlacesLocations = function() {
  var latLng = fbmap.currentLatLng;
  var request = {
    location: fbmap.currentLatLng,
    radius: '50000',
    types: ['restaurant']
  };
  var service = new google.maps.places.PlacesService(fbmap.map);
  service.nearbySearch(request, fbmap.nearbySearchCallback);
};


/**
 * Clears the map of all markers and cards.
 */
fbmap.clearMap = function() {
  // Loop through all currently displayed markers and remove from map.
  $.each(fbmap.markers, function(i, marker) {
    marker.setMap(null);
  });
  fbmap.markers = [];
  $('.card').hide();
};
