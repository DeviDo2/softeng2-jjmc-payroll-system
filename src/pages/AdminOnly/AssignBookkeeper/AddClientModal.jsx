import React, { useState } from "react";
import {
  IonModal,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";

import BookkeeperSelectPopover from "./BookkeeperSelectPopover";
import { parseCSV } from "./csvParser";

export default function AddClientModal({ isOpen, onDismiss, onSubmit }) {
  // Base info
  const [clientName, setClientName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [tag, setTag] = useState("Regular");

  // Bookkeeper selection
  const [assignedTo, setAssignedTo] = useState("NONE");
  const [assignedName, setAssignedName] = useState("UNASSIGNED");
  const [showBkPopover, setShowBkPopover] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState(null);

  // CSV handling
  const [file, setFile] = useState(null);
  const [parsedCSV, setParsedCSV] = useState([]);
  const [csvError, setCSVError] = useState("");

  // -----------------------------
  // Bookkeeper selection
  // -----------------------------
  const handleBookkeeperSelect = (bk) => {
    if (bk.id === "NONE") {
      setAssignedTo("NONE");
      setAssignedName("UNASSIGNED");
    } else {
      setAssignedTo(bk.id);
      setAssignedName(bk.fullName);
    }
    setShowBkPopover(false);
  };

  // -----------------------------
  // CSV Upload
  // -----------------------------
  const handleFileUpload = async (e) => {
    const fileUp = e.target.files?.[0];
    if (!fileUp) return;

    try {
      const data = await parseCSV(fileUp);

      const normalizedData = data.map((row) => ({
        employeeCode: row.employeeCode || "",
        name: row.name || "",
        payrollPeriod: row.payrollPeriod || "Monthly 2024",
        businessUnit: row.businessUnit || "General",
        department: row.department || "",
        ratePerHour: Number(row.ratePerHour) || 0,
        hoursWorked: Number(row.hoursWorked) || 0,
        grossPay: Number(row.grossPay) || 0,
        sss: Number(row.sss) || 0,
        philHealth: Number(row.philHealth) || 0,
        pagIbig: Number(row.pagIbig) || 0,
        tax: Number(row.tax) || 0,
        netPay: Number(row.netPay) || 0,
      }));

      const hasValidRow = normalizedData.some(
        (r) => r.name?.trim() !== ""
      );

      if (!hasValidRow) {
        throw new Error("CSV has no valid employees (missing names)");
      }

      setFile(fileUp);
      setParsedCSV(normalizedData);
      setCSVError("");
    } catch (err) {
      console.error("CSV Upload Error:", err);
      setParsedCSV([]);
      setCSVError(err.message || "Invalid CSV. Please upload a valid staff CSV.");
    }
  };

  // -----------------------------
  // Final Submit
  // -----------------------------
  const handleSubmit = () => {
    if (!clientName) return;

    onSubmit({
      clientName,
      businessType,
      tag,
      assignedTo,
      assignedName,
      file,
      parsedCSV,
    });
  };

  const submitDisabled =
    !clientName || parsedCSV.length === 0 || Boolean(csvError);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonContent className="ion-padding">
        <h2>Add Client</h2>

        {/* NAME */}
        <IonItem>
          <IonLabel position="stacked">Client Company Name</IonLabel>
          <IonInput
            value={clientName}
            onIonChange={(e) => setClientName(e.detail.value)}
          />
        </IonItem>

        {/* TAG */}
        <IonItem>
          <IonLabel position="stacked">Client Tag</IonLabel>
          <IonSelect value={tag} onIonChange={(e) => setTag(e.detail.value)}>
            <IonSelectOption value="Regular">Regular</IonSelectOption>
            <IonSelectOption value="New">New</IonSelectOption>
            <IonSelectOption value="Loyal">Loyal</IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* BUSINESS TYPE */}
        <IonItem>
          <IonLabel position="stacked">Type of Business</IonLabel>
          <IonSelect
            value={businessType}
            onIonChange={(e) => setBusinessType(e.detail.value)}
          >
            <IonSelectOption value="Sole Proprietorship">
              Sole Proprietorship
            </IonSelectOption>
            <IonSelectOption value="Partnership">Partnership</IonSelectOption>
            <IonSelectOption value="Limited Partnership">
              Limited Partnership
            </IonSelectOption>
            <IonSelectOption value="LLC">LLC</IonSelectOption>
            <IonSelectOption value="Corporation">Corporation</IonSelectOption>
            <IonSelectOption value="Cooperative">Cooperative</IonSelectOption>
            <IonSelectOption value="Franchise">Franchise</IonSelectOption>
            <IonSelectOption value="Nonprofit Corporation">
              Nonprofit Corporation
            </IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* BOOKKEEPER SELECT */}
        <IonItem
          button
          onClick={(e) => {
            setPopoverEvent(e.nativeEvent);
            setShowBkPopover(true);
          }}
        >
          <IonLabel>Assign To Bookkeeper</IonLabel>
          <IonText slot="end">{assignedName}</IonText>
        </IonItem>

        <BookkeeperSelectPopover
          isOpen={showBkPopover}
          event={popoverEvent}
          onDismiss={() => setShowBkPopover(false)}
          onSelect={handleBookkeeperSelect}
        />

        {/* CSV UPLOAD */}
        <IonItem>
          <IonLabel position="stacked">Upload Staff CSV</IonLabel>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </IonItem>

        {csvError && (
          <IonText color="danger">
            <p>{csvError}</p>
          </IonText>
        )}

        {/* ACTION BUTTONS */}
        <IonButton
          expand="block"
          disabled={submitDisabled}
          onClick={handleSubmit}
        >
          Continue
        </IonButton>

        <IonButton expand="block" color="medium" onClick={onDismiss}>
          Cancel
        </IonButton>
      </IonContent>
    </IonModal>
  );
}