var http = require('http')
var https = require('https')
var url = require('url')
var port = 80

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

var server = http.createServer(function (req, res) {
    https.get(options, function (response) {
        response.setEncoding('utf-8');
        var result = '';
        response.on('data', function (data) {
            log('DEBUG', 'Data received.');
            result += data;
        });
        response.on('err', function (err) {
            log('ERROR', err);
            res.writeHead(404);
            res.end();
        });
        response.on('end', function () {
            log('DEBUG', 'HTTPS GET response end. Writing response.');
            res.writeHead(200, {'content-type': 'application/json'});
            res.write(result);
            res.end();
        });
    });
});

server.listen(port);