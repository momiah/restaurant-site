// DeliveryAvailability.js

import React, { useState } from 'react';
import { getUserLocation, isWithin2Miles } from './LocationVerifier' // Adjust the import path based on your project structure

const DeliveryAvailability = () => {
  const [userLocation, setUserLocation] = useState(null);

  const checkDeliveryAvailability = async () => {
    try {
      const location = await getUserLocation();
      setUserLocation(location);

      if (location) {
        const { latitude, longitude } = location;
        const within2Miles = isWithin2Miles(latitude, longitude);

        if (within2Miles) {
          console.log('You are within a 2-mile radius. Delivery is available.');
        } else {
          console.log('Sorry, delivery is not available for your location.');
        }
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  return (
    <div>
      <h1>Check Delivery Availability</h1>
      <button onClick={checkDeliveryAvailability}>Check Delivery</button>
    </div>
  );
};

export default DeliveryAvailability;
