import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonInput,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonImg,
} from "@ionic/react";

import "./ComputationHistoryBase.css";
import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../database-components/firebaseConfig";
import useAuthRole from "../../hooks/useAuthRole";

function ComputationHistory() {
  const [computations, setComputations] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthRole();

  // GET ALL COMPUTATIONS FOR THIS CLIENT FROM DATABASE
  useEffect(() => {
    if (!user?.uid) return;

    const computationsRef = collection(db, "computationResults");
    const q = query(
      computationsRef, 
      where("clientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("📊 All computations for this client:", comps);
      setComputations(comps);
      setIsLoading(false);
    }, (error) => {
      console.error("🔥 Error loading computations:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Get the computation to display
  const getDisplayComputation = () => {
    if (computations.length === 0) return null;
    if (selectedPeriod === "current") {
      return computations[0]; // Most recent
    } else {
      return computations.length > 1 ? computations[1] : computations[0];
    }
  };

  const displayComputation = getDisplayComputation();

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <IonApp>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent fullscreen className="computation-history-content">
            <IonGrid className="ion-padding">
              <IonRow>
                <IonCol size="12" className="ion-text-center">
                  <IonSpinner name="crescent" />
                  <IonText><p>Loading payroll data...</p></IonText>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonContent>
          <FooterNav />
        </IonPage>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent fullscreen className="computation-history-content">
          {/* BACKGROUND ELLIPSES */}
         <IonImg
            src="/assets/Gradient-Ellipses.png"
            alt="Background Ellipse"
            className="ellipse-bg"
          />

          {/* WRAPPER DIV - opens here */}
          <div className="full-height-wrapper" style={{ padding: '16px' }}>
            {/* WHITE CARD CONTAINER - opens here */}
            <div className="history-card-container">

              {/* TITLE AND SUBTITLE */}
              <h1 className="history-title">Computation History</h1>
              <p className="history-subtitle">
                Showing {computations.length} computation{computations.length !== 1 ? 's' : ''}
              </p>

              {/* PERIOD BUTTONS */}
              <IonGrid className="period-row">
                <IonRow>
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      className={`period-btn ${selectedPeriod === 'current' ? 'period-btn-active' : 'period-btn-inactive'}`}
                      fill={selectedPeriod === 'current' ? 'solid' : 'outline'}
                      onClick={() => setSelectedPeriod('current')}
                    >
                      Current Month
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      className={`period-btn ${selectedPeriod === 'previous' ? 'period-btn-active' : 'period-btn-inactive'}`}
                      fill={selectedPeriod === 'previous' ? 'solid' : 'outline'}
                      onClick={() => setSelectedPeriod('previous')}
                    >
                      Previous Months
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* CONTENT */}
              {displayComputation ? (
                <>
                  {/* Pay Slip Card */}
                  <IonCard className="history-card">
                    <IonCardHeader>
                      <IonCardTitle>Pay Slip</IonCardTitle>
                      <IonText className="card-subtitle">View your current progress</IonText>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonGrid>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Employee Name:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={displayComputation.name || 'N/A'} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Employee Code:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={displayComputation.employeeCode || 'N/A'} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Department:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={displayComputation.department || 'N/A'} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Rate per Hour:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.ratePerHour)} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Hours Worked:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={`${displayComputation.hoursWorked} hrs`} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>Gross Pay:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.grossPay)} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="6"><IonLabel>Net Pay:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.netPay)} readonly /></IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCardContent>
                  </IonCard>

                  {/* Tax Deductions Card */}
                  <IonCard className="history-card">
                    <IonCardHeader>
                      <IonCardTitle>Tax Deductions</IonCardTitle>
                      <IonText className="card-subtitle">View deducted tax</IonText>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonGrid>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>SSS:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.sss)} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>PHIC:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.phic)} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center ion-margin-bottom">
                          <IonCol size="6"><IonLabel>HDMF:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.hdmf)} readonly /></IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="6"><IonLabel>BIR Withholding Tax:</IonLabel></IonCol>
                          <IonCol size="6"><IonInput value={formatCurrency(displayComputation.bir)} readonly /></IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCardContent>
                  </IonCard>
                </>
              ) : (
                <div className="empty-state-card">
                  <h3>No Computation History Available</h3>
                  <p>No computation data found for the selected period.</p>
                </div>
              )}

            {/* CLOSE white card container (history-card-container) */}
            </div>
          {/* CLOSE full-height-wrapper div */}
          </div>

        </IonContent>
        <FooterNav />
      </IonPage>
    </IonApp>
  );
}

export default ComputationHistory;