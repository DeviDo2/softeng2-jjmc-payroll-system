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
    console.log("📋 useInquiryData messages effect:", { activeInquiry: activeInquiry?.id, role, userId: user?.uid });
    
    if (!activeInquiry || !user || !role) {
      console.log("❌ Missing data for messages fetch");
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      `inquiries/${activeInquiry.id}/messages`
    );

    // 🌟 CLIENT-STAFF: Use two listeners with proper merging
    if (role === "client-staff") {
      let ownMsgs = [];
      let approvedMsgs = [];

      // Listener 1: Client's own messages
      const unsubUserMsgs = onSnapshot(
        query(messagesRef, where("createdBy", "==", user.uid), orderBy("createdAt", "asc")),
        (snap) => {
          ownMsgs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          console.log("👤 Own messages updated:", ownMsgs.length, ownMsgs);
          // Merge both sets
          const merged = [...approvedMsgs, ...ownMsgs]
            .filter((msg, idx, arr) => arr.findIndex(m => m.id === msg.id) === idx) // dedupe by id
            .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
          console.log("✅ Merged after own msgs:", merged.length, merged);
          setMessages(merged);
        }
      );

      // Listener 2: Approved answers (all approved answers from bookkeeper/admin)
      const unsubApproved = onSnapshot(
        query(
          messagesRef,
          where("messageType", "==", "answer"),
          where("approved", "==", true),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          approvedMsgs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          console.log("🟢 Approved messages updated:", approvedMsgs.length, approvedMsgs);
          // Merge both sets
          const merged = [...approvedMsgs, ...ownMsgs]
            .filter((msg, idx, arr) => arr.findIndex(m => m.id === msg.id) === idx) // dedupe by id
            .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
          console.log("✅ Merged after approved msgs:", merged.length, merged);
          setMessages(merged);
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
