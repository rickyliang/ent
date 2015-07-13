/**
 * @name LatLng
 * @author Amy Shu, Ricky Liang
 *
 * @fileoverview The LatLng class is an attempted clone of the google.maps.LatLng class.
 */


/**
 * Creates a new LatLng
 *
 * @constructor
 */
function LatLng(lat, lng, noWrap) {
    this.noWrap = noWrap || false;
    // Bound latitude to a minimum of -90 and a maxiumum of 90
    this._lat = lat < 0 ? Math.max(lat, -90) : Math.min(lat, 90);
    // Bound longitude to a minimum of -180 and a maximum of 180, unless noWrap
    if (this.noWrap) {
        this._lng = lng;
    } else {
        if (Math.abs(lng) > 180) {
            this._lng = lng < -180 ? (lng % 180) + 180 : -((-lng % 180) + 180);
        } else {
            this._lng = lng;
        }
     }
}


LatLng.prototype.equals = function(other) {
    return this._lat === other.lat() && this._lng === other.lng();
}


LatLng.prototype.lat = function() {
    return this._lat;
}


LatLng.prototype.lng = function() {
    return this._lng;
}


LatLng.prototype.distanceLatToLat = function(other) {
    return Math.abs(other.lat() - this._lat);
}


LatLng.prototype.distanceLngToLng = function(other) {
    var bigLng, smallLng;
    // Self-explanatory according to Amy but Ricky doesn't think so,
    // so he'll be back later to comment on this (to Amy's dismay, she's
    // like, wow csb
    // Ricky observes that, in the time he spent writing this out to
    // annoy Amy, he could've just written a legit comment lol.
    if (this._lng < other.lng()) {
        bigLng = other.lng();
        smallLng = this._lng;
    } else {
        bigLng = this._lng;
        smallLng = other.lng();
    }
    return Math.min(360 - (bigLng - smallLng), bigLng - smallLng);
}


LatLng.prototype.toString = function() {
    return '(' + this._lat + ', ' + this._lng + ')';
}


LatLng.prototype.toUrlValue = function(precision) {
    precision = precision || 6;
    var latSplit = this._lat.toString().split('.');
    var lngSplit = this._lng.toString().split('.');
    latSplit[1] = latSplit[1].substr(0, precision);
    lngSplit[1] = lngSplit[1].substr(0, precision);
    return latSplit.join('.') + ',' + lngSplit.join('.');
}


/* Based on the Latitude/longitude spherical geodesy formulae & scripts
   at http://www.movable-type.co.uk/scripts/latlong.html
   (c) Chris Veness 2002-2010
*/ 
LatLng.prototype.rhumbDestinationPoint = function (brng, dist) {
  var R = 6371; // earth's mean radius in km
  var d = parseFloat(dist) / R;  // d = angular distance covered on earth's surface
  var lat1 = this.lat().toRad(), lon1 = this.lng().toRad();
  brng = brng.toRad();

  var lat2 = lat1 + d * Math.cos(brng);
  var dLat = lat2 - lat1;
  var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
  var q = (Math.abs(dLat) > 1e-10) ? dLat / dPhi : Math.cos(lat1);
  var dLon = d * Math.sin(brng) / q;
  // check for going past the pole
  if (Math.abs(lat2) > Math.PI / 2) {
    lat2 = lat2 > 0 ? Math.PI - lat2 : - (Math.PI - lat2);
  }
  var lon2 = (lon1 + dLon + Math.PI) % (2 * Math.PI) - Math.PI;
 
  if (isNaN(lat2) || isNaN(lon2)) {
    return null;
  }
  return new LatLng(lat2.toDeg(), lon2.toDeg());
}


LatLng.prototype.rhumbBearingTo = function (dest) {
  var dLon = (dest.lng() - this.lng()).toRad();
  var dPhi = Math.log(Math.tan(dest.lat().toRad() / 2 + Math.PI / 4) / Math.tan(this.lat().toRad() / 2 + Math.PI / 4));
  if (Math.abs(dLon) > Math.PI) {
    dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
  }
  return Math.atan2(dLon, dPhi).toBrng();
}


module.exports = LatLng;
