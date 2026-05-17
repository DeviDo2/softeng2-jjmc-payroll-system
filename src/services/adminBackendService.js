import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  auth,
  db,
  firebaseConfig,
  functions,
} from "../database-components/firebaseConfig";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const VALID_ROLES = new Set(["admin", "bookkeeper", "client-staff"]);

const normalizeRole = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  return VALID_ROLES.has(normalized) ? normalized : "client-staff";
};

const waitForCurrentUser = () =>
  new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

const getCurrentAdminUser = async () => {
  const currentUser = await waitForCurrentUser();
  if (!currentUser) {
    throw new Error("Please log in before opening the admin dashboard.");
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const role = normalizeRole(userSnap.data()?.role);

  if (role !== "admin") {
    const error = new Error("Only admins can access this feature.");
    error.status = 403;
    throw error;
  }

  return currentUser;
};

const getIdToken = async () => {
  const currentUser = await getCurrentAdminUser();
  const token = await currentUser.getIdToken(true);

  if (!token || token.split(".").length !== 3) {
    throw new Error("The app could not create a valid Firebase login token. Please log out and log in again.");
  }

  return token;
};

const extractArray = (payload, keys) => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeUserRecord = (user) => ({
  ...user,
  role: normalizeRole(user.role),
});

const fetchCollectionForAdmin = async (collectionName, mapper = (item) => item) => {
  await getCurrentAdminUser();
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((item) => mapper({ id: item.id, ...item.data() }));
};

const fetchUsersFromFirestore = () =>
  fetchCollectionForAdmin("users", normalizeUserRecord);

const fetchBookkeepersFromFirestore = async () => {
  const users = await fetchUsersFromFirestore();
  return users.filter((user) => user.role === "bookkeeper");
};

const fetchClientsFromFirestore = () =>
  fetchCollectionForAdmin("clientCompanies");

const fetchInquiriesFromFirestore = () =>
  fetchCollectionForAdmin("inquiries");

const fetchDraftsFromFirestore = () =>
  fetchCollectionForAdmin("clientPayrollDrafts");

const fetchTutorialsFromFirestore = () =>
  fetchCollectionForAdmin("tutorialVideos");

export const adminBackendRequest = async (path, options = {}) => {
  const token = await getIdToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    const error = new Error(
      `Could not reach the admin backend at ${API_BASE_URL}. Start the backend server or deploy Firebase Functions.`
    );
    error.cause = networkError;
    throw error;
  }

  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const message =
      payload.message ||
      payload.error ||
      `Backend request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
};

const requestArray = async (path, keys, fallback) => {
  try {
    const payload = await adminBackendRequest(path);
    return extractArray(payload, keys).map((item) =>
      path.startsWith("/users") ? normalizeUserRecord(item) : item
    );
  } catch (backendError) {
    if (!fallback) throw backendError;
    return fallback();
  }
};

const safeRequest = async (path, keys, label, fallback) => {
  try {
    return {
      data: await requestArray(path, keys, fallback),
      error: null,
    };
  } catch (error) {
    error.section = label;
    return { data: [], error };
  }
};

export const fetchAdminDashboardSnapshot = async () => {
  const [users, clients] = await Promise.all([
    safeRequest("/users", ["users"], "users", fetchUsersFromFirestore),
    safeRequest("/clients", ["clients", "clientCompanies", "companies"], "clients", fetchClientsFromFirestore),
  ]);

  return {
    users: users.data,
    clients: clients.data,
    errors: [users, clients]
      .map((result) => result.error)
      .filter(Boolean),
  };
};

export const fetchAdminBackendSnapshot = async () => {
  const [users, clients, inquiries, drafts, tutorials] = await Promise.all([
    safeRequest("/users", ["users"], "users", fetchUsersFromFirestore),
    safeRequest("/clients", ["clients", "clientCompanies", "companies"], "clients", fetchClientsFromFirestore),
    safeRequest("/inquiries", ["inquiries"], "inquiries", fetchInquiriesFromFirestore),
    safeRequest("/payroll/drafts", ["drafts", "payrollDrafts"], "payroll drafts", fetchDraftsFromFirestore),
    safeRequest("/tutorials", ["tutorials", "videos"], "tutorials", fetchTutorialsFromFirestore),
  ]);

  return {
    users: users.data,
    clients: clients.data,
    inquiries: inquiries.data,
    drafts: drafts.data,
    tutorials: tutorials.data,
    errors: [users, clients, inquiries, drafts, tutorials]
      .map((result) => result.error)
      .filter(Boolean),
  };
};

export const fetchUsers = () =>
  requestArray("/users", ["users"], fetchUsersFromFirestore);

export const fetchBookkeepers = () =>
  requestArray("/users/bookkeepers", ["bookkeepers", "users"], fetchBookkeepersFromFirestore);

const createBookkeeperWithSecondaryAuth = async (bookkeeper) => {
  await getCurrentAdminUser();

  const email = bookkeeper.email?.trim();
  const password = bookkeeper.password || "";
  const firstName = bookkeeper.firstName?.trim();
  const lastName = bookkeeper.lastName?.trim();

  if (!email || !password || !firstName || !lastName) {
    throw new Error("Email, password, first name, and last name are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const secondaryApp = initializeApp(
    firebaseConfig,
    `bookkeeper-create-${Date.now()}-${Math.random()}`
  );
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );
    createdUser = credential.user;

    await updateProfile(createdUser, {
      displayName: `${firstName} ${lastName}`.trim(),
    });

    await setDoc(
      doc(db, "users", createdUser.uid),
      {
        email,
        role: "bookkeeper",
        accountType: "bookkeeper",
        createdBy: auth.currentUser?.uid || null,
        firstName,
        lastName,
        phoneNumber: bookkeeper.phoneNumber || "",
        department: bookkeeper.department || "Accounting",
        position: bookkeeper.position || "Bookkeeper",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      uid: createdUser.uid,
      message: "Bookkeeper account created.",
    };
  } catch (error) {
    if (createdUser) {
      await deleteUser(createdUser).catch(() => {});
    }
    throw error;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
};

export const createBookkeeperViaBackend = async (bookkeeper) => {
  await getCurrentAdminUser();
  let callableError = null;

  try {
    const createBookkeeperAccount = httpsCallable(functions, "createBookkeeperAccount");
    const result = await createBookkeeperAccount(bookkeeper);
    return result.data;
  } catch (error) {
    callableError = error;
  }

  try {
    return await adminBackendRequest("/users/bookkeepers", {
      method: "POST",
      body: JSON.stringify(bookkeeper),
    });
  } catch (backendError) {
    try {
      return await createBookkeeperWithSecondaryAuth(bookkeeper);
    } catch (clientError) {
      const message =
        clientError.message ||
        backendError.message ||
        callableError?.message ||
        "Unable to create bookkeeper account.";
      const error = new Error(message);
      error.cause = { callableError, backendError, clientError };
      throw error;
    }
  }
};
