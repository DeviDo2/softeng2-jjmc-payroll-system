import React, { useState } from "react";
import {
  IonApp,
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
  IonCardContent
} from "@ionic/react";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import DraftTable from "./DraftTable";
import DraftModal from "./DraftModal";
import useDrafts from "./useDrafts";
import useAuthRole from "../../../hooks/useAuthRole";

import "./ComputationApproval.css";

export default function ComputationApproval() {
  const { drafts, loading, approveDraft, reviseDraft } = useDrafts();
  const { user } = useAuthRole();
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const [processing, setProcessing] = useState(false);

  // Open modal to view draft
  const openModal = (draft) => {
    console.log("📄 Opening draft:", draft.id, "for client:", draft.clientName);
    setSelectedDraft(draft);
  };

  const closeModal = () => setSelectedDraft(null);

  // Handle approve button
  const handleApprove = async () => {
    if (!selectedDraft) return;
    
    setProcessing(true);
    try {
      console.log("🔄 Attempting to approve draft:", selectedDraft.id);
      
      await approveDraft(selectedDraft.id, {
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
      
      await reviseDraft(selectedDraft.id, notes, {
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

  // Check if user is admin
  if (user && user.role !== "admin" && user.role !== "supervisor") {
    return (
      <IonApp>
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
      </IonApp>
    );
  }

  return (
    <IonApp>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent className="computation-content">
          <IonImg
            src="../../assets/Gradient-Ellipses.png"
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
                  <DraftTable drafts={drafts} onSelect={openModal} />
                  
                </IonCol>
              </IonRow>
            )}
            
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
    </IonApp>
  );
}