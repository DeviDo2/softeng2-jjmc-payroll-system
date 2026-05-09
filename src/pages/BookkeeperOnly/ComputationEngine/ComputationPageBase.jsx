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
import { personOutline } from "ionicons/icons";

import "./ComputationPageBase.css";
import useAuthRole from "../../../hooks/useAuthRole";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
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

      await addDoc(collection(db, collectionName), {
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
        ...(isDraft
          ? {
              submittedToAdmin: true,
              submittedAt: serverTimestamp(),
            }
          : {}),
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
      alert("Draft sent to admin for approval!");
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
      <IonApp>
        <Sidebar />
        <IonPage>
          <IonContent className="ion-padding ion-text-center">
            <h1>No client selected</h1>
            <IonButton routerLink="/bookkeeper-client-list-base">Back to Clients</IonButton>
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
  </IonCol>
</IonRow>

            <IonRow className="client-selector-row">
              <IonCol size="12" sizeMd="5" className="client-selector-col">
                <IonButton
                  className="client-selector-btn"
                  expand="block"
                  routerLink="/bookkeeper-client-list-base"
                >
                  <IonIcon icon={personOutline} slot="start" />
                  {clientName || "Select Client"}
                </IonButton>
                <IonBadge color="primary" className="employee-count-badge">
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
                  {isSaving ? <IonSpinner name="crescent"/> : "Send Draft to Admin"}
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
                          <td>{formatCurrency(getMonthlyGrossPay(r))}</td>
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
