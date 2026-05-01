import React, { useState, useEffect, useMemo } from "react";
import {
  IonApp,
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
} from "@ionic/react";
import { calculatorOutline, saveOutline, documentOutline, downloadOutline, personOutline } from "ionicons/icons";

import "./ComputationPageBase.css";
import useAuthRole from "../../../hooks/useAuthRole";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";
import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import { formatCurrency } from "./formatters";
import { calculateDeductions, calculateBIRTax } from "./payrollCalculations";
import { useLocation } from "react-router-dom";

const PERIODS_PER_YEAR = 12;

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
        const gross = Number(row.grossPay) || 0;
        const monthly = calculateDeductions(gross);
        const annualGross = gross * PERIODS_PER_YEAR;
        const annualTaxWithheld = (monthly.bir || 0) * PERIODS_PER_YEAR;
        const annualTaxByBrackets = calculateBIRTax(annualGross);
        const refundOrDue = Math.round((annualTaxWithheld - annualTaxByBrackets) * 100) / 100;

        return {
          original: row,
          grossMonthly: gross,
          monthlyDeductions: monthly,
          annual: { annualGross, annualTaxWithheld, annualTaxByBrackets, refundOrDue },
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
      const dataToSave = computedPreview.map(r => ({
        ...r.original,
        ...r.monthlyDeductions,
        ...r.annual,
      }));

      await addDoc(collection(db, collectionName), {
        clientId,
        clientName,
        data: dataToSave,
        bookkeeperId: user.uid,
        createdAt: serverTimestamp(),
        status: "pending_approval",
      });
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
      alert("Draft saved successfully!");
    }
  };

  const handleSaveResults = async () => {
    const success = await saveToFirestore("computationResults");
    if (success) {
      alert("Computation results saved successfully!");
    }
  };

  const exportCSV = () => {
    if (!computedPreview) return;
    const headers = [
      "employeeCode","name","grossMonthly","sss","phic","hdmf","bir","netPay",
      "annualGross","annualTaxWithheld","annualTaxByBrackets","refundOrDue"
    ];

    const rows = computedPreview.map(r =>
      headers.map(h => r.monthlyDeductions[h] ?? r.annual[h] ?? r.original[h] ?? "").join(",")
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
      <IonApp>
        <Sidebar />
        <IonPage>
          <IonContent className="ion-padding ion-text-center">
            <h1>No client selected</h1>
            <IonButton routerLink="/bookkeeper-client-list">Back to Clients</IonButton>
          </IonContent>
        </IonPage>
      </IonApp>
    );

  return (
    <IonApp>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent fullscreen className="computation-content">
          <IonImg src="/assets/Gradient-Ellipses.png" className="ellipse-bg" />
          <IonGrid className="ion-padding">
           
            <IonRow>
              <IonCol className="ion-text-center">
                <h1 className="computation-main-title">Payroll Computation</h1>
                
                   <p className="computation-main-subtitle">
          Compute payroll and prepare for client delivery
        </p>
                      <IonButton
      className="client-selector-btn"
      expand="block"
      routerLink="/bookkeeper-client-list"
    >
      <IonIcon icon={personOutline} slot="start" />
      {clientName || "Select Client"}
    </IonButton>
    {/* ADDED: Employee count badge – moved below button */}
    <IonBadge color="primary" style={{ marginTop: '12px' }}>
      <IonIcon icon={personOutline} /> {csvData.length} Employees
    </IonBadge>
  </IonCol>
</IonRow>
         

            {/* CONTROLS */}
            <IonRow className="ion-margin-bottom">
              <IonCol size="12" sizeMd="6">
                <IonSearchbar
                  placeholder="Search employees..."
                  value={searchText}
                  onIonInput={e => setSearchText(e.detail.value)}
                />
                <IonButton onClick={computePreview} disabled={isComputing} style={{ marginTop: 8 }}>
                  {isComputing ? <IonSpinner name="crescent"/> : "Compute Payroll"}
                </IonButton>
                <IonButton
                  onClick={handleSaveDraft}
                  disabled={!computedPreview || isSaving}
                  style={{ marginLeft: 10, marginTop:8 }}
                >
                  {isSaving ? <IonSpinner name="crescent"/> : "Save as Draft"}
                </IonButton>
                <IonButton
                  onClick={handleSaveResults}
                  disabled={!computedPreview || isSaving}
                  style={{ marginLeft: 10, marginTop:8 }}
                >
                  {isSaving ? <IonSpinner name="crescent"/> : "Save Results"}
                </IonButton>
                <IonButton
                  onClick={exportCSV}
                  disabled={!computedPreview}
                  style={{ marginLeft: 10, marginTop:8 }}
                >
                  Export CSV
                </IonButton>
              </IonCol>
            </IonRow>

            {/* SOURCE DATA TABLE - NO EMAIL COLUMN */}
            <IonRow>
              <IonCol>
                <h3>Employee Data</h3>
                <div className="table-scroll-container">
                  <table className="results-data-table">
                    <thead>
                      <tr>
                        <th>Code</th><th>Name</th><th>Gross</th><th>Rate</th><th>Hours</th><th>Dept</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((r,i) => (
                        <tr key={i}>
                          <td>{r.employeeCode}</td>
                          <td>{r.name}</td>
                          <td>{formatCurrency(r.grossPay)}</td>
                          <td>{formatCurrency(r.ratePerHour)}</td>
                          <td>{r.hoursWorked}</td>
                          <td>{r.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </IonCol>
            </IonRow>

            {/* COMPUTED PREVIEW TABLE - NO EMAIL STATUS */}
            {computedPreview && (
              <IonRow className="ion-margin-top">
                <IonCol>
                  <h3>Computation Results</h3>
                  <div className="table-scroll-container">
                    <table className="results-data-table">
                      <thead>
                        <tr>
                          <th>Code</th><th>Name</th>
                          <th>Gross(M)</th><th>SSS</th><th>PHIC</th><th>HDMF</th>
                          <th>BIR</th><th>Net(M)</th>
                          <th>Annual Gross</th><th>Annual Tax Withheld</th>
                          <th>Annual Tax Bracket</th><th>Refund/Due</th>
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
                            <td>{formatCurrency(r.monthlyDeductions.netPay)}</td>
                            <td>{formatCurrency(r.annual.annualGross)}</td>
                            <td>{formatCurrency(r.annual.annualTaxWithheld)}</td>
                            <td>{formatCurrency(r.annual.annualTaxByBrackets)}</td>
                            <td style={{color:r.annual.refundOrDue>0?"green":"red"}}>
                              {r.annual.refundOrDue>0 ? `Refund ${formatCurrency(r.annual.refundOrDue)}` : `Due ${formatCurrency(Math.abs(r.annual.refundOrDue))}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </IonCol>
              </IonRow>
            )}
          </IonGrid>
        </IonContent>
        <FooterNav />
      </IonPage>
    </IonApp>
  );
}

export default ComputationPage;