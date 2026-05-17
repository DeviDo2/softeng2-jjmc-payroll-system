// src/pages/Computation/ClientList/ClientEmployeeList.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonImg,
  IonHeader,
  IonToolbar,
} from "@ionic/react";

import { 
  downloadOutline, 
  cloudUploadOutline, 
  arrowBackOutline 
} from "ionicons/icons";

import { useLocation, useHistory } from "react-router-dom";
import { db } from "../../../database-components/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";

import "./ClientEmployeeList.css";

const ClientEmployeeList = () => {
  const location = useLocation();
  const history = useHistory();

  // Extract query params
  const queryParams = new URLSearchParams(location.search);
  const clientId = queryParams.get("clientId");
  const clientName = queryParams.get("clientName");

  const [employees, setEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState(null);

  // Redirect if no client selected
  useEffect(() => {
    if (!clientId) {
      setError("No client selected. Please go back and choose a client.");
    }
  }, [clientId]);

  // Realtime listener for parsedCSV
  useEffect(() => {
    if (!clientId) return;

    const ref = doc(db, "clientCompanies", clientId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEmployees([]);
          return;
        }
        const data = snap.data()?.parsedCSV || [];
        setEmployees(Array.isArray(data) ? data : []);
      },
      (err) => {
        console.error(err);
        setError("Failed to load employee data.");
      }
    );

    return () => unsub();
  }, [clientId]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const key = (searchText || "").toLowerCase();
    return employees.filter((e) =>
      [e?.name, e?.employeeCode, e?.department]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(key))
    );
  }, [searchText, employees]);

  // Export CSV
  const handleExport = useCallback(() => {
    if (!employees.length) return;

    const headers = [
      "employeeCode",
      "name",
      "payrollPeriod",
      "businessUnit",
      "department",
      "ratePerHour",
      "hoursWorked",
      "grossPay",
      "sss",
      "philHealth",
      "pagIbig",
      "tax",
      "netPay",
    ];

    const rows = employees.map((emp) =>
      headers
        .map((key) => {
          const val = emp[key] ?? "";
          const safe = String(val).replace(/"/g, '""');
          return /[,"\n]/.test(safe) ? `"${safe}"` : safe;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName}-employees.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }, [employees, clientName]);

  // Redirect to CSV upload page
  const handleAddCSVRedirect = () => {
    history.push(`/bookkeeper-computation-engine?clientId=${clientId}&clientName=${clientName}`);
  };

  // Handle back navigation
  const handleBack = () => {
    history.goBack(); // Goes back to the previous page
  };

  return (
    <IonApp>
      <Sidebar />
      <IonPage id="main-content">
        <IonHeader>
          <IonToolbar>
            <IonButton slot="start" fill="clear" onClick={handleBack}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen className="employee-list-content">
          <IonImg
            src="/Gradient-Ellipses.png"
            className="ellipse-bg"
            onError={(e) => (e.target.style.display = "none")}
          />

          <IonGrid className="ion-padding client-employee-grid">
            <IonRow className="ion-text-center">
              <IonCol>
                <IonText>
                  <h2>{clientName || "Unknown Client"} – Employee List</h2>
                  <p>{employees.length} employees</p>
                </IonText>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol>
                <IonSearchbar
                  value={searchText}
                  onIonInput={(e) => setSearchText(e.detail.value)}
                  placeholder="Search employees..."
                />
              </IonCol>
            </IonRow>

            <IonRow className="ion-text-center ion-margin-bottom">
              <IonCol>
                <IonButton onClick={handleExport}>
                  <IonIcon icon={downloadOutline} slot="start" />
                  Export CSV
                </IonButton>
                <IonButton
                  onClick={handleAddCSVRedirect}
                  style={{ marginLeft: 12 }}
                >
                  <IonIcon icon={cloudUploadOutline} slot="start" />
                  Add CSV
                </IonButton>
              </IonCol>
            </IonRow>

            {error && (
              <IonCard color="danger">
                <IonCardContent>{error}</IonCardContent>
              </IonCard>
            )}

            <IonRow>
              <IonCol>
                {filteredEmployees.length === 0 ? (
                  <IonCard className="empty-state-card">
                    <IonCardContent className="ion-text-center">
                      <IonText color="medium">
                        <p>No employees found.</p>
                        {employees.length > 0 && (
                          <p>Try adjusting your search terms.</p>
                        )}
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                ) : (
                  <div className="table-scroll-container">
                    <table className="employee-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Period</th>
                          <th>Unit</th>
                          <th>Dept</th>
                          <th>Rate/hr</th>
                          <th>Hours</th>
                          <th>Gross</th>
                          <th>SSS</th>
                          <th>PHIC</th>
                          <th>HDMF</th>
                          <th>Tax</th>
                          <th>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((emp, idx) => (
                          <tr key={idx}>
                            <td>{emp.employeeCode}</td>
                            <td>{emp.name}</td>
                            <td>{emp.payrollPeriod}</td>
                            <td>{emp.businessUnit}</td>
                            <td>{emp.department}</td>
                            <td>₱{emp.ratePerHour}</td>
                            <td>{emp.hoursWorked}</td>
                            <td>₱{emp.grossPay}</td>
                            <td>₱{emp.sss}</td>
                            <td>₱{emp.philHealth}</td>
                            <td>₱{emp.pagIbig}</td>
                            <td>₱{emp.tax}</td>
                            <td>₱{emp.netPay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
};

export default ClientEmployeeList;