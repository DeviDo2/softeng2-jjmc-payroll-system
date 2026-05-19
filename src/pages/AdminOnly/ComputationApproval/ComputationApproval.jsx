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
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonIcon,
} from "@ionic/react";
import { checkmarkOutline, closeOutline } from "ionicons/icons";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import DraftTable from "./DraftTable";
import DraftModal from "./DraftModal";
import useDrafts from "./useDrafts";
import useAuthRole from "../../../hooks/useAuthRole";

import "./ComputationApproval.css";

const money = (value) => `₱${(Number(value) || 0).toFixed(2)}`;

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
                  <h1 className="computation-main-title">Computation Draft Approvals</h1>
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
                  <h2 className="computation-main-title">Disputed Computations</h2>
                  <p className="computation-subheader">
                    Review client-staff disputes (including recently resolved items) and decide whether the bookkeeper should recompute them.
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
                        <tr><td colSpan="6">No disputed or resolved computations yet.</td></tr>
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
            <IonModal
              className="draft-preview-modal dispute-preview-modal"
              isOpen={Boolean(selectedDispute)}
              onDidDismiss={closeDisputeModal}
            >
              <IonHeader className="draft-preview-header">
                <IonToolbar className="draft-preview-toolbar">
                  <IonButtons slot="start">
                    <IonButton fill="clear" onClick={closeDisputeModal}>
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </IonButtons>
                  <IonTitle>Dispute Review</IonTitle>
                  {(selectedDispute.status === "submitted" || selectedDispute.status === "pending") && (
                    <IonButtons slot="end" className="draft-preview-toolbar-actions">
                      <IonButton
                        className="dispute-action-btn dispute-action-btn--accept"
                        color="success"
                        fill="solid"
                        onClick={handleAcceptDispute}
                        disabled={!decisionReason.trim() || processing}
                      >
                        <IonIcon icon={checkmarkOutline} slot="start" />
                        Accept
                      </IonButton>
                      <IonButton
                        className="dispute-action-btn dispute-action-btn--reject"
                        color="danger"
                        fill="solid"
                        onClick={handleRejectDispute}
                        disabled={!decisionReason.trim() || processing}
                      >
                        <IonIcon icon={closeOutline} slot="start" />
                        Reject
                      </IonButton>                      
                    </IonButtons>
                  )}
                </IonToolbar>
              </IonHeader>
              <IonContent className="draft-preview-content">
                <div className="draft-preview-shell">
                  <IonGrid className="draft-preview-grid">
                    <IonRow>
                      <IonCol>
                        <div className="draft-preview-summary-card dispute-preview-card">
                          <IonCol>
                            <IonText>
                              <div className="draft-preview-summary-title">
                                <h3>Dispute Summary</h3>
                                <span className={`draft-preview-status-pill status-${selectedDispute.status || "unknown"}`}>
                                  {(selectedDispute.status || "unknown").replace(/_/g, " ")}
                                </span>
                              </div>
                            </IonText>
                          </IonCol>
                          <IonCardContent>
                            <IonRow>
                              <IonCol className="dispute-preview-details" size="12">
                                <p><strong>Employee:</strong> {selectedDispute.clientStaffName || selectedDispute.employeeName}</p>
                                <p><strong>Client Company:</strong> {selectedDispute.clientName}</p>
                              </IonCol>
                            </IonRow>
                            <IonRow>
                              <IonCol className="dispute-preview-details-reason" size="12">
                              <p><strong>Reason:</strong> {selectedDispute.disputeReason}</p>
                                {selectedDispute.disputeDetails && (
                                  <p><strong>Details:</strong> {selectedDispute.disputeDetails}</p>
                                )}
                              </IonCol>
                            </IonRow>
                          </IonCardContent>
                        </div>
                      </IonCol>
                    </IonRow>

                    {selectedDispute.computationSnapshot && (
                      <IonRow>
                        <IonCol>
                          <div className="draft-preview-table-shell dispute-preview-table">
                            <table className="draft-preview-table">
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
                                  <td>{selectedDispute.computationSnapshot.employeeCode || "N/A"}</td>
                                  <td>{selectedDispute.computationSnapshot.name || selectedDispute.employeeName || "N/A"}</td>
                                  <td>{money(selectedDispute.computationSnapshot.grossPay || 0)}</td>
                                  <td>{money(selectedDispute.computationSnapshot.netPay || 0)}</td>
                                  <td>{money(selectedDispute.computationSnapshot.sss || 0)}</td>
                                  <td>{money(selectedDispute.computationSnapshot.philHealth || 0)}</td>
                                  <td>{money(selectedDispute.computationSnapshot.pagIbig || 0)}</td>
                                  <td>{money(selectedDispute.computationSnapshot.tax || 0)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </IonCol>
                      </IonRow>
                    )}

                    <IonRow>
                      <IonCol>
                        {(selectedDispute.status === "resolved") && (
                          <div className="dispute-preview-resolved">
                            <p><strong>Resolved:</strong> This dispute was resolved on {selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt?.toDate?.() || selectedDispute.resolvedAt).toLocaleString() : "unknown"} by {selectedDispute.reviewedBy || selectedDispute.approvedBy || "Admin"}.</p>
                          </div>
                        )}

                        {selectedDispute.status == "submitted" && (
                          <IonTextarea
                            className="dispute-preview-textarea"
                            autoGrow
                            rows={4}
                            value={decisionReason}
                            placeholder="Explain your decision for this dispute."
                            onIonInput={(event) => setDecisionReason(event.detail.value || "")}
                          />
                        )}
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol className="dispute-modal-actions">
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </div>
              </IonContent>
            </IonModal>
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
