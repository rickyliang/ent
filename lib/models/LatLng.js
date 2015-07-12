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
    this.lat = lat;
    this.lng = lng;
    this.noWrap = noWrap || false;
}


LatLng.prototype.equals = function(other) {
    return this.lat === other.lat && this.lng === other.lng;
}


LatLng.prototype.lat = function() {
    return this.lat;
}


LatLng.prototype.lng = function() {
    return this.lng;
}


LatLng.prototype.toString = function() {
    return '(' + this.lat + ', ' + this.lng + ')';
}


LatLng.prototype.toUrlValue = function(precision) {
    precision = precision || 6;
    var latSplit = this.lat.toString().split('.');
    var lngSplit = this.lng.toString().split('.');
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
