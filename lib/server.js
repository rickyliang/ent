var express = require('express')
var https = require('https')
var polyline = require('polyline')
var Distance = require('geo-distance')
var Yelp = require('yelp')
var geocoder = require('geocoder')
var Promise = require('promise')

var LatLng = require('./models/LatLng')
var RouteBoxer = require('./models/RouteBoxer')

var yelpClient = Yelp.createClient({
    consumer_key: '54uTyasI9qHBQjmZ_pNBXQ',
    consumer_secret: 'HmI5D3FA_aEHkIHz7UYkl0s6XhA',
    token: 'v21PjCSRzXmsDeciJmUUUvb1CxiHTqf3',
    token_secret: 'jtQSqdbVRXSKs0zR6heIOCef68Y'
});
var routeBoxer = new RouteBoxer();
var app = express()
var port = 8080

var API_KEY = "AIzaSyBOfq7knvV8qWFG2eztBeL7NKCnNYmB6mU";

function log(type, message) {
    var s = Date.now() + '-' + type + ': ' + message + '\n';
    if (type == 'ERROR') {
        console.error(s);
    } else {
        console.log(s);
    }
}

function getRequestOptions(origin, destination) {
    origin = origin.split(" ").join("+");
    destination = destination.split(" ").join("+");
    var options = {
    hostname: 'maps.googleapis.com',
    path: '/maps/api/directions/json?key=' + API_KEY + '&origin=' + origin + '&destination=' + destination,
    }
    return options;
}

function coordinatesToLatLng(coordinates) {
    // Assuming a well-formed array of consecutive lat,lng pairs of floats
    // i.e., [37.123,-122.123,37.012,-122.234, ...]
    // This should be what is returned from decoding the overview_polyline
    var latLngs = [];
    for (var i = 0; i < coordinates.length; i++) {
        latLngs.push(new LatLng(coordinates[i][0], coordinates[i][1]));
    }
    return latLngs;
}

/**
 * Requests routed to /api/directions/
 * Required query parameters: 
 *      origin {String} An address or latitude longitude comma-separated pair
 *      destination {String} An address or latitude longitude comma-separated pair
**/      
app.get('/api/directions', function (req, res) {
    var options = getRequestOptions(req.query.origin, req.query.destination); 
    https.get(options, function (response) {
        response.setEncoding('utf-8');
        var result = '';
        response.on('data', function (data) {
            result += data;
        });
        response.on('err', function (err) {
            log('ERROR', err);
            res.sendStatus(404);
        });
        response.on('end', function () {
            log('DEBUG', 'HTTPS GET response end. Writing response.');
            res.status(200);
            res.set('content-type', 'application/json');

            // Parse result JSON string
            result = JSON.parse(result);

            // Extract polyline string
            var overviewPolyline = result.routes[0].overview_polyline.points;

            // Decode polyline string into an array of coordinates
            var coordinates = polyline.decode(overviewPolyline);

            // Convert coordinates into LatLng objects
            var latLngs = coordinatesToLatLng(coordinates);

            // Get total route distance in meters
            var totalDistance = result.routes[0].legs[0].distance.value;
            var boxes;

            // 10 mile increments (starting at 40 miles) to determine routeBoxer search distance 
            if (totalDistance > 64373.8) {              // > 40 mi
                boxes = routeBoxer.box(latLngs, 0.5);
            } else if (totalDistance > 48280.3) {       // > 30 mi
                boxes = routeBoxer.box(latLngs, 0.4);
            } else if (totalDistance > 32186.9) {       // > 20 mi
                boxes = routeBoxer.box(latLngs, 0.3);
            } else if (totalDistance > 16093.4) {       // > 10 mi
                boxes = routeBoxer.box(latLngs, 0.2);
            } else {                                    // > 0 mi
                boxes = routeBoxer.box(latLngs, 0.1);
            }

            // Gets approximately every 10th box
            var filteredBoxes = [];
            var increment = Math.floor(boxes.length / 10);
            // Metric used for determining when a box is "big"
            var bigBoxMetric = totalDistance / 15;
            for (i = 0; i < boxes.length; i += increment) {
                var box = boxes[i]
                var northEast = {
                    lat: box.getNorthEast().lat(),
                    lon: box.getNorthEast().lng()
                }
                var northWest = {
                    lat: box.getNorthWest().lat(),
                    lon: box.getNorthWest().lng()
                }
                var southWest = {
                    lat: box.getSouthWest().lat(),
                    lon: box.getSouthWest().lng()
                }
                
                var latDistance = Distance.between(northEast, northWest).human_readable();
                var lngDistance = Distance.between(southWest, northWest).human_readable();
                latDistance = latDistance.unit == 'km' ? latDistance.distance * 1000 : latDistance.distance;
                lngDistance = lngDistance.unit == 'km' ? lngDistance.distance * 1000 : lngDistance.distance;
                // If a box is "big", search on its adjacent boxes as well
                if (latDistance > bigBoxMetric || lngDistance > bigBoxMetric) {
                    if (i - 1 >= 0) { filteredBoxes.push(boxes[i - 1]); }
                    if (i + 1 < boxes.length) { filteredBoxes.push(boxes[i + 1]); }
                }
                filteredBoxes.push(box);
            }
            // Include the last box
            filteredBoxes.push(boxes[boxes.length - 1]);

            var yelpPromises = [];
            for (i = 0; i < filteredBoxes.length; i++) {
                var promise = new Promise(function (resolve, reject) {
                    var centerLatLng = filteredBoxes[i].getCenter();
                    geocoder.reverseGeocode(centerLatLng.lat(), centerLatLng.lng(), function ( err, data ) {
                        console.log("o m f g");
                        console.log(data);
                        // console.log(data);
                        yelpClient.search({term: "food", location: "1600 Pennsylvania Ave"}, function(error, data) {
                            if (error) { reject('Poo'); }
                            else { resolve(data); }
                            // console.log(error);
                            // console.log(data);
                        });
                    });
                });
                return;
                yelpPromises.push(promise);
            }

            // For each promise
            // promise.then(response) <-- that response IS either 'Poo' if it errored, or data if it did not
            // because we resolve'd or reject'd those values
            // promise.then(response) { do stuff with the response; }
            // Promise.all(yelpPromises).then(response) { do stuff with the array of resolved data; }
            Promise.all(yelpPromises).then(function (responses) {
                console.log(responses);
            });
    


            

            // log('RESULT JSON', result);
            // log('OVERVIEW POLYLINE', overviewPolyline);
            // log('DECODED', coordinates);
            // log('TRANSFORMED', latLngs);
            // log('BOXED', boxes);
            log('TOTAL DISTANCE', totalDistance);

            res.send(boxes);
        });
    });
});

app.listen(port);