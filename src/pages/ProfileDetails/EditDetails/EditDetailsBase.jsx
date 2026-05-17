import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonAlert,
  IonModal,
  IonDatetime,
  IonImg,
  IonPage,
  IonButtons,
  IonIcon,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";

import {
  calendarOutline,
  eyeOffOutline,
  eyeOutline,
  closeOutline,
} from "ionicons/icons";

import "./EditDetailsBase.css";
import useAuthRole from "../../../hooks/useAuthRole";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";

import useEditableUser from "./useEditableUser";

export default function EditDetailsBase({
  pageTitle = "Edit Details",
  fields = [],
  showCalendarField = false,
}) {
  const { loading, user } = useAuthRole();

  const [formData, setFormData] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState({ open: false, message: "" });

  const { updateUserDetails, saving, error } = useEditableUser();

  // Load existing user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        ...user,
      }));
    }
  }, [user]);

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (e) => {
    const date = e.detail.value?.split("T")[0] || "";
    handleInputChange("birthdate", date);
    setCalendarOpen(false);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    const result = await updateUserDetails(user.uid, formData);

    if (result.success) {
      setSuccessAlert(true);
    } else {
      setErrorAlert({ open: true, message: result.error });
    }
  };

  const handleCancel = () => window.history.back();

  if (loading || !user) return null;

  return (
    <IonApp>
      <Sidebar />

      <IonPage id="main-page">
        <IonContent fullscreen className="edit-content">
          <IonImg src="/Gradient-Ellipses.png" className="ellipse-bg" />

          <div className="full-height-wrapper">
            <div className="edit-card">
            <IonRow>
              <IonCol className="ion-text-center">
                <h1 className="edit-title">{pageTitle}</h1>
              </IonCol>
            </IonRow>

            <form>
              
            {fields.map((field, idx) => (
              <IonRow key={idx}>
                <IonCol size={field.colSize ?? "12   "}>
                  <IonItem className="input-item">
                    <IonLabel position="stacked">{field.label}</IonLabel>

                    {field.type === "select" ? (
                      <IonSelect
                        value={formData[field.name] ?? ""}
                        placeholder={field.placeholder}
                        onIonChange={(e) =>
                          handleInputChange(field.name, e.detail.value)
                        }
                      >
                        {field.options.map((opt, i) => (
                          <IonSelectOption key={i} value={opt.value}>
                            {opt.label}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    ) : (
                      <>
                        {field.type === "password" ? (
                          <>
                            <IonInput
                              type={passwordVisible ? "text" : "password"}
                              value={formData[field.name] ?? ""}
                              placeholder={field.placeholder}
                              onIonChange={(e) =>
                                handleInputChange(field.name, e.detail.value)
                              }
                            />
                            <IonButton
                              slot="end"
                              fill="clear"
                              onClick={() =>
                                setPasswordVisible((prev) => !prev)
                              }
                            >
                              <IonIcon
                                icon={
                                  passwordVisible ? eyeOffOutline : eyeOutline
                                }
                              />
                            </IonButton>
                          </>
                        ) : (
                          <IonInput
                            type={field.type}
                            value={formData[field.name] ?? ""}
                            placeholder={field.placeholder}
                            readonly={field.readonly}
                            onIonChange={(e) =>
                              handleInputChange(field.name, e.detail.value)
                            }
                          />
                        )}
                      </>
                    )}

                    {field.name === "birthdate" && (
                      <IonButton
                        slot="end"
                        fill="clear"
                        onClick={() => setCalendarOpen(true)}
                      >
                        <IonIcon icon={calendarOutline} />
                      </IonButton>
                    )}
                  </IonItem>
                </IonCol>
              </IonRow>
            ))}

            <IonRow className="ion-margin-top ion-justify-content-between">
              <IonCol size="6">
                <IonButton expand="block" className="cancel-button" onClick={handleCancel}>
                  Cancel
                </IonButton>
              </IonCol>

              <IonCol size="6">
                <IonButton
                  expand="block"
                  className="save-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </IonButton>
              </IonCol>
            </IonRow>
            </form>
            </div>
          
          </div>
       

          {showCalendarField && (
            <IonModal
              isOpen={calendarOpen}
              onDidDismiss={() => setCalendarOpen(false)}
            >
              <IonHeader>
                <IonToolbar color="primary">
                  <IonTitle>Select Date</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setCalendarOpen(false)}>
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>

              <IonContent>
                <IonDatetime
                  presentation="date"
                  value={formData.birthdate}
                  onIonChange={handleDateSelect}
                />
              </IonContent>
            </IonModal>
          )}

          <IonAlert
            isOpen={successAlert}
            onDidDismiss={() => setSuccessAlert(false)}
            header="Saved!"
            message="Your details have been updated."
            buttons={["OK"]}
          />

          <IonAlert
            isOpen={errorAlert.open || !!error}
            onDidDismiss={() =>
              setErrorAlert({ open: false, message: "" })
            }
            header="Error"
            message={errorAlert.message || error}
            buttons={["OK"]}
          />
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
}