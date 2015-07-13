var express = require('express')
var https = require('https')
var polyline = require('polyline')
var LatLng = require('./models/LatLng')
var RouteBoxer = require('./models/RouteBoxer')
var routeBoxer = new RouteBoxer();
var app = express()
var port = 8080

var API_KEY = "AIzaSyBOfq7knvV8qWFG2eztBeL7NKCnNYmB6mU";

var options = {
    hostname: 'maps.googleapis.com',
    path: '/maps/api/directions/json?key=' + API_KEY + '&origin=3104+Heitman+Ct+San+Jose,+CA&destination=Bart+Way+Fremont,+CA+94536',
}

function log(type, message) {
    var s = Date.now() + '-' + type + ': ' + message;
    if (type == 'ERROR') {
        console.error(s);
    } else {
        console.log(s);
    }
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

app.get('/', function (req, res) {
    https.get(options, function (response) {
        response.setEncoding('utf-8');
        var result = '';
        response.on('data', function (data) {
            log('DEBUG', 'Data received.');
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
            result = JSON.parse(result);
            log('RESULT JSON', result);
            var overviewPolyline = result.routes[0].overview_polyline.points;
            log('OVERVIEW POLYLINE', overviewPolyline);
            var coordinates = polyline.decode(overviewPolyline);
            log('DECODED', coordinates);
            var latLngs = coordinatesToLatLng(coordinates);
            log('TRANSFORMED', latLngs);
            var boxes = routeBoxer.box(latLngs, 1);
            log('BOXED', boxes);
            res.send(boxes);
        });
    });
});

app.listen(port);