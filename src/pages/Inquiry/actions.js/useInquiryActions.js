// useInquiryActions.js
import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, auth } from "../../../database-components/firebaseConfig"; // adapt path as needed

export function useInquiryActions() {
  const [loading, setLoading] = useState(false);

  // Submit a new inquiry (client-staff)
  const handleSubmitInquiry = async (title, body) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !title?.trim() || !body?.trim()) throw new Error("Missing data");

      const userSnap = {
        displayName: user.displayName || "Client",
        photoURL: user.photoURL || "",
        role: "client-staff",
      };

      const [firstName = "Client", lastName = ""] = (user.displayName || "Client").split(" ");

      const ref = await addDoc(collection(db, "inquiries"), {
        title: title.trim(),
        body: body.trim(),
        createdBy: user.uid,
        createdBySnapshot: userSnap,
        authorFirstName: firstName,
        authorLastName: lastName,
        askedTo: "bookkeeper",
        status: "open",
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      // initial message thread
      await addDoc(collection(db, `inquiries/${ref.id}/messages`), {
        body: body.trim(),
        createdBy: user.uid,
        authorSnapshot: userSnap,
        messageType: "question",
        isAnswer: false,
        approved: true,
        createdAt: serverTimestamp(),
      });

      return ref.id;
    } catch (err) {
      console.error("submitInquiry error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send reply — payload: { reply, activeInquiry, role }
  const sendReplyToFirebase = async (payload = {}) => {
    setLoading(true);
    try {
      const { reply, activeInquiry, role } = payload;
      const user = auth.currentUser;
      if (!user || !reply?.trim() || !activeInquiry) throw new Error("Missing reply data");

      const isBookkeeper = role === "bookkeeper";
      const authorName = user.displayName || (isBookkeeper ? "Bookkeeper" : "Admin");

      const replyData = {
        body: reply.trim(),
        createdBy: user.uid,
        authorSnapshot: {
          displayName: authorName,
          photoURL: user.photoURL || "",
          role,
        },
        messageType: "answer",
        isAnswer: true,
        needsAdminApproval: isBookkeeper,
        approved: !isBookkeeper,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, `inquiries/${activeInquiry.id}/messages`), replyData);
      await updateDoc(doc(db, "inquiries", activeInquiry.id), {
        status: isBookkeeper ? "pending-admin" : "answered",
        lastUpdated: serverTimestamp(),
      });

      // optional: notify user doc (best-effort)
      try {
        await updateDoc(doc(db, "users", activeInquiry.createdBy), {
          newNotification: `${activeInquiry.title} has been answered.`,
        });
      } catch (e) {
        // ignore notification errors
        console.warn("Couldn't set user notification:", e);
      }

      return true;
    } catch (err) {
      console.error("sendReplyToFirebase error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Admin approve — flips needsAdminApproval -> false and marks approved
  const handleApprove = async (activeInquiry, msgId) => {
    setLoading(true);
    try {
      if (!activeInquiry || !msgId) throw new Error("Missing identifiers");

      const msgRef = doc(db, `inquiries/${activeInquiry.id}/messages/${msgId}`);
      await updateDoc(msgRef, { needsAdminApproval: false, needsAdminApproval: true });

      // set inquiry status to answered
      await updateDoc(doc(db, "inquiries", activeInquiry.id), {
        status: "answered",
        lastUpdated: serverTimestamp(),
      });

      // optionally notify client
      try {
        await updateDoc(doc(db, "users", activeInquiry.createdBy), {
          newNotification: `${activeInquiry.title} has been answered.`,
        });
      } catch (e) {
        console.warn("notify user failed", e);
      }

      return true;
    } catch (err) {
      console.error("handleApprove error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Admin reject — mark msg rejected, set rejectionReason, set inquiry status
  const handleReject = async (activeInquiry, msgId, reason = "") => {
    setLoading(true);
    try {
      if (!activeInquiry || !msgId) throw new Error("Missing identifiers");

      const msgRef = doc(db, `inquiries/${activeInquiry.id}/messages/${msgId}`);
      await updateDoc(msgRef, {
        approved: false,
        rejected: true,
        needsAdminApproval: false,
        rejectionReason: reason || "Rejected by admin",
      });

      await updateDoc(doc(db, "inquiries", activeInquiry.id), {
        status: "rejected",
        lastUpdated: serverTimestamp(),
      });

      // optionally notify client
      try {
        await updateDoc(doc(db, "users", activeInquiry.createdBy), {
          newNotification: `${activeInquiry.title} was rejected. ${reason ? "Reason: " + reason : ""}`,
        });
      } catch (e) {
        console.warn("notify user failed", e);
      }

      return true;
    } catch (err) {
      console.error("handleReject error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmitInquiry,
    sendReplyToFirebase,
    handleApprove,
    handleReject,
  };
}
