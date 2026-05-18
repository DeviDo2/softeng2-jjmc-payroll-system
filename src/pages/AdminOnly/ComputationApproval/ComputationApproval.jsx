import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  IonButton,
  IonSpinner,
  IonAlert,
  IonBadge,
  IonCard,
  IonCardContent,
  IonTextarea,
} from "@ionic/react";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import DraftTable from "./DraftTable";
import DraftModal from "./DraftModal";
import useDrafts from "./useDrafts";
import useAuthRole from "../../../hooks/useAuthRole";

import "./ComputationApproval.css";

export default function ComputationApproval() {
  const {
    drafts,
    disputes,
    loading,
    disputesLoading,
    approveDraft,
    reviseDraft,
    acceptDispute,
    rejectDispute,
  } = useDrafts();
  const { user } = useAuthRole();
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const [processing, setProcessing] = useState(false);

  // Open modal to view draft
  const openModal = (draft) => {
    console.log("📄 Opening draft:", draft.id, "for client:", draft.clientName);
    setSelectedDraft(draft);
  };

  const closeModal = () => setSelectedDraft(null);
  const closeDisputeModal = () => {
    setSelectedDispute(null);
    setDecisionReason("");
  };

  // Handle approve button
  const handleApprove = async () => {
    if (!selectedDraft) return;
    
    setProcessing(true);
    try {
      console.log("🔄 Attempting to approve draft:", selectedDraft.id);
      
      await approveDraft(selectedDraft, {
        uid: user?.uid,
        name: user?.firstName || user?.email,
        role: user?.role
      });
      
      // Show success
      setAlert({
        show: true,
        message: `✅ Approved draft for ${selectedDraft.clientName}!`,
        type: "success"
      });
      
      // Close modal
      closeModal();
      
    } catch (error) {
      console.error("❌ Approval failed:", error);
      setAlert({
        show: true,
        message: `❌ Failed: ${error.message}`,
        type: "error"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle revise button
  const handleRevise = async () => {
    if (!selectedDraft) return;
    
    const notes = prompt("Why does this draft need revision?", "Please check the calculations");
    if (!notes) return; // User cancelled
    
    setProcessing(true);
    try {
      console.log("🔄 Requesting revision for draft:", selectedDraft.id);
      
      await reviseDraft(selectedDraft, notes, {
        uid: user?.uid,
        name: user?.firstName || user?.email,
        role: user?.role
      });
      
      setAlert({
        show: true,
        message: `📝 Revision requested for ${selectedDraft.clientName}!`,
        type: "success"
      });
      
      closeModal();
      
    } catch (error) {
      console.error("❌ Revision request failed:", error);
      setAlert({
        show: true,
        message: `❌ Failed: ${error.message}`,
        type: "error"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptDispute = async () => {
    if (!selectedDispute || !decisionReason.trim()) return;

    setProcessing(true);
    try {
      await acceptDispute(selectedDispute, decisionReason.trim(), {
        uid: user?.uid,
        name: user?.firstName || user?.email,
        role: user?.role,
      });

      setAlert({
        show: true,
        message: `✅ Dispute accepted for ${selectedDispute.clientName}. The assigned bookkeeper can now recompute it.`,
        type: "success",
      });
      closeDisputeModal();
    } catch (error) {
      setAlert({
        show: true,
        message: `❌ Failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDispute = async () => {
    if (!selectedDispute || !decisionReason.trim()) return;

    setProcessing(true);
    try {
      await rejectDispute(selectedDispute, decisionReason.trim(), {
        uid: user?.uid,
        name: user?.firstName || user?.email,
        role: user?.role,
      });

      setAlert({
        show: true,
        message: `📝 Dispute rejected for ${selectedDispute.clientName}.`,
        type: "success",
      });
      closeDisputeModal();
    } catch (error) {
      setAlert({
        show: true,
        message: `❌ Failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const recentDisputes = disputes.slice(0, 10);

  // Check if user is admin
  if (user && user.role !== "admin" && user.role !== "supervisor") {
    return (
      <>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent className="ion-padding">
            <IonCard color="danger">
              <IonCardContent className="ion-text-center">
                <IonText>
                  <h2>🚫 Access Denied</h2>
                  <p>Only admins can access this page.</p>
                  <p>Your role: <strong>{user.role || "user"}</strong></p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonPage>
      </>
    );
  }

  return (
      <IonPage id="main-content">
        <IonContent className="computation-content">
          <IonImg
            src="../../Gradient-Ellipses.png"
            alt="Background"
            className="ellipse-bg"
          />

          <IonGrid className="ion-padding">
            {/* Header */}
            <IonRow>
              <IonCol>
                <IonText>
                  <h1 className="computation-main-title">Admin: Draft Approvals</h1>
                  <p className="computation-subheader">Review payroll computations from bookkeepers</p>
                </IonText>
                 </IonCol>
            </IonRow>
                
                {/* Stats */}
                <IonRow>
              <IonCol>
                  <div className="stats-row">
                    <div className="stats-badge">
                      📋 {drafts.length} Drafts Pending Approval
                    </div>
                    {!loading && drafts.length === 0 && (
                      <div className="empty-message">
                        ✅ All Done! No drafts pending approval.
                      </div>
                    )}
                    </div>
              </IonCol>
            </IonRow>
             
           
    
            {/* Loading */}
            {loading && (
              <IonRow>
                <IonCol className="ion-text-center">
                  <IonSpinner name="crescent" />
                  <p>Loading drafts...</p>
                </IonCol>
              </IonRow>
            )}

            {/* Drafts Table */}
            {!loading && (
              <IonRow>
                <IonCol>
                  <DraftTable drafts={drafts} loading={loading} onSelect={openModal} />
                  
                  
                </IonCol>
              </IonRow>
            )}

            <IonRow className="ion-margin-top">
              <IonCol>
                <IonText>
                  <h2 className="computation-main-title">Recent Disputed Computations</h2>
                  <p className="computation-subheader">
                    Review client-staff disputes and decide whether the bookkeeper should recompute them.
                  </p>
                </IonText>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol>
                <div className="table-scroll-container">
                  <table className="results-data-table">
                    <thead>
                      <tr>
                        <th>Client Staff</th>
                        <th>Client</th>
                        <th>Payroll Period</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputesLoading ? (
                        <tr><td colSpan="6">Loading disputes...</td></tr>
                      ) : recentDisputes.length === 0 ? (
                        <tr><td colSpan="6">No disputed computations yet.</td></tr>
                      ) : recentDisputes.map((dispute) => (
                        <tr key={dispute.id}>
                          <td>{dispute.clientStaffName || dispute.employeeName || "Unknown"}</td>
                          <td>{dispute.clientName || "Unknown"}</td>
                          <td>{dispute.payrollPeriod || "Unknown"}</td>
                          <td>
                            <IonBadge color={
                              dispute.status === "submitted" ? "warning" :
                              dispute.status === "accepted" ? "tertiary" :
                              dispute.status === "pending" ? "primary" :
                              dispute.status === "approved" ? "success" :
                              dispute.status === "resolved" ? "success" :
                              "medium"
                            }>
                              {(dispute.status || "unknown").replace(/_/g, " ").toUpperCase()}
                            </IonBadge>
                          </td>
                          <td>{dispute.disputeReason || "No reason provided"}</td>
                          <td>
                            <IonButton size="small" onClick={() => setSelectedDispute(dispute)}>
                              Review
                            </IonButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </IonCol>
            </IonRow>
            
          </IonGrid>

          {/* Modal */}
          {selectedDraft && (
            <DraftModal
              draft={selectedDraft}
              onClose={closeModal}
              onApprove={handleApprove}
              onRevise={handleRevise}
              isProcessing={processing}
            />
          )}

          {selectedDispute && (
            <div className="modal-overlay">
              <div className="modal-card dispute-modal-card">
                <h2>Dispute Review</h2>
                <p><strong>Client staff:</strong> {selectedDispute.clientStaffName || selectedDispute.employeeName}</p>
                <p><strong>Client:</strong> {selectedDispute.clientName}</p>
                <p><strong>Status:</strong> {(selectedDispute.status || "unknown").replace(/_/g, " ")}</p>
                <p><strong>Reason:</strong> {selectedDispute.disputeReason}</p>
                {selectedDispute.disputeDetails && (
                  <p><strong>Details:</strong> {selectedDispute.disputeDetails}</p>
                )}

                {selectedDispute.computationSnapshot && (
                  <div className="table-scroll-container ion-margin-top">
                    <table className="results-data-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Code</th>
                          <th>Gross Pay</th>
                          <th>Net Pay</th>
                          <th>SSS</th>
                          <th>PHIC</th>
                          <th>HDMF</th>
                          <th>Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{selectedDispute.computationSnapshot.name || selectedDispute.employeeName || "N/A"}</td>
                          <td>{selectedDispute.computationSnapshot.employeeCode || "N/A"}</td>
                          <td>{selectedDispute.computationSnapshot.grossPay || 0}</td>
                          <td>{selectedDispute.computationSnapshot.netPay || 0}</td>
                          <td>{selectedDispute.computationSnapshot.sss || 0}</td>
                          <td>{selectedDispute.computationSnapshot.philHealth || 0}</td>
                          <td>{selectedDispute.computationSnapshot.pagIbig || 0}</td>
                          <td>{selectedDispute.computationSnapshot.tax || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <IonTextarea
                  className="ion-margin-top"
                  label="Admin Reason"
                  labelPlacement="stacked"
                  autoGrow
                  rows={4}
                  value={decisionReason}
                  placeholder="Explain your decision for this dispute."
                  onIonInput={(event) => setDecisionReason(event.detail.value || "")}
                />

                <div className="dispute-modal-actions">
                  <IonButton fill="outline" color="medium" onClick={closeDisputeModal}>
                    Close
                  </IonButton>
                  {selectedDispute.status === "submitted" && (
                    <>
                      <IonButton color="danger" onClick={handleRejectDispute} disabled={!decisionReason.trim() || processing}>
                        Reject
                      </IonButton>
                      <IonButton color="success" onClick={handleAcceptDispute} disabled={!decisionReason.trim() || processing}>
                        Accept
                      </IonButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alert */}
          <IonAlert
            isOpen={alert.show}
            onDidDismiss={() => setAlert({ ...alert, show: false })}
            header={alert.type === "success" ? "Success" : "Error"}
            message={alert.message}
            buttons={["OK"]}
          />
        </IonContent>
        <FooterNav />
      </IonPage>
  );
}
