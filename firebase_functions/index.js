// firebase_functions/index.js
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const VALID_ROLES = ["admin", "bookkeeper", "client-staff"];
const db = admin.firestore();

async function getUserRole(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data().role?.toLowerCase() : null;
}

async function assertAdmin(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action."
    );
  }

  const role = await getUserRole(context.auth.uid);
  if (role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can perform this action."
    );
  }
}

exports.createUserDoc = functions.auth.user().onCreate(async (user) => {
  const userDoc = {
    role: "client-staff",
    email: user.email || null,
    name: user.displayName || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(user.uid).set(userDoc, { merge: true });
  console.log("Created user doc:", user.uid);
});

exports.updateUserTimestamp = functions.firestore
  .document("users/{uid}")
  .onUpdate((change) => {
    return change.after.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

exports.setUserRole = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header." });
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerRole = await getUserRole(decoded.uid);

    if (callerRole !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Only admins can assign roles.",
      });
    }

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

    await db.collection("users").doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: `Role "${role}" assigned to user ${uid} successfully.`,
    });
  } catch (err) {
    console.error("Error in setUserRole:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

exports.assignBookkeeperToClient = functions.https.onCall(async (data, context) => {
  try {
    await assertAdmin(context);

    const { clientId, bookkeeperId, bookkeeperName } = data || {};
    if (!clientId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required field: clientId."
      );
    }

    const isUnassigning = !bookkeeperId || bookkeeperId === "NONE";
    const clientRef = db.collection("clientCompanies").doc(clientId);
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Client company was not found."
      );
    }

    let resolvedBookkeeperName = null;
    if (!isUnassigning) {
      const bookkeeperSnap = await db.collection("users").doc(bookkeeperId).get();
      const bookkeeper = bookkeeperSnap.data();

      if (!bookkeeperSnap.exists || bookkeeper?.role?.toLowerCase() !== "bookkeeper") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Selected user is not a bookkeeper."
        );
      }

      resolvedBookkeeperName =
        bookkeeperName ||
        [bookkeeper.firstName, bookkeeper.lastName].filter(Boolean).join(" ") ||
        bookkeeper.email ||
        "Bookkeeper";
    }

    await clientRef.update({
      bookkeeperId: isUnassigning ? null : bookkeeperId,
      bookkeeperName: isUnassigning ? null : resolvedBookkeeperName,
      status: isUnassigning ? "Awaiting Assignment" : "Assigned",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedAt: isUnassigning ? null : admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!isUnassigning) {
      try {
        await db.collection("notifications").add({
          userId: bookkeeperId,
          message: `You have been assigned: ${clientSnap.data().name || "Client company"}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      } catch (error) {
        console.warn("Bookkeeper assigned, but notification was not created:", error);
      }
    }

    return {
      success: true,
      message: isUnassigning
        ? "Bookkeeper removed from client."
        : `${resolvedBookkeeperName} assigned to ${clientSnap.data().name || "client"}.`,
    };
  } catch (error) {
    console.error("assignBookkeeperToClient failed:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Assignment backend failed."
    );
  }
});

exports.ping = functions.https.onRequest((req, res) => {
  res.status(200).json({ message: "API alive." });
});

exports.deleteCloudinaryMedia = functions.https.onCall(async (data) => {
  const { publicId, resourceType } = data;

  try {
    const cloudinary = require("cloudinary").v2;
    const cloudinaryRes = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return { success: true, cloudinaryRes };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
