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
        if (actionType === "reply-sent") {
          cfg.header = "Reply submitted!";
          cfg.subtitle = "Awaiting your review.";
        } else {
          const isApprove = actionType === "approve";
          cfg.showConfirm = true;
          cfg.header = isApprove ? "Approve this response?" : "Reject this response?";
          cfg.subtitle = isApprove
            ? "Approving will make this reply visible to the client."
            : "Rejecting will hide this reply from the client (a reason is optional).";
          cfg.confirmLabel = isApprove ? "Approve" : "Reject";
        }
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
      <div style={{ padding: "12px 16px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <IonIcon icon={mailOutline} style={{ fontSize: 32 }} />
        </div>

        <IonText>
          <h2 style={{ margin: "4px 0 6px", fontSize: "1.1rem" }}>{header}</h2>
        </IonText>

        {subtitle ? <p style={{ marginTop: 4, fontSize: "0.9rem" }}>{subtitle}</p> : null}

        {messageId ? (
          <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Message ID: {messageId}</p>
        ) : null}

        {isAdminConfirm && actionType === "reject" && (
          <div style={{ marginTop: 10 }}>
            <IonTextarea
              placeholder="Optional rejection reason (client won't see internal notes if left blank)"
              value={rejectReason}
              onIonChange={(e) => setRejectReason(e.detail.value)}
              rows={3}
            />
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          {isAdminConfirm ? (
            <>
              <IonButton
                expand="block"
                onClick={handleConfirm}
                disabled={submitting}
                style={{ marginBottom: 6 }}
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
