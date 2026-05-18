import { useState, useEffect } from "react";
import { db } from "../../../database-components/firebaseConfig";
import { 
  collection, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  writeBatch,
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
const getTime = (value) => {
  const dateValue = toDate(value);
  return dateValue ? new Date(dateValue).getTime() || 0 : 0;
};

export default function useDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputesLoading, setDisputesLoading] = useState(true);

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

  useEffect(() => {
    console.log("🔄 ADMIN: Setting up real-time listener for computation disputes");

    const unsubscribe = onSnapshot(
      collection(db, "computationDisputes"),
      (snapshot) => {
        const disputesData = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              createdAt: toDate(data.createdAt),
              updatedAt: toDate(data.updatedAt),
              acceptedAt: toDate(data.acceptedAt),
              rejectedAt: toDate(data.rejectedAt),
              resolvedAt: toDate(data.resolvedAt),
            };
          })
          .sort((left, right) => getTime(right.updatedAt || right.createdAt) - getTime(left.updatedAt || left.createdAt));

        setDisputes(disputesData);
        setDisputesLoading(false);
      },
      (error) => {
        console.error("❌ ADMIN: Error listening to disputes:", error);
        setDisputesLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const approveDraft = async (draft, adminData) => {
    console.log("👑 ADMIN: Approving draft", draft?.id);
    
    try {
      const draftRef = doc(db, "clientPayrollDrafts", draft.id);
      
      await updateDoc(draftRef, { 
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: adminData?.name || "Admin",
        approvedById: adminData?.uid || "admin",
        lastUpdated: serverTimestamp()
      });

      if (Array.isArray(draft.disputeIds) && draft.disputeIds.length > 0) {
        const batch = writeBatch(db);
        draft.disputeIds.forEach((disputeId) => {
          batch.update(doc(db, "computationDisputes", disputeId), {
            status: "resolved",
            approvedAt: serverTimestamp(),
            resolvedAt: serverTimestamp(),
            approvedDraftId: draft.id,
            resolvedDraftId: draft.id,
            approvedBy: adminData?.name || "Admin",
            reviewedBy: adminData?.name || "Admin",
            reviewedById: adminData?.uid || "admin",
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      
      console.log("✅ ADMIN: Draft approved successfully!");
      return { success: true };
      
    } catch (error) {
      console.error("❌ ADMIN: Approval failed:", error);
      throw error;
    }
  };

  const reviseDraft = async (draft, notes, adminData) => {
    console.log("👑 ADMIN: Requesting revision for", draft?.id);
    
    try {
      const draftRef = doc(db, "clientPayrollDrafts", draft.id);
      const isDisputedDraft = Array.isArray(draft.disputeIds) && draft.disputeIds.length > 0;
      const nextStatus = isDisputedDraft ? "disputed" : "needs_revision";
      
      await updateDoc(draftRef, { 
        status: nextStatus,
        revisionNotes: notes || "Please revise",
        revisedAt: serverTimestamp(),
        revisedBy: adminData?.name || "Admin",
        lastUpdated: serverTimestamp()
      });

      if (isDisputedDraft) {
        const batch = writeBatch(db);
        draft.disputeIds.forEach((disputeId) => {
          batch.update(doc(db, "computationDisputes", disputeId), {
            status: "disputed",
            adminDecisionReason: notes || "Please revise",
            disputedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      
      console.log("✅ ADMIN: Revision requested!");
      return { success: true };
      
    } catch (error) {
      console.error("❌ ADMIN: Revision request failed:", error);
      throw error;
    }
  };

  const acceptDispute = async (dispute, reason, adminData) => {
    const disputeRef = doc(db, "computationDisputes", dispute.id);

    await updateDoc(disputeRef, {
      status: "accepted",
      adminDecisionReason: reason || "Dispute accepted",
      acceptedAt: serverTimestamp(),
      reviewedBy: adminData?.name || "Admin",
      reviewedById: adminData?.uid || "admin",
      updatedAt: serverTimestamp(),
    });

    const linkedDraftId = dispute.sourceDraftId || dispute.latestDraftId;

    if (linkedDraftId) {
      await updateDoc(doc(db, "clientPayrollDrafts", linkedDraftId), {
        status: "disputed",
        disputeId: dispute.id,
        disputeReason: reason || "Dispute accepted",
        revisionNotes: reason || "Dispute accepted",
        disputedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const rejectDispute = async (dispute, reason, adminData) => {
    await updateDoc(doc(db, "computationDisputes", dispute.id), {
      status: "rejected",
      adminDecisionReason: reason || "Dispute rejected",
      rejectedAt: serverTimestamp(),
      reviewedBy: adminData?.name || "Admin",
      reviewedById: adminData?.uid || "admin",
      updatedAt: serverTimestamp(),
    });
  };

  return {
    drafts,
    disputes,
    loading,
    disputesLoading,
    approveDraft,
    reviseDraft,
    acceptDispute,
    rejectDispute,
  };
}
