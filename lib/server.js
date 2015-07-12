var express = require('express')
var https = require('https')
var polyline = require('polyline')
var app = express()
var port = 8080

var API_KEY = "AIzaSyBOfq7knvV8qWFG2eztBeL7NKCnNYmB6mU";

var options = {
    hostname: 'maps.googleapis.com',
    path: '/maps/api/directions/json?key=' + API_KEY + '&origin=Berkeley,+CA&destination=San+Jose,+CA',
}

function log(type, message) {
    var s = Date.now() + '-' + type + ': ' + message;
    if (type == 'ERROR') {
        console.error(s);
    } else {
        console.log(s);
    }
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
            log('DECODED', polyline.decode(overviewPolyline));
            res.send(result);
        });
    });
});

app.listen(port);