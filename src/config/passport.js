import { config } from "dotenv";
config();

console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"
);

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import Customer from "../models/Customer.js";
import Artisan from "../models/Artisan.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        // Get role from query params (passed from frontend)
        const role = req.query.state || "customer";

        // Validate role
        if (!["customer", "artisan"].includes(role)) {
          return done(new Error("Invalid role"), null);
        }

        // Check if user already exists with this email
        let user = await User.findOne({ email });

        if (user) {
          // User exists - just return user
          console.log(`✅ Existing user logged in: ${email}`.green);
          return done(null, user);
        }

        // Create new user based on role
        const userData = {
          firstName: profile.name.givenName || "User",
          lastName: profile.name.familyName || "",
          email: email,
          // ✅ CHANGED: Removed phone: "" line completely
          password:
            Math.random().toString(36).slice(-8) +
            Math.random().toString(36).slice(-8),
          profilePhoto: profile.photos[0]?.value || "default-avatar.png",
          isEmailVerified: true,
          googleId: googleId,
          role: role,
        };

        // Create user based on role
        if (role === "customer") {
          user = await Customer.create(userData);
          console.log(`✅ New customer created via Google: ${email}`.green);
        } else if (role === "artisan") {
          const artisanData = {
            ...userData,
            location: {
              country: "Nigeria",
              coordinates: {
                type: "Point",
                coordinates: [0, 0],
              },
            },
          };

          user = await Artisan.create(artisanData);
          console.log(`✅ New artisan created via Google: ${email}`.green);
        }

        done(null, user);
      } catch (error) {
        console.error("❌ Google OAuth Error:", error);
        done(error, null);
      }
    }
  )
);

// Serialize user (store user id in session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user (retrieve user from session)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
