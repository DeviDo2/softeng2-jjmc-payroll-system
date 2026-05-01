import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../../database-components/firebaseConfig";

export function useInquiryData(role, activeInquiry) {
  const [inquiries, setInquiries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);

  // ======================================================
  // AUTH LISTENER
  // ======================================================
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  // ======================================================
  // FETCH INQUIRIES
  // ======================================================
  useEffect(() => {
    if (!user || !role) return;

    const inquiriesRef = collection(db, "inquiries");
    let q;

    // CLIENT-STAFF → only their own inquiries
    if (role === "client-staff") {
      q = query(
        inquiriesRef,
        where("createdBy", "==", user.uid),
        orderBy("lastUpdated", "desc")
      );
    }

    // ADMIN + BOOKKEEPER → all inquiries
    else if (role === "admin" || role === "bookkeeper") {
      q = query(inquiriesRef, orderBy("lastUpdated", "desc"));
    } else {
      return;
    }

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const all = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Enrich author names
        const enriched = await Promise.all(
          all.map(async (inq) => {
            let { authorFirstName, authorLastName, createdBy } = inq;

            if ((!authorFirstName || !authorLastName) && createdBy) {
              try {
                const uSnap = await getDoc(doc(db, "users", createdBy));
                if (uSnap.exists()) {
                  const u = uSnap.data();
                  authorFirstName = u.firstName || "Unknown";
                  authorLastName = u.lastName || "";
                }
              } catch (e) {
                console.error("Error fetching user profile:", e);
              }
            }

            return { ...inq, authorFirstName, authorLastName };
          })
        );

        setInquiries(enriched);
      },
      (err) => console.error("Inquiry listener error:", err)
    );

    return () => unsub();
  }, [role, user]);

  // ======================================================
  // FETCH MESSAGES FOR ACTIVE INQUIRY
  // ======================================================
  useEffect(() => {
    if (!activeInquiry || !user || !role) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      `inquiries/${activeInquiry.id}/messages`
    );

    let q;

    // 🌟 CLIENT-STAFF SAFE QUERY 🌟
    // Only fetch:
    //   - their own messages
    //   - approved answers
    if (role === "client-staff") {
      q = query(
        messagesRef,
        where("visibleToClient", "==", user.uid) // (not used)
      );
    }

    // ❗ CORRECT SOLUTION:
    // Firestore does NOT allow OR queries, so we must use two listeners
    // and merge the results client-side.

    if (role === "client-staff") {
      const unsubUserMsgs = onSnapshot(
        query(messagesRef, where("createdBy", "==", user.uid), orderBy("createdAt", "asc")),
        (snap) => {
          const ownMsgs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          setMessages((prev) => {
            const approvedMsgs = prev.filter((m) => m.approved === true);
            return [...approvedMsgs, ...ownMsgs].sort(
              (a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()
            );
          });
        }
      );

      const unsubApproved = onSnapshot(
        query(
          messagesRef,
          where("messageType", "==", "answer"),
          where("approved", "==", true),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          const approved = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          setMessages((prev) => {
            const ownMsgs = prev.filter((m) => m.createdBy === user.uid);
            return [...ownMsgs, ...approved].sort(
              (a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()
            );
          });
        }
      );

      return () => {
        unsubUserMsgs();
        unsubApproved();
      };
    }

    // Admin + Bookkeeper see everything
    if (role === "admin" || role === "bookkeeper") {
      const allQuery = query(messagesRef, orderBy("createdAt", "asc"));

      const unsub = onSnapshot(
        allQuery,
        (snap) => {
          const all = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setMessages(all);
        },
        (err) => console.error("Message listener error:", err)
      );

      return () => unsub();
    }

  }, [activeInquiry, role, user]);

  // ======================================================
  // UTIL
  // ======================================================
  const formatTS = (ts) => {
    if (!ts) return "";
    try {
      return (ts.toDate ? ts.toDate() : new Date(ts)).toLocaleString();
    } catch {
      return "";
    }
  };

  return { inquiries, messages, formatTS };
}
