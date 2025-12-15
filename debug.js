// debug.js
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

console.log("Current working directory:", process.cwd());
console.log("Resolved .env path:", resolve(process.cwd(), ".env"));

const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  console.log("ERROR: .env file NOT FOUND at:", envPath);
  process.exit(1);
}

console.log(".env file FOUND");

const raw = readFileSync(envPath, "utf-8");
console.log("\n--- RAW .env CONTENT ---");
console.log(raw);
console.log("--- END ---\n");

const result = config({ path: envPath });

if (result.error) {
  console.log("dotenv FAILED to parse:", result.error.message);
  process.exit(1);
}

console.log("dotenv parsed successfully");
console.log("GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);
console.log(
  "GOOGLE_CLIENT_SECRET =",
  process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"
);
