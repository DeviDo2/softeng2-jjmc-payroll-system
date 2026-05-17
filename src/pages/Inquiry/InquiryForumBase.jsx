import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonImg,
  IonCard,
  IonCardContent,
  IonButton,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";
import "./InquiryForumBase.css";

import { useInquiryData } from "./actions.js/useInquiryData";
import { useInquiryActions } from "./actions.js/useInquiryActions";
import InquiryNotificationModal from "./InquiryForumComponents/InquiryNotificationPopup";
import InquiryList from "./InquiryForumComponents/InquiryList";
import AskInquiryForm from "./InquiryForumComponents/AskInquiryForm";
import InquiryThread from "./InquiryForumComponents/InquiryThread";
import InquiryReplyBox from "./InquiryForumComponents/InquiryReplyBox";
import useAuthRole from "../../hooks/useAuthRole";

export default function InquiryForumBase({ role: propRole }) {
  // auth & effective role
  const { user, role: authRole } = useAuthRole();
  const effectiveRole = propRole || authRole;

  // UI state
  const [view, setView] = useState("list"); // "list" | "ask" | "thread"
  const [activeInquiry, setActiveInquiry] = useState(null);

  // ask form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // reply box
  const [reply, setReply] = useState("");

  // modal / notification state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // "approve" | "reject" | null
  const [pendingMessageId, setPendingMessageId] = useState(null); // the message id to approve/reject
  const [rejectReason, setRejectReason] = useState(""); // optional reason from modal

  // data hooks
  const { inquiries: rawInquiries, messages, formatTS } = useInquiryData(
    effectiveRole,
    activeInquiry
  );

  // actions from hook
  const {
    handleSubmitInquiry,
    sendReplyToFirebase,
    handleApprove,
    handleReject,
  } = useInquiryActions();

  // filtered inquiries: bookkeeper sees all, client-staff sees only their own
  const inquiries = useMemo(() => {
    if (!rawInquiries) return [];
    if (effectiveRole === "bookkeeper") return rawInquiries;
    if (effectiveRole === "client-staff" && user?.uid) {
      return rawInquiries.filter((i) => i.createdBy === user.uid);
    }
    return rawInquiries;
  }, [rawInquiries, effectiveRole, user?.uid]);

  // when active inquiry disappears (deleted) go back to list
  useEffect(() => {
    if (!activeInquiry) return;
    const stillExists = rawInquiries?.some((i) => i.id === activeInquiry.id);
    if (!stillExists) {
      setActiveInquiry(null);
      setView("list");
    }
  }, [rawInquiries, activeInquiry]);

  // select an inquiry from the list
  const handleSelectInquiry = useCallback((inq) => {
    setActiveInquiry(inq);
    setView("thread");
  }, []);

  // open modal for approve/reject
  const triggerNotification = useCallback((type, messageId = null) => {
    setActionType(type);
    setPendingMessageId(messageId);
    setRejectReason("");
    setNotificationOpen(true);
  }, []);

  // modal confirm handler (called by modal with optional reason)
  const handleModalConfirm = useCallback(
    async (reason = null) => {
      if (!activeInquiry || !pendingMessageId || !actionType) {
        // nothing to do
        setNotificationOpen(false);
        setActionType(null);
        setPendingMessageId(null);
        return;
      }

      try {
        if (actionType === "approve") {
          await handleApprove(activeInquiry, pendingMessageId);
        } else if (actionType === "reject") {
          // pass reason if provided
          await handleReject(activeInquiry, pendingMessageId, reason || rejectReason);
        }
      } catch (err) {
        console.error("Modal action failed:", err);
        // optionally surface an error toast here
      } finally {
        setNotificationOpen(false);
        setActionType(null);
        setPendingMessageId(null);
        setRejectReason("");
      }
    },
    [activeInquiry, pendingMessageId, actionType, handleApprove, handleReject, rejectReason]
  );

  // send reply from the reply box component
  const handleSendReply = useCallback(async () => {
    if (!activeInquiry) return;
    if (!reply || !reply.trim()) return;

    try {
      // sendReplyToFirebase expects: { reply, activeInquiry, role }
      await sendReplyToFirebase({
        reply: reply.trim(),
        activeInquiry,
        role: effectiveRole,
      });
      setReply("");
      // Show notification modal for bookkeeper/admin about reply status
      if (effectiveRole === "bookkeeper" || effectiveRole === "admin") {
        setActionType("reply-sent");
        setNotificationOpen(true);
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
      // optionally show toast
    }
  }, [activeInquiry, reply, sendReplyToFirebase, effectiveRole]);

  // ask form submit
  const handleAskSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!title?.trim() || !body?.trim()) return;
      try {
        // handleSubmitInquiry signature assumed: (title, body, onSuccess, onError, ...) => Promise
        await handleSubmitInquiry(title.trim(), body.trim());
        setTitle("");
        setBody("");
        setView("list");
      } catch (err) {
        console.error("Failed to submit inquiry:", err);
      }
    },
    [title, body, handleSubmitInquiry]
  );

  return (
      <IonPage id="main-content">
        <IonContent fullscreen className="inquiry-forum-content">
          <IonImg
            src="/Gradient-Ellipses.png"
            alt="Ellipses"
            className="ellipse-bg"
          />

          <IonGrid >
            {/* TITLE */}
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="10" size-lg="8">
               
                <IonText>
                  <h1 className="forum-title">Forum</h1>
                  <p className="forum-subtitle">Got questions? Drop them below.</p>
                </IonText>
                
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol>
                <div className="forum-divider" />
                
              </IonCol>
            </IonRow>
            <div className="forum-card-container"></div>

            {/* LIST VIEW */}
            {view === "list" && (
              <IonCard className="forum-card">
                <IonCardContent>
                  {effectiveRole === "client-staff" && (
                    <IonButton
                      expand="block"
                      className="submit-button ion-margin-bottom"
                      onClick={() => setView("ask")}
                    >
                      Ask a Question
                    </IonButton>
                  )}

                  <InquiryList
                    inquiries={inquiries}
                    formatTS={formatTS}
                    onSelectInquiry={handleSelectInquiry}
                    role={effectiveRole}
                  />
                </IonCardContent>
              </IonCard>
            )}

            {/* ASK FORM */}
            {view === "ask" && (
              <AskInquiryForm
                title={title}
                body={body}
                setTitle={setTitle}
                setBody={setBody}
                onSubmit={handleAskSubmit}
                onCancel={() => {
                  setTitle("");
                  setBody("");
                  setView("list");
                }}
              />
            )}

            {/* THREAD VIEW */}
            {view === "thread" && activeInquiry && (
              <>
                <InquiryThread
                  inquiry={activeInquiry}
                  messages={messages}
                  role={effectiveRole}
                  formatTS={formatTS}
                  userId={user?.uid}
                  // triggerNotification is used by thread (e.g. when clicking approve/reject on a message)
                  triggerNotification={triggerNotification}
                  onBack={() => setView("list")}
                  currentUserId={user?.uid}
                />

                {/* Reply box for admins/bookkeepers and client follow-ups */}
                {(effectiveRole === "bookkeeper" || effectiveRole === "admin" ||
                  (effectiveRole === "client-staff" &&
                    activeInquiry?.createdBy === user?.uid &&
                    (activeInquiry?.status === "open" || activeInquiry?.status === "answered")
                  )
                ) && (
                  <InquiryReplyBox
                    reply={reply}
                    setReply={setReply}
                    activeInquiry={activeInquiry}
                    role={effectiveRole}
                    onSend={handleSendReply}
                    // optional: notify on success via modal or toast
                  />
                )}
              </>
            )}

            {/* APPROVE / REJECT POPUP (centralized modal) */}
            <InquiryNotificationModal
              role={effectiveRole}
              actionType={actionType}
              messageId={pendingMessageId}
              isOpen={notificationOpen}
              // when modal closed without confirm
              onDidDismiss={() => {
                setNotificationOpen(false);
                setActionType(null);
                setPendingMessageId(null);
                setRejectReason("");
              }}
              // modal passes an optional reason when confirming (e.g., a reject reason)
              onConfirm={(reasonFromModal) => {
                // reasonFromModal may be undefined (for approve), so we pass it along
                handleModalConfirm(reasonFromModal);
              }}
              // if your modal needs to control a local reject reason input, you can pass setter
              setRejectReason={setRejectReason}
              rejectReason={rejectReason}
            />
            
          </IonGrid>
        </IonContent>
        <FooterNav/>
      </IonPage>
  );
}
