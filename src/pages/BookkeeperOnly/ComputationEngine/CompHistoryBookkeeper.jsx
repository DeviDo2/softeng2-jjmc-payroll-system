import React, { useEffect, useState, useMemo } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  IonBadge,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonNote,
  IonImg,
} from "@ionic/react";
import { eyeOutline, arrowBackOutline, sendOutline, closeOutline, checkmarkCircleOutline, informationCircleOutline, lockClosedOutline } from "ionicons/icons";

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../database-components/firebaseConfig";
import useAuthRole from "../../../hooks/useAuthRole";
import { useHistory } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import "./CompHistoryBookkeeper.css";

// --- HELPER FUNCTIONS ---

// Helper function to standardize status badges (Matches UI requirement for 'sent_to_client' status)
const getStatusBadgeProps = (status) => {
  switch (status) {
    case "approved":
      return { color: "success", text: "APPROVED" };
    case "pending_approval":
      return { color: "warning", text: "PENDING APPROVAL" };
    case "revised":
    case "needs_revision":
      return { color: "danger", text: (status?.toUpperCase() || 'NEEDS REVISION').replace('_', ' ') };
    case "disputed":
      return { color: "tertiary", text: "DISPUTED" };
    case "sent_to_client":
      // <<< NEW STATUS: Matches the status written by confirmSendToClient and allowed by Rules >>>
      return { color: "primary", text: "SENT TO CLIENT" }; 
    default:
      return { color: "medium", text: status?.toUpperCase() || "DRAFT" };
  }
};

// Helper function to format currency
const formatCurrency = (amount) => {
  // Use a safe numeric value (defaults to 0 if input is invalid)
  const numericAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(numericAmount);
};

const formatDisplayDate = (value) => {
  const dateValue = value?.toDate?.() || (value ? new Date(value) : null);

  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return "Unknown";
  }

  return dateValue.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateValue = (value) => {
  const dateValue = value?.toDate?.() || (value ? new Date(value) : null);

  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue;
};

const getLatestDraftActivityTime = (draft) => {
  const candidateDates = [
    getDateValue(draft?.lastSentAt),
    getDateValue(draft?.updatedAt),
    getDateValue(draft?.createdAt),
  ].filter(Boolean);

  if (candidateDates.length === 0) {
    return 0;
  }

  return Math.max(...candidateDates.map((date) => date.getTime()));
};

const normalize = (value) =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const getFullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const sameValue = (left, right) =>
  normalize(left) && normalize(left) === normalize(right);

const findMatchingStaff = (employeeData, clientStaffAccounts) => {
  return clientStaffAccounts.find((staff) => (
    sameValue(employeeData.clientStaffId, staff.id) ||
    sameValue(employeeData.userId, staff.id) ||
    sameValue(employeeData.employeeUserId, staff.id) ||
    sameValue(employeeData.taxId || employeeData.taxIdNumber, staff.taxId || staff.taxIdNumber) ||
    sameValue(employeeData.employeeCode, staff.employeeCode) ||
    sameValue(employeeData.email || employeeData.employeeEmail, staff.email) ||
    sameValue(employeeData.name, getFullName(staff))
  ));
};

const loadClientStaffAccounts = async (companyName) => {
  if (!companyName) return [];

  try {
    const staffQuery = query(
      collection(db, "users"),
      where("company", "==", companyName)
    );
    const snapshot = await getDocs(staffQuery);

    return snapshot.docs
      .map((staffDoc) => ({ id: staffDoc.id, ...staffDoc.data() }))
      .filter((staff) => staff.role?.toLowerCase() === "client-staff");
  } catch (error) {
    console.warn("Could not load client staff accounts for payroll matching:", error);
    return [];
  }
};

// --- COMPONENT START ---

