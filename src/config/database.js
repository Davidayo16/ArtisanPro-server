import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.bold);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB Connection Error: ${err}`.red);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB Disconnected".yellow);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`.red.bold);
    process.exit(1);
  }
};

export default connectDB;
