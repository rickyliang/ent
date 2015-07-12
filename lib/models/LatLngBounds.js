/**
 * @name LatLngBounds
 * @author Amy Shu, Ricky Liang
 *
 * @fileoverview The LatLngBounds class is an attempted clone of the google.maps.LatLngBounds class.
 */

var LatLng = require('./LatLng')

/**
 * Creates a new LatLngBounds
 *
 * @constructor
 */
function LatLngBounds(sw, ne) {
    this.sw = sw;
    this.ne = ne;
    this.nw = new LatLng(ne.lat(), sw.lng());
    this.se = new LatLng(sw.lat(), ne.lng());
}


LatLngBounds.prototype.contains = function(latLng) {
    // TODO
}


LatLngBounds.prototype.extend = function(latLng) {
    // TODO
}


LatLngBounds.prototype.getCenter = function() {
    // TODO
}


LatLngBounds.prototype.getNorthEast = function() {
    return this.ne;
}


LatLngBounds.prototype.getSouthWest = function() {
    return this.sw;
}


LatLngBounds.prototype.toString = function() {
    return '(' + this.sw + ', ' + this.ne + ')';
}


module.exports = LatLngBounds;
