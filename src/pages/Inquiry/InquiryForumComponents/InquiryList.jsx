import React from "react";
import { IonList, IonItem, IonLabel, IonBadge } from "@ionic/react";
import { auth } from "../../../database-components/firebaseConfig";

export default function InquiryList({
  inquiries = [],
  formatTS,
  onSelectInquiry,
  role = "client-staff",
}) {
  const currentUser = auth.currentUser;

  /**
   * VISIBILITY RULES (Refactored)
   * ---------------------------------------
   * admin → sees ALL inquiries
   * bookkeeper → sees ALL inquiries
   * client-staff → sees ONLY inquiries they created
   *
   * Note:
   * - Bookkeeper’s reply is not visible to client-staff until admin approves it.
   * - Once admin approves → inquiry.status becomes "answered"
   * - Client-staff can then open the inquiry and see the approved reply
   */

  const visibleInquiries = React.useMemo(() => {
    if (!inquiries || inquiries.length === 0) return [];

    if (role === "admin" || role === "bookkeeper") {
      return inquiries; // full access
    }

    if (role === "client-staff") {
      if (!currentUser) return [];
      return inquiries.filter(
        (inq) => inq.createdBy === currentUser.uid
      );
    }

    return [];
  }, [inquiries, role, currentUser]);


  // EMPTY STATE
  if (visibleInquiries.length === 0) {
    return (
      <p style={{ opacity: 0.6 }}>
        {role === "client-staff"
          ? "You haven't submitted any inquiries yet."
          : "No inquiries available."}
      </p>
    );
  }


  return (
    <IonList>
      {visibleInquiries.map((inq) => {
        const {
          id,
          title = "Untitled Inquiry",
          lastUpdated,
          status = "open",
          authorFirstName,
          authorLastName,
        } = inq;

        return (
          <IonItem key={id} button onClick={() => onSelectInquiry(inq)}>
            <IonLabel>
              <h2>{title}</h2>

              {/* Show asker name only for admin or bookkeeper */}
              {role !== "client-staff" && (
                <p>
                  <strong>Asked by:</strong> {authorFirstName} {authorLastName}
                </p>
              )}

              <p>Last updated: {formatTS(lastUpdated)}</p>
            </IonLabel>

            <IonBadge
              color={
                status === "answered"
                  ? "success"
                  : status === "pending-admin"
                  ? "warning"
                  : status === "rejected"
                  ? "danger"
                  : "medium"
              }
            >
              {status}
            </IonBadge>
          </IonItem>
        );
      })}
    </IonList>
  );
}
