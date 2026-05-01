// ===============================
// InquiryForumAdmin.jsx (REFACTORED)
// ===============================

import React from "react";
import { IonApp, IonPage, IonContent } from "@ionic/react";

import Sidebar from "../../components/Sidebar";
import InquiryForumBase from "../Inquiry/InquiryForumBase";

export default function InquiryForumAdmin() {
  return (
    <IonApp>
      <Sidebar />
      <IonPage>
        <IonContent fullscreen className="inquiry-admin-content">
          {/* Directly render base forum with admin role */}
          <InquiryForumBase role="admin" />
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
