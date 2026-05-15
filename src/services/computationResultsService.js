import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../database-components/firebaseConfig";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const compact = (values) => values.filter((value) => normalize(value));

const getTimestampMs = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  return new Date(value).getTime() || 0;
};

const sameAny = (leftValues, rightValues) => {
  const rightSet = new Set(compact(rightValues).map(normalize));
  return compact(leftValues).some((value) => rightSet.has(normalize(value)));
};

export const getUserFullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

export const computationMatchesUser = (computation, user) => {
  if (!computation || !user?.uid) return false;

  if (
    sameAny(
      [
        computation.clientId,
        computation.userId,
        computation.clientStaffId,
        computation.clientUserId,
        computation.employeeUserId,
        computation.employeeId,
      ],
      [user.uid]
    )
  ) {
    return true;
  }

  if (
    sameAny(
      [computation.taxId, computation.taxIdNumber, computation.tin],
      [user.taxId, user.taxIdNumber, user.tin]
    )
  ) {
    return true;
  }

  if (sameAny([computation.employeeCode], [user.employeeCode])) {
    return true;
  }

  if (sameAny([computation.email, computation.employeeEmail], [user.email])) {
    return true;
  }

  const computationCompany = normalize(
    computation.company || computation.clientName || computation.clientCompany
  );
  const userCompany = normalize(user.company || user.clientName || user.clientCompany);
  const sameCompany = computationCompany && userCompany && computationCompany === userCompany;

  return sameCompany && normalize(computation.name) === normalize(getUserFullName(user));
};

export const sortComputationsNewestFirst = (computations) =>
  [...computations].sort(
    (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
  );

export const getComputationResultsForUser = async (user) => {
  if (!user?.uid) return [];

  const resultsRef = collection(db, "computationResults");
  const candidatesById = new Map();
  const querySpecs = [
    ["clientId", user.uid],
    ["userId", user.uid],
    ["clientStaffId", user.uid],
    ["employeeUserId", user.uid],
    ["employeeId", user.uid],
    ["taxId", user.taxId || user.taxIdNumber],
    ["taxIdNumber", user.taxIdNumber || user.taxId],
    ["employeeCode", user.employeeCode],
    ["email", user.email],
    ["employeeEmail", user.email],
    ["clientName", user.company],
    ["company", user.company],
  ];

  for (const [field, value] of querySpecs) {
    if (!normalize(value)) continue;

    try {
      const snapshot = await getDocs(query(resultsRef, where(field, "==", value)));
      snapshot.docs.forEach((docSnap) => {
        candidatesById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
    } catch (error) {
      console.warn(`Could not query computationResults by ${field}:`, error);
    }
  }

  return sortComputationsNewestFirst(
    [...candidatesById.values()].filter((computation) =>
      computationMatchesUser(computation, user)
    )
  );
};
