import { useState, useEffect } from "react";
import { db } from "../../../database-components/firebaseConfig";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  onSnapshot,
  orderBy
} from "firebase/firestore";

export default function useDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 ADMIN: Setting up real-time listener for pending drafts");
    
    const q = query(
      collection(db, "clientPayrollDrafts"),
      where("status", "==", "pending_approval"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const draftsData = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          // Convert Firestore timestamps
          createdAt: d.data().createdAt?.toDate?.() || null,
          updatedAt: d.data().updatedAt?.toDate?.() || null
        }));
        
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