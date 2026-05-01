// admin-tools/makeAdmin.js
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function makeAdmin(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ User ${uid} is now an admin!`);
  } catch (error) {
    console.error("❌ Error setting admin claim:", error);
  }
}

// Replace this with the UID of the user you want to make admin
makeAdmin("PUT_USER_UID_HERE");
