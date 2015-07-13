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
    if (sw && ne) {
        this.init_(sw, ne);
    }
}


LatLngBounds.prototype.init_ = function(sw, ne) {
    this.sw = sw;
    this.ne = ne;
    this.nw = new LatLng(ne.lat(), sw.lng());
    this.se = new LatLng(sw.lat(), ne.lng());
}


LatLngBounds.prototype.contains = function(latLng) {
    return this.withinLatBounds_(latLng) && this.withinLngBounds_(latLng);
}


LatLngBounds.prototype.withinLatBounds_ = function(latLng) {
    return this.sw.lat() <= latLng.lat() && latLng.lat() <= this.ne.lat();
}


LatLngBounds.prototype.withinLngBounds_ = function(latLng) {
    if (this.sw.lng() > this.ne.lng()) {
        return (this.sw.lng() <= latLng.lng() && latLng.lng() <= 180) 
               || (this.ne.lng() >= latLng.lng() && latLng.lng() >= -180);
    } else {
        return this.sw.lng() <= latLng.lng() && latLng.lng() <= this.ne.lng();
    }
}


LatLngBounds.prototype.extend = function(latLng) {
    // If this LatLngBounds is uninitialized
    if (!this.sw && !this.ne) {
        this.init_(latLng, latLng);
        return this;
    }

    // Extend latitude bounds
    if (!this.withinLatBounds_(latLng)) {
        if (this.sw.lat() > latLng.lat()) {
            // Extend southwards
            this.sw = new LatLng(latLng.lat(), this.sw.lng());
        } else if (this.ne.lat() < latLng.lat()) {
            // Extend northwards
            this.ne = new LatLng(latLng.lat(), this.ne.lng());
        }
    }

    // Extend longitude bounds
    if (!this.withinLngBounds_(latLng)) {
        if (this.sw.distanceLngToLng(latLng) > this.ne.distanceLngToLng(latLng)) {
            // Extend eastwards
            this.ne = new LatLng(this.ne.lat(), latLng.lng());
        } else {
            // Extend westwards
            this.sw = new LatLng(this.sw.lat(), latLng.lng());
        }
    }
    return this;
}


LatLngBounds.prototype.getCenter = function() {
    var latDistance = this.sw.distanceLatToLat(this.ne) / 2;
    var lngDistance = this.sw.distanceLngToLng(this.ne) / 2;
    return new LatLng(this.sw.lat() + latDistance, this.sw.lng() + lngDistance);
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
