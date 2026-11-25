// Loads environment configuration and sets the server DNS resolvers.
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

console.log("MONGODB_URL loaded:", !!process.env.MONGODB_URL);
