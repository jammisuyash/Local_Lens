'use client';

import { useState, useCallback, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationError {
  code: number;
  message: string;
}

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  
  const handleSuccess = (position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setError(null);
  };

  const handleError = (error: GeolocationPositionError) => {
    setError({ code: error.code, message: error.message });
    setLocation(null);
  };

  const getLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Clear previous state
      setLocation(null);
      setError(null);

      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } else {
      setError({ code: 0, message: 'Geolocation is not supported by your browser.' });
    }
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { location, error, getLocation };
}
