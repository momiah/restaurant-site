// LocationVerifier.js
// Distance helpers for delivery-radius checks. The restaurant's location and radius
// come from its Firestore record (restaurant.location + ordering.deliveryRadiusMiles),
// not hard-coded values.

// Distance between two coordinates using the Haversine formula (kilometres).
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometres

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometres
}

const KM_PER_MILE = 1.609344;

// Is the user within `radiusMiles` of the restaurant at { lat, lng }?
export function isWithinRadius(userLat, userLon, restaurantLat, restaurantLon, radiusMiles) {
  const distanceKm = calculateDistance(
    userLat,
    userLon,
    restaurantLat,
    restaurantLon
  );
  const distanceInMiles = distanceKm / KM_PER_MILE;
  return distanceInMiles <= radiusMiles;
}

// Get the user's current location.
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(error.message);
        }
      );
    } else {
      reject('Geolocation is not supported in this browser.');
    }
  });
}
