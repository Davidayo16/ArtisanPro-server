import { getDistance, isPointWithinRadius, orderByDistance } from 'geolib';

// Calculate distance between two points (in kilometers)
export const calculateDistance = (point1, point2) => {
  try {
    // point1 and point2 should be { latitude, longitude } or { lat, lng }
    const distance = getDistance(
      { 
        latitude: point1.lat || point1.latitude, 
        longitude: point1.lng || point1.longitude 
      },
      { 
        latitude: point2.lat || point2.latitude, 
        longitude: point2.lng || point2.longitude 
      }
    );

    // Convert meters to kilometers
    return (distance / 1000).toFixed(2);
  } catch (error) {
    console.error('❌ Distance calculation error:', error.message);
    return null;
  }
};

// Check if point is within radius (in kilometers)
export const isWithinRadius = (centerPoint, targetPoint, radiusInKm) => {
  try {
    const radiusInMeters = radiusInKm * 1000;

    return isPointWithinRadius(
      { 
        latitude: targetPoint.lat || targetPoint.latitude, 
        longitude: targetPoint.lng || targetPoint.longitude 
      },
      { 
        latitude: centerPoint.lat || centerPoint.latitude, 
        longitude: centerPoint.lng || centerPoint.longitude 
      },
      radiusInMeters
    );
  } catch (error) {
    console.error('❌ Radius check error:', error.message);
    return false;
  }
};

// Sort array of locations by distance from a center point
export const sortByDistance = (centerPoint, locations) => {
  try {
    const locationsWithCoords = locations.map((location) => ({
      ...location,
      latitude: location.coordinates?.lat || location.location?.coordinates?.coordinates?.[1],
      longitude: location.coordinates?.lng || location.location?.coordinates?.coordinates?.[0],
    }));

    const sorted = orderByDistance(
      { 
        latitude: centerPoint.lat || centerPoint.latitude, 
        longitude: centerPoint.lng || centerPoint.longitude 
      },
      locationsWithCoords
    );

    return sorted.map((location) => {
      const distance = calculateDistance(centerPoint, {
        lat: location.latitude,
        lng: location.longitude,
      });

      return {
        ...location,
        distance: distance ? parseFloat(distance) : null,
      };
    });
  } catch (error) {
    console.error('❌ Sort by distance error:', error.message);
    return locations;
  }
};

// Calculate ETA based on distance (simple estimation)
export const calculateETA = (distanceInKm, speedKmPerHour = 30) => {
  try {
    const hours = distanceInKm / speedKmPerHour;
    const minutes = Math.round(hours * 60);

    if (minutes < 60) {
      return `${minutes} mins`;
    } else {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
  } catch (error) {
    console.error('❌ ETA calculation error:', error.message);
    return null;
  }
};

// Get bounding box for a radius search (optimization)
export const getBoundingBox = (centerPoint, radiusInKm) => {
  // Rough approximation: 1 degree latitude ≈ 111km
  const latDelta = radiusInKm / 111;
  const lngDelta = radiusInKm / (111 * Math.cos((centerPoint.lat * Math.PI) / 180));

  return {
    minLat: centerPoint.lat - latDelta,
    maxLat: centerPoint.lat + latDelta,
    minLng: centerPoint.lng - lngDelta,
    maxLng: centerPoint.lng + lngDelta,
  };
};