function CompHistoryBookkeeper() {
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [draftToSend, setDraftToSend] = useState(null);
  // Tracks if the bookkeeper has physically reviewed the draft before sending
  const [viewedDrafts, setViewedDrafts] = useState(new Set()); 

  const { user } = useAuthRole();
  const history = useHistory();

  // Fetch ONLY drafts for this bookkeeper
  useEffect(() => {
    if (!user?.uid) {
      console.log("Waiting for user...");
      return;
    }

    const fetchDrafts = async () => {
      try {
        // Only fetch documents where bookkeeperId matches the current user's UID (Required by rules)
        const q = query(
          collection(db, "clientPayrollDrafts"),
          where("bookkeeperId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);
        
        const draftsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setDrafts(draftsData);
      } catch (error) {
        console.error("Error fetching drafts:", error);
        setAlertMessage("Failed to load drafts: " + error.message);
        setShowAlert(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrafts();
  }, [user?.uid]);

  // Filter drafts based on status and search
  const filteredDrafts = useMemo(() => {
    let filtered = [...drafts];

    if (statusFilter === "pending_approval") {
      filtered = filtered.filter(draft => draft.status === "pending_approval");
    } else if (statusFilter === "approved") {
      filtered = filtered.filter(draft => draft.status === "approved");
    } else if (statusFilter === "sent") { 
      // NEW FILTER OPTION for the sent_to_client status
      filtered = filtered.filter(draft => draft.status === "sent_to_client");
    } else if (statusFilter === "revised") {
      filtered = filtered.filter(draft => 
        draft.status === "revised" || draft.status === "needs_revision"
      );
    } else if (statusFilter === "disputed") {
      filtered = filtered.filter(draft => draft.status === "disputed");
    } else if (statusFilter === "draft") {
      filtered = filtered.filter(draft => draft.status === "draft");
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(draft =>
        draft.clientName?.toLowerCase().includes(term) ||
        draft.data?.[0]?.name?.toLowerCase().includes(term)
      );
    }

    filtered.sort(
      (left, right) => getLatestDraftActivityTime(right) - getLatestDraftActivityTime(left)
    );

    return filtered;
  }, [drafts, statusFilter, searchTerm]);

  // Handle view draft with actual data preview
  const handleViewDraft = (draft) => {
    setSelectedDraft(draft);
    setShowPreviewModal(true);
    
    // CRITICAL LOGIC: Marks draft as viewed for send permission (matches handleSendToClient validation)
    if (draft.status === "approved") {
      setViewedDrafts(prev => new Set(prev).add(draft.id));
    }
  };

  // Handle send to client with validation
  const handleSendToClient = (draft) => {
    // 1. Validate draft status (Required by Firestore Rules to be 'approved' for the update)
    if (draft.status !== "approved") {
      setAlertMessage(`Only approved computations can be sent to clients. Current status: ${getStatusBadgeProps(draft.status).text}`);
      setShowAlert(true);
      return;
    }

    // 2. Validate that draft has been viewed (Client-side quality control/internal rule)
    if (!viewedDrafts.has(draft.id)) {
      setAlertMessage("Please view the computation details first before sending to client. Click the 'View Full Data' button to review the computation.");
      setShowAlert(true);
      return;
    }

    setDraftToSend(draft);
    setShowSendConfirmation(true);
  };

  // Confirm send to client
  const confirmSendToClient = async () => {
    if (!draftToSend) return;

    try {
      const draftRef = doc(db, "clientPayrollDrafts", draftToSend.id);
      
      // FIRESTORE WRITE 1: Update the draft status (Bookkeeper action record)
      await updateDoc(draftRef, {
        sentToClient: true,
        sentAt: serverTimestamp(),
        sendCount: (draftToSend.sendCount || 0) + 1,
        lastSentBy: user.uid, 
        lastSentAt: serverTimestamp(),
        clientVisible: true, 
        status: "sent_to_client" // CRITICAL FIELD for bookkeeper history status
      });

      // --- CRITICAL ADDITION FOR CLIENT DATA FLOW ---

      // FIRESTORE WRITE 2: Add the data to the client-facing 'computationResults' collection.
      // This write CREATES the new pay stub record that the client's components listen to.
      // The client's CurrentComputation and ComputationHistory components will automatically update.
      const computationResultsRef = collection(db, "computationResults");
      
      // Extract the relevant fields for the *client's* single-employee view.
      // Assuming draftToSend.data is an array of employee computations.
      // This logic will need refinement if 'computationResults' should store 
      // one document per employee, but for simplicity, we'll iterate over all.
      // IMPORTANT: In a multi-employee scenario, each employee's result must be a separate document 
      // for the client to view their own single pay slip (as implied by previous client-side components).
      
      const successfulComputations = [];
      const clientStaffAccounts = await loadClientStaffAccounts(draftToSend.clientName);
      
      for (const employeeData of draftToSend.data) {
          // The structure of the client-side component (CurrentComputation) expects a single pay slip object.
          // We must ensure the client's UID is correctly mapped to the computation.
          
          // CRITICAL: We need a field linking the employee (client staff) to their payroll, 
          // typically their UID, which is missing from the draft data, assuming `draftToSend.data`
          // is just the raw payroll data.
          // For now, we assume this payroll draft is for the *client business* (client admin user), 
          // which is the user in your previous client-side components (useAuthRole). 
          
          const matchedStaff = findMatchingStaff(employeeData, clientStaffAccounts);
          const matchedStaffId =
              matchedStaff?.id ||
              employeeData.clientStaffId ||
              employeeData.userId ||
              employeeData.employeeUserId ||
              null;

          const resultDoc = await addDoc(computationResultsRef, {
              ...employeeData,
              clientId: matchedStaffId || draftToSend.clientId,
              clientCompanyId: draftToSend.clientId,
              clientName: draftToSend.clientName,
              company: draftToSend.clientName,
              bookkeeperId: user.uid,
              clientStaffId: matchedStaffId,
              userId: matchedStaffId,
              employeeUserId: matchedStaffId,
              employeeEmail: matchedStaff?.email || employeeData.email || employeeData.employeeEmail || "",
              taxId: employeeData.taxId || employeeData.taxIdNumber || matchedStaff?.taxId || matchedStaff?.taxIdNumber || "",
              taxIdNumber: employeeData.taxIdNumber || employeeData.taxId || matchedStaff?.taxIdNumber || matchedStaff?.taxId || "",
              createdAt: serverTimestamp(),
              sourceDraftId: draftToSend.id,
              employeeId: matchedStaffId || employeeData.employeeId || employeeData.employeeCode || "N/A",
          });
          successfulComputations.push({
              id: resultDoc.id,
              staffId: matchedStaffId,
          });
      }


      // FIRESTORE WRITE 3: Create notification. Allowed by the notification create rule for bookkeepers.
      const period = draftToSend.monthYear || 
                     draftToSend.createdAt?.toDate?.().toLocaleDateString() || 
                     'this period';

      const notificationsRef = collection(db, "notifications");
      const computationIdsByStaff = successfulComputations.reduce((targets, computation) => {
        if (!computation.staffId) return targets;
        const existingIds = targets.get(computation.staffId) || [];
        targets.set(computation.staffId, [...existingIds, computation.id]);
        return targets;
      }, new Map());

      await Promise.all(
        [...computationIdsByStaff.entries()].map(([staffId, computationResultIds]) =>
          addDoc(notificationsRef, {
            userId: staffId,
            type: "computation_ready",
            message: `Your payroll computation for ${period} is ready for review`,
            computationId: draftToSend.id,
            computationResultIds,
            clientName: draftToSend.clientName,
            bookkeeperName: user.firstName || user.email,
            read: false,
            createdAt: serverTimestamp()
          })
        )
      );

      setAlertMessage(`Computation for ${draftToSend.clientName} sent to client successfully! (${successfulComputations.length} employee records created, ${computationIdsByStaff.size} staff notified)`);
      setShowAlert(true);
      
      // Update local state to reflect 'sent_to_client' status
      setDrafts(prev => prev.map(draft => 
        draft.id === draftToSend.id 
          ? { 
              ...draft, 
              sentToClient: true, 
              sendCount: (draft.sendCount || 0) + 1,
              lastSentAt: new Date(),
              clientVisible: true,
              status: "sent_to_client" // Update status locally
          }
          : draft
      ));

      if (Array.isArray(draftToSend.disputeIds) && draftToSend.disputeIds.length > 0) {
        const batch = writeBatch(db);
        draftToSend.disputeIds.forEach((disputeId) => {
          batch.update(doc(db, "computationDisputes", disputeId), {
            status: "resolved",
            resolvedAt: serverTimestamp(),
            deliveredAt: serverTimestamp(),
            deliveredDraftId: draftToSend.id,
            deliveredBy: user.uid,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

    } catch (error) {
      console.error("Error sending to client:", error);
      setAlertMessage("Failed to send computation to client: " + error.message);
      setShowAlert(true);
    } finally {
      setShowSendConfirmation(false);
      setDraftToSend(null);
    }
  };

  // Get send button properties based on draft status and view state
  const getSendButtonProps = (draft) => {
    const hasBeenViewed = viewedDrafts.has(draft.id);
    const sendCount = draft.sendCount || 0;

    if (draft.status !== "approved") {
      // Disabled if not approved (enforces validation before attempting write that will fail the rules)
      return {
        disabled: true,
        fill: "outline",
        color: "medium",
        tooltip: `Cannot send - Status: ${getStatusBadgeProps(draft.status).text}`
      };
    }

    if (!hasBeenViewed) {
      // Disabled if not viewed (enforces internal QC rule)
      return {
        disabled: true,
        fill: "outline",
        color: "warning",
        tooltip: "View computation first before sending"
      };
    }

    return {
      disabled: false,
      fill: "solid",
      color: "primary",
      tooltip: sendCount > 0 ? `Send again (previously sent ${sendCount} times)` : "Send to client"
    };
  };

  // Get send confirmation message
  const getSendConfirmationMessage = () => {
    if (!draftToSend) return "";
    
    const sendCount = draftToSend.sendCount || 0;
    
    if (sendCount > 0) {
      return `Are you sure you want to send this computation to ${draftToSend.clientName}? 
              
You have already sent this computation ${sendCount} time${sendCount !== 1 ? 's' : ''} before.

Please confirm you want to send it again.`;
    }
    
    return `Are you sure you want to send this computation to ${draftToSend.clientName}?`;
  };

  // Handle not logged in state
  if (!user) {
    return (
      <IonPage id="main-content">
        <IonContent className="ion-padding">
          <div className="ion-text-center">
            <IonText color="danger">
              <h2>Not Logged In</h2>
              <p>Please log in to view computation history.</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Calculate status counts for filter options
  const getCount = (status) => drafts.filter(d => d.status === status).length;
  const getDisputedCount = getCount('disputed');
  const getRevisedCount = getCount('revised') + getCount('needs_revision');

  return (
    <>
      <Sidebar />
    <IonPage id="main-content">
          <IonContent fullscreen className="comp-history-content">
          <IonImg src="/Gradient-Ellipses.png" alt="BG" className="ellipse-bg" />
          <div className="comp-history-header">
            <IonGrid>
              <IonRow>
                  <IonCol>
                    <IonText>
                      <h1 className="comp-history-title">Computation History</h1>
                      <p className="comp-history-subtitle">
                        Review computation drafts, track approval status, and send approved payroll to clients.
                      </p>
                    </IonText>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          <div className="comp-history-panel">
            <IonGrid>
              
              <IonRow>
                <IonCol>
                  <IonCard className="comp-history-section-card comp-history-filter-card">
                    <IonCardContent>
                      <IonRow>
                        <IonCol className="ion-text-left" size="12" sizeMd="7">
                          <IonSearchbar
                            className="comp-history-searchbar"
                            value={searchTerm}
                            placeholder="Search by client name..."
                            onIonInput={(e) => setSearchTerm(e.detail.value)}
                          />
                        </IonCol>
                        <IonCol className="ion-text-left" size="12" sizeMd="5">
                          <IonSelect
                            className="comp-history-select"
                            value={statusFilter}
                            onIonChange={(e) => setStatusFilter(e.detail.value)}
                            label="Filter by status"
                            labelPlacement="stacked"
                          >
                            <IonSelectOption value="all">All Drafts ({drafts.length})</IonSelectOption>
                            <IonSelectOption value="approved">Approved ({getCount('approved')})</IonSelectOption>
                            <IonSelectOption value="sent">Sent to Client ({getCount('sent_to_client')})</IonSelectOption>
                            <IonSelectOption value="pending_approval">Pending Approval ({getCount('pending_approval')})</IonSelectOption>
                            <IonSelectOption value="disputed">Disputed ({getDisputedCount})</IonSelectOption>
                            <IonSelectOption value="revised">Needs Revision ({getRevisedCount})</IonSelectOption>
                          </IonSelect>
                        </IonCol>
                      </IonRow>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {isLoading && (
                <IonRow>
                  <IonCol className="ion-text-center">
                    <div className="comp-history-loading">
                      <IonSpinner name="crescent" />
                      <IonText><p>Loading your drafts...</p></IonText>
                    </div>
                  </IonCol>
                </IonRow>
              )}

              {!isLoading && (
                <>
                  

                  {filteredDrafts.length === 0 ? (
                    <IonRow>
                      <IonCol>
                        <IonCard className="comp-history-empty-card">
                          <IonCardContent className="ion-text-center">
                            <IonText>
                              <h4>No drafts found</h4>
                              <p>
                                {drafts.length === 0
                                  ? "You don't have any computation drafts yet."
                                  : "No drafts match the selected filter."}
                              </p>
                            </IonText>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    </IonRow>
                  ) : (
                    <div className="draft-history-list">
                      {filteredDrafts.map((draft) => {
                        const hasBeenViewed = viewedDrafts.has(draft.id);
                        const sendCount = draft.sendCount || 0;
                        const sendButtonProps = getSendButtonProps(draft);
                        const statusProps = getStatusBadgeProps(draft.status);

                        return (
                          <IonCard key={draft.id} className="draft-history-card">
                            <IonCardContent>
                              <div className="draft-history-card-grid">
                                <div className="draft-history-main">
                                  <div className="draft-history-topline">
                                    <h3 className="draft-history-title">{draft.clientName || "Unknown Client"}</h3>
                                    <IonBadge color={statusProps.color} className="draft-history-status-badge">
                                      {statusProps.text}
                                    </IonBadge>
                                  </div>

                                  <div className="draft-history-meta">
                                    <span>{draft.data?.length || 0} employee{(draft.data?.length || 0) !== 1 ? "s" : ""}</span>
                                    <span>Created {formatDisplayDate(draft.createdAt)}</span>
                                    <span>Updated {formatDisplayDate(draft.updatedAt || draft.createdAt)}</span>
                                  </div>

                                  {draft.sentToClient && (
                                    <p className="draft-history-note draft-history-note-success">
                                      Sent to client {sendCount} time{sendCount !== 1 ? "s" : ""}
                                      {draft.lastSentAt && ` • Last sent ${formatDisplayDate(draft.lastSentAt)}`}
                                    </p>
                                  )}

                                  {draft.status === "approved" && hasBeenViewed && (
                                    <IonNote color="success" className="draft-history-note draft-history-note-success">
                                      <IonIcon icon={checkmarkCircleOutline} /> Ready to send
                                    </IonNote>
                                  )}

                                  {draft.status === "approved" && !hasBeenViewed && (
                                    <IonNote color="warning" className="draft-history-note draft-history-note-warning">
                                      <IonIcon icon={eyeOutline} /> View required before sending
                                    </IonNote>
                                  )}

                                  {draft.status !== "approved" && draft.status !== "sent_to_client" && (
                                    <IonNote color="medium" className="draft-history-note">
                                      <IonIcon icon={lockClosedOutline} /> {draft.status === "pending_approval" ? "Awaiting approval" : "Cannot send yet"}
                                    </IonNote>
                                  )}

                                  {draft.status === "disputed" && (draft.disputeReason || draft.revisionNotes) && (
                                    <p className="draft-history-note draft-history-note-warning">
                                      Dispute note: {draft.disputeReason || draft.revisionNotes}
                                    </p>
                                  )}
                                </div>

                                <div className="draft-history-actions">
                                  <IonButton
                                    expand="block"
                                    fill="outline"
                                    className="draft-history-action-btn"
                                    onClick={() => handleViewDraft(draft)}
                                  >
                                    <IonIcon icon={eyeOutline} slot="start" />
                                    View{hasBeenViewed ? " Again" : " Full Data"}
                                  </IonButton>

                                  <IonButton
                                    expand="block"
                                    className="draft-history-action-btn"
                                    onClick={() => handleSendToClient(draft)}
                                    disabled={sendButtonProps.disabled}
                                    fill={sendButtonProps.fill}
                                    color={sendButtonProps.color}
                                    title={sendButtonProps.tooltip}
                                  >
                                    <IonIcon icon={sendOutline} slot="start" />
                                    Send{sendCount > 0 ? ` (${sendCount})` : ""}
                                  </IonButton>

                                  {draft.status === "disputed" && (
                                    <IonButton
                                      expand="block"
                                      color="primary"
                                      className="draft-history-action-btn"
                                      onClick={() => history.push(`/bookkeeper-computation-engine?clientId=${draft.clientId || draft.clientCompanyId || ''}&clientName=${encodeURIComponent(draft.clientName || '')}`)}
                                    >
                                      <IonIcon icon={informationCircleOutline} slot="start" />
                                      Recompute
                                    </IonButton>
                                  )}
                                </div>
                              </div>
                            </IonCardContent>
                          </IonCard>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </IonGrid>
          </div>
        </IonContent>

      {/* Full Data Preview Modal */}
      <IonModal className="draft-preview-modal" isOpen={showPreviewModal} onDidDismiss={() => setShowPreviewModal(false)}>
        <IonHeader>
          <IonToolbar className="draft-preview-toolbar">
            <IonButton slot="start" fill="clear" onClick={() => setShowPreviewModal(false)}>
              <IonIcon icon={closeOutline} />
            </IonButton>
            <IonTitle>
              {selectedDraft?.clientName} - Complete Payroll Data
            </IonTitle>
            {selectedDraft?.status === "approved" && (
              <IonButton 
                className="draft-action-btn draft-action-btn--send"
                slot="end" 
                fill="solid"
                color="primary"
                onClick={() => {
                  // This button triggers the send validation (handleSendToClient)
                  handleSendToClient(selectedDraft);
                  setShowPreviewModal(false);
                }}
              >
                <IonIcon icon={sendOutline} slot="start" />
                Send to Client
              </IonButton>
            )}
          </IonToolbar>
        </IonHeader>
        <IonContent className="draft-preview-content">
          {selectedDraft && (
            <div className="draft-preview-shell">
              <IonGrid className="draft-preview-grid">
              <IonRow>
                <IonCol>
                    <IonCard className="draft-preview-summary-card">
                      <IonCol>
                        <IonText>
                              <div className="draft-preview-summary-title">
                                <h3>Computation Summary</h3>
                              </div>
                        </IonText>
                      </IonCol>
                    <IonCardContent>
                      <IonCol>
                        <IonRow size="12" sizeMd="6" className="draft-preview-summary-row">
                          <IonText>
                            <IonCol className="ion-col-padding">
                              <IonRow size="12" sizeMd="6">
                                <p><strong>Client:</strong> {selectedDraft.clientName}</p>
                              </IonRow>
                              <IonRow size="12" sizeMd="6">
                                <p>
                                  <strong>Status: </strong>
                                  <span className={`draft-preview-status-pill status-${selectedDraft?.status || "draft"}`}>
                                    {getStatusBadgeProps(selectedDraft?.status).text}
                                  </span>
                                </p>
                              </IonRow>
                              <IonRow size="12" sizeMd="6">
                                <p><strong>Total Employees:</strong> {selectedDraft.data?.length || 0}</p>
                              </IonRow>
                              <IonRow size="12" sizeMd="6">
                                <p>
                                  <strong>Created:</strong> {selectedDraft.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}
                                </p>
                              </IonRow>
                              {selectedDraft.sentToClient && (
                                <IonRow size="12" sizeMd="6">
                                  <p><strong>Last Sent:</strong> {selectedDraft.lastSentAt?.toDate?.().toLocaleDateString() || "Previously sent"}</p>
                                </IonRow>
                              )}
                            </IonCol>
                          </IonText>
                        </IonRow>
                      </IonCol>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              
              {/* Complete Employee Data Table */}
                <IonRow>
                  <IonCol>
                    
                    <div className="draft-preview-table-shell">
                      <table className="draft-preview-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Department</th>
                            <th>Rate/Hour</th>
                            <th>Hours</th>
                            <th>Gross Pay</th>
                            <th>SSS</th>
                            <th>PHIC</th>
                            <th>HDMF</th>
                            <th>BIR Tax</th>
                            <th>Total Deductions</th>
                            <th>Net Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                        {selectedDraft.data?.map((employee, index) => {
                          const totalDeductions = (employee.sss || 0) + (employee.philHealth || employee.phic || 0) + (employee.pagIbig || employee.hdmf || 0) + (employee.tax || employee.bir || 0);
                          
                          return (
                            <tr key={index}>
                              <td>{employee.name || 'N/A'}</td>
                              <td>{employee.employeeCode || 'N/A'}</td>
                              <td>{employee.department || 'N/A'}</td>
                              <td>{formatCurrency(employee.ratePerHour)}</td>
                              <td>{employee.hoursWorked || 'N/A'}</td>
                              <td className="draft-preview-cell-strong">{formatCurrency(employee.grossPay)}</td>
                              <td className="draft-preview-cell-negative">{formatCurrency(employee.sss)}</td>
                              <td className="draft-preview-cell-negative">{formatCurrency(employee.philHealth || employee.phic)}</td>
                              <td className="draft-preview-cell-negative">{formatCurrency(employee.pagIbig || employee.hdmf)}</td>
                              <td className="draft-preview-cell-negative">{formatCurrency(employee.tax || employee.bir)}</td>
                              <td className="draft-preview-cell-negative draft-preview-cell-strong">
                                {formatCurrency(totalDeductions)}
                              </td>
                              <td className="draft-preview-cell-positive draft-preview-cell-strong">
                                {formatCurrency(employee.netPay)}
                              </td>
                            </tr>
                          );
                        })}
                        {!selectedDraft.data || selectedDraft.data.length === 0 ? (
                          <tr>
                              <td colSpan="12" className="draft-preview-empty-row">
                              No employee data available
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* Send Confirmation Alert */}
      <IonAlert
        isOpen={showSendConfirmation}
        onDidDismiss={() => setShowSendConfirmation(false)}
        header="Send to Client"
        message={getSendConfirmationMessage()}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              setShowSendConfirmation(false);
              setDraftToSend(null);
            }
          },
          {
            text: 'Send',
            role: 'confirm',
            handler: () => {
              confirmSendToClient(); // Calls the function that performs the database writes
            }
          }
        ]}
      />

      {/* Information Alert */}
      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header="Information"
        message={alertMessage}
        buttons={["OK"]}
      />
        <FooterNav />
    </IonPage>
    </>
  );
}

export default CompHistoryBookkeeper;
