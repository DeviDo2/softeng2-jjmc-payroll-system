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

// Firebase imports
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../database-components/firebaseConfig";
import useAuthRole from "../../hooks/useAuthRole";

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
      
      // First, let's see what's actually in the collection
      console.log("=== DEBUG: Checking computationResults collection ===");
      const testQuery = query(
        collection(db, "computationResults"),
        limit(5) // Get first 5 documents
      );
      
      const testSnapshot = await getDocs(testQuery);
      console.log("Total documents in computationResults:", testSnapshot.docs.length);
      
      if (testSnapshot.docs.length === 0) {
        console.log("❌ computationResults collection is EMPTY!");
        setEmployeeData(null);
        setError("The database is empty. Ask bookkeeper to send data to 'computationResults' collection.");
        return;
      }
      
      testSnapshot.docs.forEach((doc, index) => {
        console.log(`--- Document ${index + 1} ---`);
        console.log("ID:", doc.id);
        const data = doc.data();
        console.log("Data:", data);
        console.log("Fields:", Object.keys(data));
        
        // Check for payroll fields
        const payrollFields = ['netPay', 'grossPay', 'ratePerHour', 'hoursWorked', 'sss', 'philHealth', 'phic', 'pagIbig', 'hdmf', 'tax', 'bir'];
        const foundFields = payrollFields.filter(field => data[field] !== undefined);
        console.log("Payroll fields found:", foundFields);
      });
      
      // Try to get the most recent
      console.log("\n=== Trying to get most recent document ===");
      const q = query(
        collection(db, "computationResults"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      console.log("Most recent query found:", snapshot.docs.length, "documents");
      
      if (snapshot.empty) {
        console.log("No documents with createdAt field");
        // Try without ordering
        const simpleQuery = query(
          collection(db, "computationResults"),
          limit(1)
        );
        const simpleSnapshot = await getDocs(simpleQuery);
        
        if (!simpleSnapshot.empty) {
          const doc = simpleSnapshot.docs[0];
          const data = doc.data();
          console.log("✅ Found document (no ordering):", data);
          setEmployeeData(data);
          setError("");
          return;
        }
      } else {
        const doc = snapshot.docs[0];
        const data = doc.data();
        console.log("✅ Most recent document:", data);
        setEmployeeData(data);
        setError("");
        return;
      }
      
      // If we get here, no data found
      setEmployeeData(null);
      setError("No computation data found. Ask bookkeeper to send payroll data.");
      
    } catch (error) {
      console.error("❌ Error:", error.code, error.message);
      setEmployeeData(null);
      
      if (error.code === 'failed-precondition') {
        // Index error - try simple query
        console.log("Index error, trying simple query...");
        try {
          const simpleQuery = query(
            collection(db, "computationResults"),
            limit(1)
          );
          const simpleSnapshot = await getDocs(simpleQuery);
          
          if (!simpleSnapshot.empty) {
            const doc = simpleSnapshot.docs[0];
            const data = doc.data();
            console.log("✅ Found document (simple query):", data);
            setEmployeeData(data);
            setError("");
          } else {
            setError("No documents found. Ask bookkeeper to send data.");
          }
        } catch (simpleError) {
          console.error("Simple query also failed:", simpleError);
          setError(`Error: ${error.message}. Collection might not exist.`);
        }
      } else {
        setError(`Error: ${error.message}`);
      }
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

            {error && (
              <IonRow>
                <IonCol size="12">
                  <IonCard color="warning">
                    <IonCardContent>
                      <IonText>
                        <p>{error}</p>
                        <p><small>Collection: computationResults</small></p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            )}

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
                
                {/* Debug Info Card */}
                <IonRow>
                  <IonCol size="12">
                    <IonCard color="light">
                      <IonCardHeader>
                        <IonCardTitle>Debug Information</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonText>
                          <p><strong>Found document with fields:</strong></p>
                          <p>{Object.keys(employeeData).join(', ')}</p>
                          <p><strong>Missing payroll fields:</strong></p>
                          <p>
                            {['ratePerHour', 'hoursWorked', 'grossPay', 'netPay', 'sss', 'philHealth', 'pagIbig', 'tax']
                              .filter(field => employeeData[field] === undefined)
                              .join(', ')}
                          </p>
                        </IonText>
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