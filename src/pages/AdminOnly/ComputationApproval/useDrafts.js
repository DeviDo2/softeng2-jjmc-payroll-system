import { useState, useEffect } from "react";
import { db } from "../../../database-components/firebaseConfig";
import { 
  collection, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

const isPendingDraft = (draft) => {
  const status = draft.status?.toLowerCase();
  return (
    status === "pending_approval" ||
    status === "pending approval" ||
    status === "submitted_to_admin" ||
    (!status && draft.submittedToAdmin === true)
  );
};

const toDate = (value) => value?.toDate?.() || value || null;

export default function useDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 ADMIN: Setting up real-time listener for pending drafts");

    const unsubscribe = onSnapshot(collection(db, "clientPayrollDrafts"),
      (snapshot) => {
        const draftsData = snapshot.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt: toDate(data.createdAt),
              updatedAt: toDate(data.updatedAt || data.lastUpdated),
              submittedAt: toDate(data.submittedAt),
            };
          })
          .filter(isPendingDraft)
          .sort((a, b) => {
            const aDate = a.submittedAt || a.createdAt || a.updatedAt || 0;
            const bDate = b.submittedAt || b.createdAt || b.updatedAt || 0;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
        
        console.log("✅ ADMIN: Got", draftsData.length, "drafts pending approval");
        console.log("📋 Draft statuses:", draftsData.map(d => ({ 
          id: d.id.slice(0, 8), 
          client: d.clientName, 
          status: d.status 
        })));
        
        setDrafts(draftsData);
        setLoading(false);
      },
      (error) => {
        console.error("❌ ADMIN: Error listening to drafts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const approveDraft = async (draftId, adminData) => {
    console.log("👑 ADMIN: Approving draft", draftId);
    
    try {
      const draftRef = doc(db, "clientPayrollDrafts", draftId);
      
      // SIMPLE UPDATE - Just change status to "approved"
      await updateDoc(draftRef, { 
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: adminData?.name || "Admin",
        approvedById: adminData?.uid || "admin",
        lastUpdated: serverTimestamp()
      });
      
      console.log("✅ ADMIN: Draft approved successfully!");
      return { success: true };
      
    } catch (error) {
      console.error("❌ ADMIN: Approval failed:", error);
      throw error;
    }
  };

  const reviseDraft = async (draftId, notes, adminData) => {
    console.log("👑 ADMIN: Requesting revision for", draftId);
    
    try {
      const draftRef = doc(db, "clientPayrollDrafts", draftId);
      
      await updateDoc(draftRef, { 
        status: "needs_revision",
        revisionNotes: notes || "Please revise",
        revisedAt: serverTimestamp(),
        revisedBy: adminData?.name || "Admin",
        lastUpdated: serverTimestamp()
      });
      
      console.log("✅ ADMIN: Revision requested!");
      return { success: true };
      
    } catch (error) {
      console.error("❌ ADMIN: Revision request failed:", error);
      throw error;
    }
  };

  return { drafts, loading, approveDraft, reviseDraft };
}
