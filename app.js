var app = angular.module('farmersmarkets', []);

app.filter('day', function() {
    return function(markets, day) {
        return markets.filter(function (market) {
            return day == market.day_;
        });
    };
});

var makeMap = function(elemId, centerCoords) {
    return new google.maps.Map(document.getElementById(elemId), {
        center: { lat: centerCoords.latitude, lng: centerCoords.longitude},
        zoom: 12
    });
};

var makeMarker = function(map, coords, title) {
    return new google.maps.Marker({
        map: map,
        position: new google.maps.LatLng(coords.latitude, coords.longitude),
        title: title
    });
};

var getDistances = function(originCoords, markets, callback) {
    return new google.maps.DistanceMatrixService().getDistanceMatrix({
        origins: [new google.maps.LatLng(originCoords.latitude, originCoords.longitude)],
        destinations: markets.map(function(m) {
            return new google.maps.LatLng(m.location_1.latitude, m.location_1.longitude);
        }),
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL
    }, callback);
};

app.controller('MainController', ['$scope', '$http', function($scope, $http) {
    $scope.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $scope.selectedDay = $scope.dayNames[(new Date()).getDay()];
    $scope.markets = [];
    $.get('https://data.baltimorecity.gov/resource/atzp-3tnt.json').done(function(data) {
        // GET succeeded; data should be an array of farmer's markets
        navigator.geolocation.getCurrentPosition(function(position) {
            // location succeded
            var map = makeMap('map', position.coords);
            var withLocation = [];

            data.forEach(function(market) {
                $scope.markets.push(market);

                if(market['location_1'] != null) {
                    withLocation.push(market);

                    market.address = JSON.parse(market.location_1.human_address).address;
                    makeMarker(map, market.location_1, market.name);
                } else {
                    market.address = 'not provided';
                    // fake distance mimicking the real ones returned by getDistances
                    market.distance = { text: 'unknown', value: Infinity };
                }
            });

            getDistances(position.coords, withLocation, function(resp, status) {
                if(status == 'OK')
                    for (var i = withLocation.length - 1; i >= 0; i--) {
                        withLocation[i].distance = resp.rows[0].elements[i].distance;
                    };
                $scope.$apply($scope.markets.sort(function(a, b) { return a.distance.value - b.distance.value; }));
            });
        }, function() { // user location not available
            alert('sorry, we need your location')
        });
    });
}]);
