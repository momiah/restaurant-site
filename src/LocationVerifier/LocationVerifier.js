// LocationVerifier.js

// Function to calculate the distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
  
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    const distance = R * c; // Distance in kilometers
  
    return distance;
  }
  
  // Function to check if the user is within a 2-mile radius from the restaurant
  export function isWithin2Miles(userLat, userLon) {
    // Restaurant's location
    const restaurantLat = 51.67133515426596;
    const restaurantLon =  -0.04075122357137261;
  
    // Calculate the distance between the user and the restaurant
    const distance = calculateDistance(
      userLat,
      userLon,
      restaurantLat,
      restaurantLon
    );
  
    // Convert distance from kilometers to miles
    const distanceInMiles = distance * 0.621371;
  
    // Check if the user is within a 2-mile radius
    return distanceInMiles <= 2;
  }
  
  // Function to get the user's location
  export function getUserLocation() {
    return new Promise((resolve, reject) => {
      // Check if the browser supports Geolocation
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
  