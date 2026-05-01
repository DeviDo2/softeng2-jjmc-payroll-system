import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "USER_UID_HERE"; // replace with real user ID
const role = "clientStaff"; // or bookkeeper, admin, etc.

async function setCustomClaim() {
  await admin.auth().setCustomUserClaims(uid, { role });
  const user = await admin.auth().getUser(uid);
  console.log(`✅ Custom claim set for ${uid}:`, user.customClaims);
}

setCustomClaim().catch(console.error);
