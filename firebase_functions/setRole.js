// setRole.js
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Allowed roles
const VALID_ROLES = ["admin", "bookkeeper", "client-staff"];

// CLI args: node setRole.js UID role
const [,, uid, role] = process.argv;

async function run() {
  try {
    if (!uid || !role) {
      console.error("❌ Usage: node setRole.js <UID> <role>");
      console.error("Valid roles:", VALID_ROLES.join(", "));
      process.exit(1);
    }

    if (!VALID_ROLES.includes(role)) {
      console.error(`❌ Invalid role "${role}".`);
      console.error("Valid roles:", VALID_ROLES.join(", "));
      process.exit(1);
    }

    console.log(`🔧 Setting role "${role}" for user ${uid}...`);

    await admin.auth().setCustomUserClaims(uid, { role });

    console.log(`✅ Successfully assigned role "${role}" to user ${uid}`);
    console.log("⚠️ Make sure the user refreshes their ID token.");

    process.exit(0);
  } catch (error) {
    console.error("🔥 Error setting custom claims:", error);
    process.exit(1);
  }
}

run();