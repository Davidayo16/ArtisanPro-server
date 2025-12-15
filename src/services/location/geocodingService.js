import axios from "axios";

// Geocode address to coordinates (lat, lng)
export const geocodeAddress = async (address) => {
  try {
    if (!address) {
      throw new Error("Address is required");
    }

    const url = "https://maps.googleapis.com/maps/api/geocode/json";
    const params = {
      address: address,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(url, { params });

    if (response.data.status === "ZERO_RESULTS") {
      throw new Error("Address not found");
    }

    if (response.data.status !== "OK") {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];

    return {
      address: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      placeId: result.place_id,
      types: result.types,
    };
  } catch (error) {
    console.error("❌ Geocoding error:", error.message);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

// Reverse geocode coordinates to address
export const reverseGeocode = async (lat, lng) => {
  try {
    if (!lat || !lng) {
      throw new Error("Latitude and longitude are required");
    }

    const url = "https://maps.googleapis.com/maps/api/geocode/json";
    const params = {
      latlng: `${lat},${lng}`,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(url, { params });

    if (response.data.status !== "OK") {
      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];

    // Extract address components
    const addressComponents = {};
    result.address_components.forEach((component) => {
      if (component.types.includes("locality")) {
        addressComponents.city = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        addressComponents.state = component.long_name;
      }
      if (component.types.includes("country")) {
        addressComponents.country = component.long_name;
      }
    });

    return {
      address: result.formatted_address,
      ...addressComponents,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
    };
  } catch (error) {
    console.error("❌ Reverse geocoding error:", error.message);
    throw new Error(`Failed to reverse geocode: ${error.message}`);
  }
};

// Get place details by place ID
export const getPlaceDetails = async (placeId) => {
  try {
    if (!placeId) {
      throw new Error("Place ID is required");
    }

    const url = "https://maps.googleapis.com/maps/api/place/details/json";
    const params = {
      place_id: placeId,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(url, { params });

    if (response.data.status !== "OK") {
      throw new Error(`Place details fetch failed: ${response.data.status}`);
    }

    return response.data.result;
  } catch (error) {
    console.error("❌ Place details error:", error.message);
    throw new Error(`Failed to get place details: ${error.message}`);
  }
};
