import React, { useState, useEffect, useMemo } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonSearchbar,
  IonImg,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  IonBadge,
  IonNote,
  IonCardHeader,
  IonCardTitle,
  IonToast,
} from "@ionic/react";
import { personOutline } from "ionicons/icons";

import "./ComputationPageBase.css";
import useAuthRole from "../../../hooks/useAuthRole";
import { collection, addDoc, serverTimestamp, doc, onSnapshot, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";
import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import { formatCurrency } from "./formatters";
import { calculateDeductions } from "./payrollCalculations";
import { useLocation } from "react-router-dom";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100;

const getMonthlyGrossPay = (row) => {
  const providedGross = toNumber(row.grossPay);
  if (providedGross > 0) return roundMoney(providedGross);

  return roundMoney(toNumber(row.ratePerHour) * toNumber(row.hoursWorked));
};

const getPayrollPeriod = (rows) => {
  const period = rows.find((row) => row.payrollPeriod)?.payrollPeriod;
  return period || new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

// SIMPLE VALIDATION - NO EMAIL CHECKS
export const validateCSVData = (parsedCSV) => {
  const data = parsedCSV?.data || parsedCSV;
  
  if (!Array.isArray(data)) {
    throw new Error("Invalid CSV format: Expected an array of rows");
  }

  const errors = [];
  
  data.forEach((row, index) => {
    if (!row.name) errors.push(`Row ${index + 1}: Missing employee name`);
    if (!row.ratePerHour || isNaN(row.ratePerHour) || row.ratePerHour <= 0)
      errors.push(`Row ${index + 1}: Invalid rate per hour`);
    if (!row.hoursWorked || isNaN(row.hoursWorked) || row.hoursWorked <= 0)
      errors.push(`Row ${index + 1}: Invalid hours worked`);
  });

  return { errors };
};

// SIMPLE TEMPLATE - NO EMAIL COLUMN
const downloadCSVTemplate = () => {
  const templateData = [
    "name,employeeCode,department,position,ratePerHour,hoursWorked,payrollPeriod",
    "Juan Dela Cruz,EMP001,Engineering,Senior Developer,650,160,January 2024",
    "Maria Santos,EMP002,Marketing,Marketing Manager,580,152,January 2024",
    "Kozume Kenma,EMP003,Engineering,Game Developer,700,160,January 2024"
  ].join("\n");

  const blob = new Blob([templateData], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payroll-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function ComputationPage() {
  const { loading, user } = useAuthRole();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const clientId = queryParams.get("clientId");
  const clientName = queryParams.get("clientName");

  const [csvData, setCsvData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [computedPreview, setComputedPreview] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [relatedDisputes, setRelatedDisputes] = useState([]);
  const [toastState, setToastState] = useState({ isOpen: false, message: "" });

  // Load CSV data
  useEffect(() => {
    if (!clientId) return;
    
    const ref = doc(db, "clientCompanies", clientId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const employees = snap.data()?.parsedCSV || [];
        setCsvData(employees);
        setComputedPreview(null);
      }
    });

    return () => unsub();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setRelatedDisputes([]);
      return;
    }

    const loadRelatedDisputes = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "computationDisputes"), where("clientCompanyId", "==", clientId))
        );

        const openDisputes = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((dispute) => ["accepted", "disputed"].includes((dispute.status || "").toLowerCase()));

        setRelatedDisputes(openDisputes);
      } catch (disputeError) {
        console.error("Could not load related disputes:", disputeError);
        setRelatedDisputes([]);
      }
    };

    loadRelatedDisputes();
  }, [clientId]);

  // Filtered data
  const filteredData = useMemo(() => {
    const key = searchText.toLowerCase();
    return csvData.filter(r =>
      r.name?.toLowerCase().includes(key) ||
      r.employeeCode?.toLowerCase().includes(key) ||
      r.department?.toLowerCase().includes(key)
    );
  }, [csvData, searchText]);

  // Compute function - NO EMAIL LOGIC
  const computePreview = () => {
    if (!csvData.length) return;
    setIsComputing(true);

    try {
      const preview = csvData.map(row => {
        const gross = getMonthlyGrossPay(row);
        const monthly = calculateDeductions(gross);
        const totalDeductions = roundMoney(
          monthly.sss + monthly.phic + monthly.hdmf + monthly.bir
        );

        return {
          original: row,
          grossMonthly: gross,
          monthlyDeductions: { ...monthly, totalDeductions },
          netPay: monthly.netPay
        };
      });

      setComputedPreview(preview);
    } catch (err) {
      console.error(err);
    } finally {
      setIsComputing(false);
    }
  };

  // SAVE FUNCTIONS - THESE SHOULD WORK
  const saveToFirestore = async (collectionName) => {
    if (!computedPreview || !user?.uid) return;
    setIsSaving(true);
    try {
      const payrollPeriod = getPayrollPeriod(csvData);
      const isDraft = collectionName === "clientPayrollDrafts";
      const bookkeeperName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Bookkeeper";

      const dataToSave = computedPreview.map(r => ({
        ...r.original,
        grossPay: r.grossMonthly,
        grossMonthly: r.grossMonthly,
        sss: r.monthlyDeductions.sss,
        phic: r.monthlyDeductions.phic,
        philHealth: r.monthlyDeductions.phic,
        hdmf: r.monthlyDeductions.hdmf,
        pagIbig: r.monthlyDeductions.hdmf,
        bir: r.monthlyDeductions.bir,
        tax: r.monthlyDeductions.bir,
        totalDeductions: r.monthlyDeductions.totalDeductions,
        netPay: r.monthlyDeductions.netPay,
        payrollPeriod: r.original.payrollPeriod || payrollPeriod,
      }));
      const disputeIds = isDraft ? relatedDisputes.map((dispute) => dispute.id) : [];
      const docRef = await addDoc(collection(db, collectionName), {
        clientId,
        clientName,
        payrollPeriod,
        data: dataToSave,
        bookkeeperId: user.uid,
        bookkeeperName,
        bookkeeperEmail: user.email || "",
        employeeCount: dataToSave.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: isDraft ? "pending_approval" : "computed",
        isDisputeRecompute: disputeIds.length > 0,
        disputeIds,
        ...(isDraft
          ? {
              submittedToAdmin: true,
              submittedAt: serverTimestamp(),
            }
          : {}),
      });

      if (isDraft && disputeIds.length > 0) {
        await Promise.all(
          disputeIds.map((disputeId) =>
            updateDoc(doc(db, "computationDisputes", disputeId), {
              status: "pending",
              latestDraftId: docRef.id,
              resubmittedDraftId: docRef.id,
              resubmittedAt: serverTimestamp(),
              // mark that the bookkeeper recomputed the disputed payroll
              bookkeeperRecomputed: true,
              bookkeeperRecomputedBy: user.uid || null,
              bookkeeperRecomputedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          )
        );
      }
      return true;
    } catch (err) {
      console.error(err);
      alert(`Failed to save to ${collectionName}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const success = await saveToFirestore("clientPayrollDrafts");
    if (success) {
      setToastState({
        isOpen: true,
        message: "Draft sent to admin for approval!",
      });
    }
  };
  const exportCSV = () => {
    if (!computedPreview) return;
    const headers = [
      "employeeCode","name","payrollPeriod","grossMonthly","sss","phic","hdmf","bir","totalDeductions","netPay"
    ];

    const rows = computedPreview.map(r =>
      headers.map(h => r.monthlyDeductions[h] ?? r[h] ?? r.original[h] ?? "").join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName}-computed.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You are not logged in.</p>;
  if (!clientId)
    return (
      <>
        <Sidebar />
        <IonPage>
          <IonContent className="ion-padding ion-text-center">
            <h1>No client selected</h1>
            <IonButton routerLink="/bookkeeper-client-list-base">Back to Clients</IonButton>
          </IonContent>
        </IonPage>
      </>
    );

  return (
      <>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent fullscreen className="computation-content">
            <IonImg src="/Gradient-Ellipses.png" className="ellipse-bg" />
            <IonToast
              isOpen={toastState.isOpen}
              message={toastState.message}
              duration={2500}
              position="top"
              color="success"
              onDidDismiss={() => setToastState({ isOpen: false, message: "" })}
            />
            <div className="computation-panel">
              <IonGrid>
                <IonRow>
                  <IonCol>
                    <IonText>
                     <h1 className="computation-main-title">Payroll Computation</h1>
                      <p className="computation-main-subtitle">
                        Compute payroll, review the results, and submit the draft for admin approval.
                      </p>
                    </IonText>
                  </IonCol>
                </IonRow>

              <IonRow className="computation-summary-row">
                <IonCol size="6" sizeMd="4">
                  <div className="computation-summary-card">
                    <span className="computation-summary-label">Employees</span>
                    <strong>{csvData.length}</strong>
                  </div>
                </IonCol>
                <IonCol size="12" sizeMd="4">
                  <div className="computation-summary-card">
                    <span className="computation-summary-label">Client</span>
                    <strong>{clientName || "Select Client"}</strong>
                  </div>
                </IonCol>
                <IonCol size="6" sizeMd="4">
                  <div className="computation-summary-card">
                    <span className="computation-summary-label">Open Disputes</span>
                    <strong>{relatedDisputes.length}</strong>
                  </div>
                </IonCol>
              </IonRow>

              {relatedDisputes.length > 0 && (
                <IonRow>
                  <IonCol>
                    <IonCard className="computation-info-card">
                      <IonCardContent>
                        <IonNote color="warning">
                          This client has {relatedDisputes.length} accepted dispute{relatedDisputes.length !== 1 ? "s" : ""}. Sending a new draft will route the recomputation back to admin review.
                        </IonNote>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              )}

              <IonRow>
                <IonCol>
                  <IonCard className="computation-controls-card">
                    <IonCardContent>
                      <IonRow>
                        <IonCol size="12" sizeLg="7">
                          <IonSearchbar
                            className="computation-searchbar"
                            placeholder="Search employees..."
                            value={searchText}
                            onIonInput={e => setSearchText(e.detail.value)}
                          />
                        </IonCol>
                        <IonCol size="12" sizeLg="5">
                          <IonButton
                            className="client-selector-btn"
                            expand="block"
                            routerLink="/bookkeeper-client-list-base"
                          >
                            <IonIcon icon={personOutline} slot="start" />
                            Open Client List
                          </IonButton>
                        </IonCol>
                      </IonRow>

                      <div className="computation-action-grid">
                        <IonButton onClick={computePreview} disabled={isComputing}>
                          {isComputing ? <IonSpinner name="crescent"/> : "Compute Payroll"}
                        </IonButton>
                        <IonButton
                          onClick={handleSaveDraft}
                          disabled={!computedPreview || isSaving}
                        >
                          {isSaving ? <IonSpinner name="crescent"/> : "Send Draft to Admin"}
                        </IonButton>
                        <IonButton
                          onClick={exportCSV}
                          disabled={!computedPreview}
                          fill="outline"
                        >
                          Export CSV
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              {computedPreview && (
                <IonRow className="ion-margin-top">
                  <IonCol>
                    <IonCard className="computation-table-card">
                      <IonCardHeader>
                        <IonCardTitle>Computation Results</IonCardTitle>
                        <IonText color="medium">
                          <p>Preview the payroll deductions and net pay before submitting.</p>
                        </IonText>
                      </IonCardHeader>
                      <IonCardContent>
                        <div className="table-scroll-container">
                          <table className="results-data-table">
                            <thead>
                              <tr>
                                <th>Code</th><th>Name</th>
                                <th>Gross(M)</th><th>SSS</th><th>PHIC</th><th>HDMF</th>
                                <th>BIR</th><th>Total Deductions</th><th>Net(M)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {computedPreview.map((r,i)=>(
                                <tr key={i}>
                                  <td>{r.original.employeeCode}</td>
                                  <td>{r.original.name}</td>
                                  <td>{formatCurrency(r.grossMonthly)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.sss)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.phic)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.hdmf)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.bir)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.totalDeductions)}</td>
                                  <td>{formatCurrency(r.monthlyDeductions.netPay)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              )}
              <IonRow>
                <IonCol>
                  <IonCard className="computation-table-card">
                    <IonCardHeader>
                      <IonCardTitle>Employee Data</IonCardTitle>
                      <IonText color="medium">
                        <p>Source employee records for this payroll run.</p>
                      </IonText>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="table-scroll-container">
                        <table className="results-data-table">
                          <thead>
                            <tr>
                              <th>Code</th><th>Name</th><th>Gross</th><th>Rate</th><th>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((r,i) => (
                              <tr key={i}>
                                <td>{r.employeeCode}</td>
                                <td>{r.name}</td>
                                <td>{formatCurrency(getMonthlyGrossPay(r))}</td>
                                <td>{formatCurrency(r.ratePerHour)}</td>
                                <td>{r.hoursWorked}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              
              </IonGrid>
            </div>
          </IonContent>
          <FooterNav />
        </IonPage>
      </>
  );
}

export default ComputationPage;
