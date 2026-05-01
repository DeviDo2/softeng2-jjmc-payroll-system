// useAuthRole.js

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../database-components/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../database-components/firebaseConfig";
import { roleConfig } from "./roleConfig";

export default function useAuthRole() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Grab user doc from Firestore
        const userRef = doc(db, "users", authUser.uid);
        const userSnap = await getDoc(userRef);

        let extractedRole = "client-staff"; // fallback default

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (typeof data.role === "string") {
            extractedRole = data.role.toLowerCase();
          }
        }

        setUser({
          uid: authUser.uid,
          email: authUser.email,
          ...userSnap.data(),
        });

        setRole(extractedRole);
      } catch (err) {
        console.error("Error loading Firestore user role:", err);

        // At least return something predictable
        setUser({
          uid: authUser.uid,
          email: authUser.email,
        });

        setRole("client-staff");
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    loading,
    user,
    role,
    roleConfig,
  };
}