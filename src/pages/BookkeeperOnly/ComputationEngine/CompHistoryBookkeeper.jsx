import React, { useEffect, useState, useMemo } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
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
} from "firebase/firestore";

import { db } from "../../../database-components/firebaseConfig";
import useAuthRole from "../../../hooks/useAuthRole";
import { useHistory } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";

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
    let filtered = drafts;

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
  const getRevisedCount = getCount('revised') + getCount('needs_revision');

  return (
    <>
      <Sidebar />
    <IonPage id="main-content">
      <IonHeader>
        <IonToolbar color="primary">
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Computation History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h2>Your Computation Drafts</h2>
          <p>Manage your payroll computation drafts</p>
        </IonText>

        {/* Instructions Card */}
        <IonCard color="light">
          <IonCardContent>
            <IonText>
              <h4>
                <IonIcon icon={informationCircleOutline} color="primary" /> 
                Sending Instructions:
              </h4>
              <ul style={{ paddingLeft: '20px', marginBottom: '0' }}>
                <li>Only **approved** computations can be sent to clients</li>
                <li>You must **view the computation details** first before sending</li>
                <li>Click 'View Full Data' to review the computation before sending</li>
                <li>Multiple sends are allowed but require confirmation</li>
              </ul>
            </IonText>
          </IonCardContent>
        </IonCard>

        {/* Status Legend */}
        <IonCard color="secondary">
          <IonCardContent>
            <IonText>
              <h5>Status Legend:</h5>
              <center>
                <IonBadge color="success">APPROVED</IonBadge> - Ready to send
                {' '}
                <IonBadge color="primary">SENT TO CLIENT</IonBadge> - View only
                {' '}
                <IonBadge color="warning">PENDING APPROVAL</IonBadge> - Waiting for approval
                {' '}
                <IonBadge color="danger">NEEDS REVISION</IonBadge> - Requires changes
              </center>
            </IonText>
          </IonCardContent>
        </IonCard>

        {/* Search and Filter */}
        <IonSearchbar
          value={searchTerm}
          placeholder="Search by client name..."
          onIonInput={(e) => setSearchTerm(e.detail.value)}
          style={{ marginBottom: '16px' }}
        />

        <IonSelect
          value={statusFilter}
          onIonChange={(e) => setStatusFilter(e.detail.value)}
          label="Filter by status:"
          labelPlacement="stacked"
          style={{ marginBottom: '16px', width: '100%' }}
        >
          <IonSelectOption value="all">All Drafts ({drafts.length})</IonSelectOption>
          <IonSelectOption value="approved">Approved ({getCount('approved')})</IonSelectOption>
          <IonSelectOption value="sent">Sent to Client ({getCount('sent_to_client')})</IonSelectOption> {/* Matches new status filter */}
          <IonSelectOption value="pending_approval">Pending Approval ({getCount('pending_approval')})</IonSelectOption>
          <IonSelectOption value="revised">Needs Revision ({getRevisedCount})</IonSelectOption>
          <IonSelectOption value="draft">Drafts ({getCount('draft')})</IonSelectOption>
        </IonSelect>

        {/* Loading State */}
        {isLoading && (
          <div className="ion-text-center">
            <IonSpinner name="crescent" />
            <IonText><p>Loading your drafts...</p></IonText>
          </div>
        )}

        {/* Drafts List */}
        {!isLoading && (
          <>
            <IonText>
              <h3>
                {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''} found
                {statusFilter !== "all" && ` (${statusFilter.toUpperCase().replace('_', ' ')})`}
              </h3>
            </IonText>

            {filteredDrafts.length === 0 ? (
              <IonCard color="warning">
                <IonCardContent className="ion-text-center">
                  <IonText>
                    <h4>No drafts found</h4>
                    <p>
                      {drafts.length === 0 
                        ? "You don't have any computation drafts yet." 
                        : `No drafts match the selected filter.`
                      }
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            ) : (
              <IonList>
                {filteredDrafts.map((draft) => {
                  const hasBeenViewed = viewedDrafts.has(draft.id);
                  const sendCount = draft.sendCount || 0;
                  const sendButtonProps = getSendButtonProps(draft);
                  const statusProps = getStatusBadgeProps(draft.status); 
                  
                  return (
                    <IonItem key={draft.id}>
                      <IonLabel>
                        <h2>{draft.clientName || "Unknown Client"}</h2>
                        <p>
                          <strong>Status:</strong> 
                          <IonBadge 
                            color={statusProps.color}
                            style={{ marginLeft: '8px' }}
                          >
                            {statusProps.text}
                          </IonBadge>
                          {' • '}
                          <strong>Employees:</strong> {draft.data?.length || 0}
                        </p>
                        <p>
                          <strong>Created:</strong> {draft.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}
                        </p>
                        {draft.sentToClient && (
                          <IonText color="success">
                            <small>
                              Sent to client **{sendCount} time{sendCount !== 1 ? 's' : ''}**
                              {draft.lastSentAt && ` (Last: ${draft.lastSentAt.toDate?.().toLocaleDateString()})`}
                            </small>
                          </IonText>
                        )}
                        {draft.status === "approved" && hasBeenViewed && (
                          <IonNote color="success">
                            <small>
                              <IonIcon icon={checkmarkCircleOutline} /> **Ready to send**
                            </small>
                          </IonNote>
                        )}
                        {draft.status === "approved" && !hasBeenViewed && (
                          <IonNote color="warning">
                            <small>
                              <IonIcon icon={eyeOutline} /> **View required** before sending
                            </small>
                          </IonNote>
                        )}
                        {draft.status !== "approved" && draft.status !== "sent_to_client" && (
                          <IonNote color="medium">
                            <small>
                              <IonIcon icon={lockClosedOutline} /> {draft.status === "pending_approval" ? "Awaiting approval" : "Cannot send"}
                            </small>
                          </IonNote>
                        )}
                      </IonLabel>

                      <IonButton 
                        fill="outline" 
                        size="small"
                        onClick={() => handleViewDraft(draft)}
                      >
                        <IonIcon icon={eyeOutline} slot="start" />
                        View{hasBeenViewed ? ' Again' : ''}
                      </IonButton>

                      <IonButton 
                        size="small"
                        onClick={() => handleSendToClient(draft)}
                        style={{ marginLeft: '8px' }}
                        disabled={sendButtonProps.disabled}
                        fill={sendButtonProps.fill}
                        color={sendButtonProps.color}
                        title={sendButtonProps.tooltip}
                      >
                        <IonIcon icon={sendOutline} slot="start" />
                        Send{sendCount > 0 ? ` (${sendCount})` : ''}
                      </IonButton>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </>
        )}
      </IonContent>

      {/* Full Data Preview Modal */}
      <IonModal isOpen={showPreviewModal} onDidDismiss={() => setShowPreviewModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButton slot="start" fill="clear" onClick={() => setShowPreviewModal(false)}>
              <IonIcon icon={closeOutline} />
            </IonButton>
            <IonTitle>
              {selectedDraft?.clientName} - Complete Payroll Data
            </IonTitle>
            {selectedDraft?.status === "approved" && (
              <IonButton 
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
        <IonContent className="ion-padding">
          {selectedDraft && (
            <IonGrid>
              <IonRow>
                <IonCol>
                  <IonCard color={getStatusBadgeProps(selectedDraft.status).color}>
                    <IonCardContent>
                      <IonText>
                        <h3>Computation Summary</h3>
                        <p><strong>Client:</strong> {selectedDraft.clientName}</p>
                        <p>
                          <strong>Status:</strong> 
                          <IonBadge 
                            color={getStatusBadgeProps(selectedDraft.status).color}
                            style={{ marginLeft: '8px' }}
                          >
                            {getStatusBadgeProps(selectedDraft.status).text}
                          </IonBadge>
                          {selectedDraft.status === "approved" && (
                            <IonText color="success">
                              {' '}Ready to send to client
                            </IonText>
                          )}
                        </p>
                        <p><strong>Total Employees:</strong> {selectedDraft.data?.length || 0}</p>
                        <p><strong>Created:</strong> {selectedDraft.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}</p>
                        {selectedDraft.sentToClient && (
                          <p><strong>Last Sent:</strong> {selectedDraft.lastSentAt?.toDate?.().toLocaleDateString() || "Previously sent"}</p>
                        )}
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              
              {/* Complete Employee Data Table */}
              <IonRow>
                <IonCol>
                  <h4>Complete Payroll Computation Results</h4>
                  <div style={{ maxHeight: '500px', overflow: 'auto', border: '1px solid #ddd' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8em' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Code</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Department</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Rate/Hour</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Hours</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Gross Pay</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>SSS</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>PHIC</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>HDMF</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>BIR Tax</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Total Deductions</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Net Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDraft.data?.map((employee, index) => {
                          const totalDeductions = (employee.sss || 0) + (employee.philHealth || employee.phic || 0) + (employee.pagIbig || employee.hdmf || 0) + (employee.tax || employee.bir || 0);
                          
                          return (
                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                              <td style={{ padding: '6px', border: '1px solid #ddd' }}>{employee.name || 'N/A'}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd' }}>{employee.employeeCode || 'N/A'}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd' }}>{employee.department || 'N/A'}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(employee.ratePerHour)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd' }}>{employee.hoursWorked || 'N/A'}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{formatCurrency(employee.grossPay)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', color: '#d32f2f' }}>{formatCurrency(employee.sss)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', color: '#d32f2f' }}>{formatCurrency(employee.philHealth || employee.phic)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', color: '#d32f2f' }}>{formatCurrency(employee.pagIbig || employee.hdmf)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', color: '#d32f2f' }}>{formatCurrency(employee.tax || employee.bir)}</td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', color: '#d32f2f', fontWeight: 'bold' }}>
                                {formatCurrency(totalDeductions)}
                              </td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', color: '#2e7d32' }}>
                                {formatCurrency(employee.netPay)}
                              </td>
                            </tr>
                          );
                        })}
                        {!selectedDraft.data || selectedDraft.data.length === 0 ? (
                          <tr>
                            <td colSpan="12" style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
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
