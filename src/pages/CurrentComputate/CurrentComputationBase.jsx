import React, { useState, useEffect } from "react";
import {
  IonApp,
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
} from "@ionic/react";

import "./CurrentComputationBase.css";

import useAuthRole from "../../hooks/useAuthRole";
import { getComputationResultsForUser } from "../../services/computationResultsService";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";

function CurrentComputation() {
  const [employeeData, setEmployeeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuthRole();

  useEffect(() => {
    if (!user?.uid) {
      console.log("Waiting for user authentication...");
      setIsLoading(false);
      return;
    }

    loadComputation();
  }, [user]);

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

  if (isLoading) {
    return (
      <IonApp>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent fullscreen className="computation-content">
            <div className="ion-text-center ion-padding">
              <IonSpinner name="crescent" />
              <IonText><p>Loading current computation...</p></IonText>
            </div>
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent fullscreen className="computation-content">
          <IonImg
            src="/assets/Gradient-Ellipses.png"
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
              </>
            )}
          </IonGrid>
        </IonContent>

        <FooterNav/>
      </IonPage>
    </IonApp>
  );
}

export default CurrentComputation;
