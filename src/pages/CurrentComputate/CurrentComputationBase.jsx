import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonText,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
  IonAlert,
  IonButton,
  IonModal,
  IonTextarea,
  IonNote,
} from "@ionic/react";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";

import "./CurrentComputationBase.css";

import useAuthRole from "../../hooks/useAuthRole";
import { getComputationResultsForUser } from "../../services/computationResultsService";
import { db } from "../../database-components/firebaseConfig";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";

const OPEN_DISPUTE_STATUSES = new Set([
  "submitted",
  "accepted",
  "pending",
  "approved",
  "disputed",
  "resolved",
]);

function CurrentComputation() {
  const [employeeData, setEmployeeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [activeDispute, setActiveDispute] = useState(null);
  const [feedback, setFeedback] = useState({ show: false, message: "" });
  const { user } = useAuthRole();

  useEffect(() => {
    if (!user?.uid) {
      console.log("Waiting for user authentication...");
      setIsLoading(false);
      return;
    }

    loadComputation();
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !employeeData?.id) {
      setActiveDispute(null);
      return;
    }

    const loadActiveDispute = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "computationDisputes"),
            where("clientStaffId", "==", user.uid),
            where("computationResultId", "==", employeeData.id)
          )
        );

        const latestOpenDispute = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((dispute) => OPEN_DISPUTE_STATUSES.has((dispute.status || "").toLowerCase()))
          .sort((left, right) => {
            const leftTime = left.updatedAt?.toDate?.()?.getTime?.() || new Date(left.updatedAt || 0).getTime() || 0;
            const rightTime = right.updatedAt?.toDate?.()?.getTime?.() || new Date(right.updatedAt || 0).getTime() || 0;
            return rightTime - leftTime;
          })[0];

        setActiveDispute(latestOpenDispute || null);
      } catch (disputeError) {
        console.error("Error loading dispute status:", disputeError);
        setActiveDispute(null);
      }
    };

    loadActiveDispute();
  }, [user?.uid, employeeData?.id]);

  const loadComputation = async () => {
    try {
      setIsLoading(true);
      const computations = await getComputationResultsForUser(user);

      if (computations.length > 0) {
        setEmployeeData(computations[0]);
        setError("");
        return;
      }

      setEmployeeData(null);
      setError("No computation data found for your account yet.");
    } catch (error) {
      console.error("Error loading current computation:", error);
      setEmployeeData(null);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₱0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(num);
  };

  const formatDisputeStatus = (status) => {
    switch ((status || "").toLowerCase()) {
      case "submitted":
        return "Submitted";
      case "accepted":
        return "Accepted";
      case "pending":
        return "Pending Review";
      case "approved":
        return "Approved";
      case "resolved":
        return "Resolved";
      case "disputed":
        return "Needs Recomputation";
      default:
        return status || "Open";
    }
  };

  const handleSubmitDispute = async () => {
    if (!employeeData || !user?.uid || !disputeReason.trim()) {
      return;
    }

    setIsSubmittingDispute(true);
    try {
      const clientStaffName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Client Staff";

      const payload = {
        computationResultId: employeeData.id,
        sourceDraftId: employeeData.sourceDraftId || null,
        latestDraftId: employeeData.sourceDraftId || null,
        clientStaffId: user.uid,
        clientStaffName,
        clientCompanyId: employeeData.clientCompanyId || null,
        clientName: employeeData.clientName || employeeData.company || user.company || "Unknown Client",
        company: employeeData.company || employeeData.clientName || user.company || "Unknown Client",
        bookkeeperId: employeeData.bookkeeperId || null,
        bookkeeperName: employeeData.bookkeeperName || "",
        payrollPeriod: employeeData.payrollPeriod || "",
        employeeCode: employeeData.employeeCode || "",
        employeeName: employeeData.name || clientStaffName,
        status: "submitted",
        disputeReason: disputeReason.trim(),
        disputeDetails: disputeDetails.trim(),
        computationSnapshot: {
          name: employeeData.name || "",
          employeeCode: employeeData.employeeCode || "",
          ratePerHour: employeeData.ratePerHour || 0,
          hoursWorked: employeeData.hoursWorked || 0,
          grossPay: employeeData.grossPay || 0,
          netPay: employeeData.netPay || 0,
          sss: employeeData.sss || 0,
          philHealth: employeeData.philHealth || employeeData.phic || 0,
          pagIbig: employeeData.pagIbig || employeeData.hdmf || 0,
          tax: employeeData.tax || employeeData.bir || 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const createdDispute = await addDoc(collection(db, "computationDisputes"), payload);
      setActiveDispute({ id: createdDispute.id, ...payload, status: "submitted" });
      setShowDisputeModal(false);
      setDisputeReason("");
      setDisputeDetails("");
      setFeedback({
        show: true,
        message: "Your dispute has been submitted for admin review.",
      });
    } catch (submitError) {
      console.error("Error submitting dispute:", submitError);
      setFeedback({
        show: true,
        message: `Could not submit dispute: ${submitError.message}`,
      });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent fullscreen className="computation-content">
            <div className="ion-text-center ion-padding">
              <IonSpinner name="crescent" />
              <IonText><p>Loading current computation...</p></IonText>
            </div>
          </IonContent>
        </IonPage>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent fullscreen className="computation-content">
          <IonImg
            src="/Gradient-Ellipses.png"
            alt="Background Ellipse"
            className="ellipse-bg"
          />

          <IonGrid className="ion-padding">
            <IonRow>
              <IonCol size="12">
                <IonText>
                  <h1 className="history-title">Current Computation</h1>
                </IonText>
              </IonCol>
            </IonRow>


            {!employeeData ? (
              <IonRow className="ion-justify-content-center">
                <IonCol size="12" size-md="6">
                  <IonCard className="history-card">
                    <IonCardContent className="ion-text-center">
                      <IonText color="medium">
                        <h3>No Computation Available</h3>
                        <p>Your bookkeeper hasn't sent any computations yet.</p>
                        <p><small>Check back later or contact your bookkeeper.</small></p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            ) : (
              <>
                {/* Card 1: Pay Slip */}
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" size-md="6">
                    <IonCard className="history-card">
                      <IonCardHeader className="computation-Header">
                        <IonText className="card-subtitle">
                          View your current progress
                        </IonText>
                        <IonCardTitle>Pay Slip</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonGrid>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>Rate/Hour:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.ratePerHour)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>Hours Worked:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={`${employeeData.hoursWorked || 0} hrs`} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>Gross Pay:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.grossPay)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center">
                            <IonCol size="6">
                              <IonLabel>Net Pay:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.netPay)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                        </IonGrid>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                {/* Card 2: Tax Deductions */}
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" size-md="6">
                    <IonCard className="history-card">
                      <IonCardHeader>
                        <IonText className="card-subtitle">View deducted tax</IonText>
                        <IonCardTitle>Tax Deductions</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonGrid>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>SSS:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.sss)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>PHIC:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.philHealth || employeeData.phic)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center ion-margin-bottom">
                            <IonCol size="6">
                              <IonLabel>HDMF:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.pagIbig || employeeData.hdmf)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                          <IonRow className="ion-align-items-center">
                            <IonCol size="6">
                              <IonLabel>BIR Withholding Tax:</IonLabel>
                            </IonCol>
                            <IonCol size="6">
                              <IonInput 
                                value={formatCurrency(employeeData.tax || employeeData.bir)} 
                                readonly 
                              />
                            </IonCol>
                          </IonRow>
                        </IonGrid>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" size-md="6">
                    <IonCard className="history-card">
                      <IonCardHeader>
                        <IonText className="card-subtitle">Report issues in your latest payroll computation</IonText>
                        <IonCardTitle>Dispute Computation</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {activeDispute ? (
                          <div className="dispute-status-panel">
                            <IonNote color="warning">
                              Open dispute status: <strong>{formatDisputeStatus(activeDispute.status)}</strong>
                            </IonNote>
                            <p className="dispute-status-text">
                              Reason: {activeDispute.disputeReason || "No reason provided."}
                            </p>
                            {activeDispute.adminDecisionReason && (
                              <p className="dispute-status-text">
                                Admin note: {activeDispute.adminDecisionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="dispute-status-panel">
                            <p className="dispute-status-text">
                              If you think this payroll computation is incorrect, you can submit a dispute for admin review.
                            </p>
                            <IonButton expand="block" className="dispute-submit-btn" onClick={() => setShowDisputeModal(true)}>
                              Submit Dispute
                            </IonButton>
                          </div>
                        )}
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </>
            )}
          </IonGrid>

          <IonModal isOpen={showDisputeModal} onDidDismiss={() => setShowDisputeModal(false)}>
            <IonContent className="ion-padding dispute-modal-content">
              <div className="dispute-modal-shell">
                <h2>Submit a Dispute</h2>
                <p>Tell the admin what looks incorrect in this computation.</p>

                <IonItem lines="none" className="dispute-input-item">
                  <IonLabel position="stacked">Reason</IonLabel>
                  <IonInput
                    value={disputeReason}
                    placeholder="Example: Net pay appears lower than expected"
                    onIonInput={(event) => setDisputeReason(event.detail.value || "")}
                  />
                </IonItem>

                <IonItem lines="none" className="dispute-input-item">
                  <IonLabel position="stacked">Details</IonLabel>
                  <IonTextarea
                    value={disputeDetails}
                    autoGrow
                    rows={5}
                    placeholder="Add any details that will help the admin review your concern."
                    onIonInput={(event) => setDisputeDetails(event.detail.value || "")}
                  />
                </IonItem>

                <div className="dispute-modal-actions">
                  <IonButton fill="outline" onClick={() => setShowDisputeModal(false)}>
                    Cancel
                  </IonButton>
                  <IonButton onClick={handleSubmitDispute} disabled={isSubmittingDispute || !disputeReason.trim()}>
                    {isSubmittingDispute ? <IonSpinner name="crescent" /> : "Send Dispute"}
                  </IonButton>
                </div>
              </div>
            </IonContent>
          </IonModal>

          <IonAlert
            isOpen={feedback.show}
            onDidDismiss={() => setFeedback({ show: false, message: "" })}
            header="Computation Dispute"
            message={feedback.message}
            buttons={["OK"]}
          />
        </IonContent>

        <FooterNav/>
      </IonPage>
    </>
  );
}

export default CurrentComputation;
