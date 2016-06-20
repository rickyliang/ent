var express = require('express')
var https = require('https')
var polyline = require('polyline')
var Distance = require('geo-distance')
var Yelp = require('yelp')
var Promise = require('promise')
var LatLng = require('./models/LatLng')
var RouteBoxer = require('./models/RouteBoxer')
var _ = require('underscore')

var yelpClient = Yelp.createClient({
    consumer_key: '54uTyasI9qHBQjmZ_pNBXQ',
    consumer_secret: 'HmI5D3FA_aEHkIHz7UYkl0s6XhA',
    token: 'FJ_JyfgWxCTIfjyKh67Xp_i0qLWvV1bZ',
    token_secret: 'w031sjwHpxW2fFr2yq5bKtFIsFo'
});
var routeBoxer = new RouteBoxer();
var app = express()
var port = 8080

var GOOGLE_API_KEY = "AIzaSyCRHDc9_Vrd3yHAC9Jr5_PegUeB728EFKE";
var YELP_NUMBER_QUERIES = 6;

/**
 * Android API
 * Requests routed to /api/directions/
 * Required query parameters: 
 *      origin {String} An address or latitude longitude comma-separated pair
 *      destination {String} An address or latitude longitude comma-separated pair
 *      search {String} The business that is being searched for     
**/
app.get('/api/directions', function (req, res) {
    var origin = req.query.origin;
    var destination = req.query.destination;
    var search = req.query.search;
    var options = getDirectionsRequestOptions(origin, destination);
    var businesses = [];
    var totalDistance;
    httpsGet(options).then(function (result) {
        log('DEBUG', "Finished Google Directions API query")
        // Extract polyline string
        var overviewPolyline = result.routes[0].overview_polyline.points;

        // Decode polyline string into an array of coordinates
        var coordinates = polyline.decode(overviewPolyline);

        // Convert coordinates into LatLng objects
        var latLngs = coordinatesToLatLng(coordinates);

        // Get total route distance in meters
        totalDistance = result.routes[0].legs[0].distance.value;
        var boxes = getBoxes(latLngs, totalDistance);
        boxes = filterBoxes(boxes, totalDistance);

        log('DEBUG', "Got RouteBoxer boxes");

        return boxes;
    }).then(function (filteredBoxes) {
        log('DEBUG', "Making Yelp API queries...");
        var yelpPromises = [];
        for (i = 0; i < filteredBoxes.length; i++) {
            var promise = getYelpPromise(search, filteredBoxes[i].getCenter());
            yelpPromises.push(promise);
        }
        return Promise.all(yelpPromises).then(function (yelpResults) {
            return yelpResults;
        });
    }).then(function (yelpResults) {
        log('DEBUG', "Finished Yelp API queries.");
        // Get businesses from Yelp responses
        for (i = 0; i < yelpResults.length; i++) {
            businesses.push(yelpResults[i].businesses);
        }
        // Grab the next most relevant, unique business from each
        // Yelp response until 99 businesses are retrieved
        var businessLocations = [];
        var tempBusiness = [];
        for (i = 0; i < YELP_NUMBER_QUERIES; i++) {
            for (j = 0; j < businesses.length; j++) {
                // Get location from business, lat,long else address
                business = businesses[j][i];
                location = formatLocation(business.location);
                if (businessLocations.length >= 99) {
                    break;        
                } else if (businessLocations.indexOf(location) == -1) {
                    businessLocations.push(location);
                    tempBusiness.push(business);
                }
            }
        }
        businesses = tempBusiness;  // Assign to global businesses
        log('DEBUG', "Processed businesses.");
        return businessLocations;
    }).then(function (businessLocations) {
        log('DEBUG', "Making Google Distance Matrix API queries...");
        distanceMatrixPromises = []
        // Get the distances from origin -> businesses
        distanceMatrixPromises.push(
            httpsGet(getDistanceMatrixRequestOptions([origin], businessLocations))
        );
        // Get the distances from businesses -> destination
        distanceMatrixPromises.push(
            httpsGet(getDistanceMatrixRequestOptions(businessLocations, [destination]))
        );
        return Promise.all(distanceMatrixPromises).then(function (distanceMatrixResults) {
            return distanceMatrixResults;
        });
    }).then(function (distanceMatrixResults) {
        log('DEBUG', "Finished Google Distance Matrix API queries.");
        // Because the results may be unordered, we must
        // identify which response contains the distances
        // from origin -> businesses and from businesses -> destination
        originToBusiness = distanceMatrixResults[0].origin_addresses.length == 1 
            ? distanceMatrixResults[0].rows[0].elements : distanceMatrixResults[1].rows[0].elements;
        businessToDestination = distanceMatrixResults[0].destination_addresses.length == 1
            ? distanceMatrixResults[0].rows : distanceMatrixResults[1].rows;

        // For each business, calculate the total distance
        // from origin -> business -> destination
        totalBusinessDistances = [];
        for (var i = 0; i < originToBusiness.length; i++) {
            originDistance = originToBusiness[i].distance.value;
            destinationDistance = businessToDestination[i].elements[0].distance.value;
            totalBusinessDistances.push(originDistance + destinationDistance);
        }
        return totalBusinessDistances;
    }).then(function (totalBusinessDistances) {
        log('DEBUG', "About to send response!");
        // Sort routes by least distance traveled
        pairedBusinessDistances = _.zip(totalBusinessDistances, businesses);
        pairedBusinessDistances.sort(function (a1, a2) { return a1[0] - a2[0] });
        res.status(200);
        res.setHeader("Content-Type", "application/json");
        // Return array of businesses sorted from least to greatest distance traveled
        data = _.map(pairedBusinessDistances, function (pair) {
            // Calculate the extra distance traveled
            business = pair[1];
            business.enroute_distance = pair[0] - totalDistance;
            return business
        });
        json = JSON.stringify({'data': data});
        //TODO: return the business distances as well
        console.log(json);
        res.send(json);
    });
});

