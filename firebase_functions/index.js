// firebase_functions/index.js
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
functions.setGlobalOptions({ maxInstances: 10 });

// ================================
//   VALID ROLES
// ================================
const VALID_ROLES = ["admin", "bookkeeper", "client-staff"];

// ================================
//   HELPER: Get user role from Firestore
// ================================
async function getUserRole(uid) {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  return snap.exists ? snap.data().role : null;
}

// ========================================================================
//  AUTO-CREATE USER DOCUMENT ON SIGNUP
// ========================================================================
export const createUserDoc = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  const userDoc = {
    role: "client-staff",   // default role for new signups
    email: user.email || null,
    name: user.displayName || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection("users").doc(uid).set(userDoc);
  console.log("Created user doc:", uid);
});

// ========================================================================
//  UPDATE updatedAt on user profile edits
// ========================================================================
export const updateUserTimestamp = functions.firestore
  .document("users/{uid}")
  .onUpdate((change) => {
    return change.after.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// ========================================================================
//  SECURE INTERNAL ENDPOINT → Assign Firestore roles
//  Only ADMIN users (per Firestore role) can call this.
// ========================================================================
export const setUserRole = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    // --- Authenticate caller ---
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header." });
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded.uid;

    const callerRole = await getUserRole(callerUid);

    if (callerRole !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Only admins can assign roles.",
      });
    }

    // --- Extract target info ---
    const { uid, role } = req.body;

    if (!uid || !role) {
      return res.status(400).json({
        error: "Missing required fields: uid, role",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role "${role}". Valid roles: ${VALID_ROLES.join(", ")}`,
      });
    }

    // --- Update Firestore ---
    await admin.firestore().collection("users").doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: `Role "${role}" assigned to user ${uid} successfully (Firestore-based).`,
    });

  } catch (err) {
    console.error("🔥 Error in setUserRole:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ========================================================================
//  Optional "alive check"
// ========================================================================
export const ping = functions.https.onRequest((req, res) => {
  res.status(200).json({ message: "API alive and vibing." });
});

// ==== CLOUDINARY DELETE =======
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.deleteCloudinaryMedia = functions.https.onCall(async (data, context) => {
  const { publicId, resourceType } = data;

  try {
    // Your Cloudinary delete logic
    const cloudinary = require("cloudinary").v2;

    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return { success: true, cloudinaryRes: res };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
