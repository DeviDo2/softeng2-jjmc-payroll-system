import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonIcon,
  IonModal,
  IonContent,
  IonSpinner,
} from "@ionic/react";

import { checkmarkOutline } from "ionicons/icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";

import { parseCSV } from "../../BookkeeperOnly/ComputationEngine/csvParser";
import BookkeeperSelectPopover from "./BookkeeperSelectPopover";

const getDisplayName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.displayName ||
  user.email ||
  "None";

export default function AssignRow({ client, bookkeepers, onAssign }) {
  const [showModal, setShowModal] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [assignedName, setAssignedName] = useState("None");

  const [showPopover, setShowPopover] = useState(false);

  // Load assigned bookkeeper name
  useEffect(() => {
    const loadName = async () => {
      if (!client.bookkeeperId) {
        setAssignedName("None");
        return;
      }

      if (client.bookkeeperName) {
        setAssignedName(client.bookkeeperName);
        return;
      }

      const snap = await getDoc(doc(db, "users", client.bookkeeperId));
      if (snap.exists()) {
        setAssignedName(getDisplayName(snap.data()));
      } else {
        setAssignedName("None");
      }
    };

    loadName();
  }, [client.bookkeeperId]);

  // Load CSV into modal
  const openViewer = async () => {
    setShowModal(true);
    setLoading(true);

    try {
      const snap = await getDoc(doc(db, "clientCompanies", client.id));
      if (snap.exists()) {
        const data = snap.data();

        if (data.parsedCSV) {
          setCsvData(data.parsedCSV);
        } else if (data.csv) {
          const parsed = await parseCSV(
            new Blob([data.csv], { type: "text/csv" })
          );
          setCsvData(parsed);
        }
      }
    } catch (err) {
      console.error("CSV Load Error:", err);
      setCsvData([]);
    }

    setLoading(false);
  };

  const openBkPopover = (e) => {
    e.preventDefault();
    setShowPopover(true);
  };

  const handleSelectBk = (bk) => {
    onAssign(client, bk);
    setShowPopover(false);
  };

  // Force a consistent column order + labels for the CSV viewer
  const desiredOrder = [
    "employeeCode",
    "name",
    "ratePerHour",
    "hoursWorked",
    "payrollPeriod",
  ];

  const headerLabels = {
    employeeCode: "Employee code",
    name: "Name",
    ratePerHour: "Rate/hour",
    hoursWorked: "Hours worked",
    payrollPeriod: "Payroll period",
  };

  const csvHeaders = csvData?.length
    ? desiredOrder.filter((key) => csvData.some((r) => r[key] !== undefined))
    : [];

  return (
    <>
      <tr>
        <td>{client.name}</td>

        <td>
          <IonButton size="small" onClick={openViewer}>
            View CSV
          </IonButton>
        </td>

        <td>{assignedName}</td>

        <td>{client.status || "Unknown"}</td>

        <td>
          <IonButton size="small" color="success" onClick={openBkPopover}>
            <IonIcon icon={checkmarkOutline} />
          </IonButton>
        </td>
      </tr>

      {/* CSV Modal */}
      <IonModal
        isOpen={showModal}
        onDidDismiss={() => setShowModal(false)}
        className="csv-viewer-modal"
      >
        <IonContent className="csv-modal-content">
          <div className="csv-modal-header">
            <h2>{client.name} — Staff CSV</h2>
            <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
          </div>

          {loading ? (
            <div className="csv-loading">
              <IonSpinner />
              <p>Loading CSV…</p>
            </div>
          ) : !csvData?.length ? (
            <p>No CSV found.</p>
          ) : (
            <div className="csv-table-wrapper">
              <table className="csv-full-table">
                <thead>
                  <tr>
                    {csvHeaders.map((header) => (
                      <th key={header}>{headerLabels[header] || header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {csvHeaders.map((header) => {
                        let value = row[header];
                        if (value === undefined || value === null) value = "";

                        if (header === "ratePerHour" && value !== "") {
                          const n = Number(value) || 0;
                          value = n.toFixed(2);
                        }

                        if (header === "hoursWorked" && value !== "") {
                          value = String(value);
                        }

                        return <td key={header}>{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </IonContent>
      </IonModal>


      <BookkeeperSelectPopover
        isOpen={showPopover}
        onDismiss={() => setShowPopover(false)}
        onSelect={handleSelectBk}
        bookkeepers={bookkeepers}
      />
    </>
  );
}