/**
 * Web routes
 */
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/boxer.html');
});

app.get('/models/*', function(req, res) {
    var filename = req.url.substring(req.url.lastIndexOf('/'));
    res.sendFile(__dirname + '/models/' + filename);
});

/**
 * Helper functions
 */
function log(type, message) {
    var s = Date.now() + '-' + type + ': ' + message;
    if (type == 'ERROR') {
        console.error(s);
    } else {
        console.log(s);
    }
}

function _urlify(location) {
    return location.split(' ').join('+');
}

function getDistanceMatrixRequestOptions(origins, destinations) {
    origins = _.map(origins, _urlify).join('|');
    destinations = _.map(destinations, _urlify).join('|');
    var options = {
        hostname: 'maps.googleapis.com',
        path: '/maps/api/distancematrix/json?key=' + GOOGLE_API_KEY + '&origins=' + origins + '&destinations=' + destinations
    }
    return options;
}

function getDirectionsRequestOptions(origin, destination) {
    origin = _urlify(origin);
    destination = _urlify(destination);
    var options = {
        hostname: 'maps.googleapis.com',
        path: '/maps/api/directions/json?key=' + GOOGLE_API_KEY + '&origin=' + origin + '&destination=' + destination,
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

function httpsGet(options) {
    return new Promise(function (resolve, reject) {
        https.get(options, function (response) {
            response.setEncoding('utf-8');
            var result = '';
            response.on('data', function (data) {
                result += data;
            });
            response.on('err', function (err) {
                log('ERROR', err);
                reject(err);
            });
            response.on('end', function() {
                // log('DEBUG', 'HTTPS GET response end. Writing response.');
                resolve(JSON.parse(result));
            });
        });
    });
}

function getBoxes(latLngs, totalDistance) {
    // 10 mile increments (starting at 40 miles) to determine routeBoxer search distance
    if (totalDistance > 64373.8) {              // > 40 mi
        return routeBoxer.box(latLngs, 0.5);
    } else if (totalDistance > 48280.3) {       // > 30 mi
        return routeBoxer.box(latLngs, 0.4);
    } else if (totalDistance > 32186.9) {       // > 20 mi
        return routeBoxer.box(latLngs, 0.3);
    } else if (totalDistance > 16093.4) {       // > 10 mi
        return routeBoxer.box(latLngs, 0.2);
    } else {                                    // > 0 mi
        return routeBoxer.box(latLngs, 0.1);
    }
}

function filterBoxes(boxes, totalDistance) {
    // Gets approximately every 10th box
    var filteredBoxes = [];
    var increment = boxes.length < 10 ? 1 : Math.floor(boxes.length / 10);

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
    return filteredBoxes;  
}

function getYelpPromise(searchTerm, centerLatLng) {
    return new Promise(function (resolve, reject) {
        yelpParams = {
            term: searchTerm,
            ll: centerLatLng.lat() + ',' + centerLatLng.lng(),
            limit: YELP_NUMBER_QUERIES
        }
        yelpClient.search(yelpParams, function(error, data) {
            if (error) { reject('Invalid Yelp request parameters'); }
            else { resolve(data); }
        });
    });
}

function formatLocation(location) {    
    if (location.hasOwnProperty('coordinate')) {
        coordinate = location.coordinate;
        return coordinate.latitude + ',' + coordinate.longitude;
    } else {
        address = location.address[0];
        city = location.city;
        state = location.state_code;
        postal_code = location.postal_code;
        return [address, city, state + ' ' + postal_code].join();
    }
}

app.listen(port);