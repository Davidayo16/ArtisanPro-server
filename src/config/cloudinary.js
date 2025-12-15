import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Test connection
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary Connected".green.bold);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary Connection Failed:".red, error.message);
    return null;
  }
};

export { cloudinary, testConnection };
