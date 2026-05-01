// InquiryNotificationModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import { IonModal, IonButton, IonIcon, IonText, IonTextarea } from "@ionic/react";
import { mailOutline } from "ionicons/icons";
import "./InquiryNotificationModal.css"; // optional, you can keep your styles

/**
 * Props:
 * - role: "client-staff" | "bookkeeper" | "admin"
 * - actionType: null | "approve" | "reject"
 * - isOpen: boolean
 * - onDidDismiss: () => void
 * - onConfirm: (reason?: string) => void   // reason only used for reject
 * - messageId: optional, for context (display only)
 */
export default function InquiryNotificationModal({
  role = "client-staff",
  actionType = null,
  isOpen = false,
  onDidDismiss = () => {},
  onConfirm = () => {},
  messageId = null,
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Decide which UI variant to show
  const { header, subtitle, showConfirm, confirmLabel } = useMemo(() => {
    let cfg = {
      header: "Notification",
      subtitle: "",
      showConfirm: false,
      confirmLabel: "Confirm",
    };

    switch (role) {
      case "client-staff":
        cfg.header = "Your question has been submitted!";
        cfg.subtitle = "We’ll get back to you soon.";
        break;
      case "bookkeeper":
        cfg.header = "Reply saved!";
        cfg.subtitle = "It will appear after admin approval (if required).";
        break;
      case "admin": {
        const isApprove = actionType === "approve";
        cfg.showConfirm = true;
        cfg.header = isApprove ? "Approve this response?" : "Reject this response?";
        cfg.subtitle = isApprove
          ? "Approving will make this reply visible to the client."
          : "Rejecting will hide this reply from the client (a reason is optional).";
        cfg.confirmLabel = isApprove ? "Approve" : "Reject";
        break;
      }
      default:
        break;
    }

    return cfg;
  }, [role, actionType]);

  // reset reason when opening/closing
  useEffect(() => {
    if (!isOpen) setRejectReason("");
  }, [isOpen]);

  const handleConfirm = async () => {
    // If the confirm action requires a reason (reject), pass it.
    setSubmitting(true);
    try {
      if (actionType === "reject") {
        await onConfirm(rejectReason?.trim());
      } else {
        await onConfirm(); // approve or other confirm
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminConfirm = role === "admin" && showConfirm;

  return (
    <IonModal isOpen={!!isOpen} onDidDismiss={onDidDismiss} cssClass="notification-modal">
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <IonIcon icon={mailOutline} style={{ fontSize: 44 }} />
        </div>

        <IonText>
          <h2 style={{ margin: "6px 0 8px" }}>{header}</h2>
        </IonText>

        {subtitle ? <p style={{ marginTop: 0 }}>{subtitle}</p> : null}

        {messageId ? (
          <p style={{ color: "#666", fontSize: 13, marginTop: 8 }}>Message ID: {messageId}</p>
        ) : null}

        {isAdminConfirm && actionType === "reject" && (
          <div style={{ marginTop: 14 }}>
            <IonTextarea
              placeholder="Optional rejection reason (client won't see internal notes if you leave blank depending on config)"
              value={rejectReason}
              onIonChange={(e) => setRejectReason(e.detail.value)}
              rows={4}
            />
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          {isAdminConfirm ? (
            <>
              <IonButton
                expand="block"
                onClick={handleConfirm}
                disabled={submitting}
                style={{ marginBottom: 8 }}
              >
                {confirmLabel}
              </IonButton>

              <IonButton className="cancel-button"  onClick={onDidDismiss}>
                Cancel
              </IonButton>
            </>
          ) : (
            <IonButton expand="block" onClick={onDidDismiss}>
              OK
            </IonButton>
          )}
        </div>
      </div>
    </IonModal>
  );
}
