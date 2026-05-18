import React, { useEffect, useState, useMemo } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSearchbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonImg,
  IonSpinner,
  IonBadge,
  IonAlert,
  IonModal,
} from "@ionic/react";
import { documentTextOutline, notificationsOutline, closeOutline, timeOutline, checkmarkDoneOutline } from "ionicons/icons";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import useAuthRole from "../../../hooks/useAuthRole";

import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";
import { useHistory } from "react-router-dom";
import "./ClientListHistory.css";

const formatDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "N/A";
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "N/A";
  }

  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatMonthYear = (value) => {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getStatusLabel = (status) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "Pending";
    case "inactive":
      return "Inactive";
    default:
      return "Active";
  }
};

const getStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "warning";
    case "inactive":
      return "medium";
    default:
      return "success";
  }
};

const getLatestComputationText = (client) => {
  const latestMonth = formatMonthYear(client.recentDraft?.monthYear);
  if (latestMonth) {
    return `Latest computation: ${latestMonth}`;
  }

  if (client.computationCount > 0) {
    return `Latest computation updated ${formatDate(
      client.recentDraft?.updatedAt || client.lastUpdated
    )}`;
  }

  return "Latest computation: No drafts yet";
};

function ClientListHistory() {
  const { loading, user } = useAuthRole();
  const history = useHistory();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSort, setSelectedSort] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Notification states
  const [allNotifications, setAllNotifications] = useState([]); // All notifications from Firestore
  const [readNotificationIds, setReadNotificationIds] = useState(new Set()); // Track read notification IDs
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Store computation drafts for each client
  const [clientDrafts, setClientDrafts] = useState({});

  // Get current and previous month info
  const getMonthInfo = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Previous month
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = currentYear - 1;
    }
    
    return {
      current: {
        month: currentMonth,
        year: currentYear,
        name: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      previous: {
        month: prevMonth,
        year: prevYear,
        name: new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    };
  }, []);

  // --------------------------
  // Load Clients for this Bookkeeper
  // --------------------------
  useEffect(() => {
    if (!user || !user.uid) {
      console.log("⏳ Waiting for user to load...");
      return;
    }

    console.log("🔥 Loading clients for bookkeeper:", user.uid);

    const clientCompaniesRef = collection(db, "clientCompanies");
    const q = query(clientCompaniesRef, where("bookkeeperId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          console.log("📊 Found clients:", snapshot.docs.length);
          
          const fetchedClients = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const raw = docSnap.data();
              
              // Get computation drafts for this client to determine recent activity
              const draftsRef = collection(db, "clientPayrollDrafts");
              const draftsQuery = query(
                draftsRef, 
                where("bookkeeperId", "==", user.uid),
                where("clientId", "==", docSnap.id)
              );
              
              const draftsSnapshot = await getDocs(draftsQuery);
              const clientDraftsData = draftsSnapshot.docs.map(draftDoc => ({
                id: draftDoc.id,
                ...draftDoc.data(),
                createdAt: draftDoc.data().createdAt?.toDate?.() || new Date(),
                updatedAt: draftDoc.data().updatedAt?.toDate?.() || new Date()
              }));

              // Find the most recent draft for this client
              const recentDraft = clientDraftsData
                .filter(draft => draft.monthYear || draft.createdAt)
                .sort((a, b) => {
                  const dateA = a.updatedAt || a.createdAt;
                  const dateB = b.updatedAt || b.createdAt;
                  return dateB - dateA;
                })[0];

              // Determine if client has current month computations
              const hasCurrentMonthComputation = clientDraftsData.some(draft => {
                if (draft.monthYear) {
                  try {
                    const draftDate = new Date(draft.monthYear);
                    return draftDate.getMonth() === getMonthInfo.current.month && 
                           draftDate.getFullYear() === getMonthInfo.current.year;
                  } catch (error) {
                    console.log("Error parsing monthYear:", draft.monthYear);
                  }
                }
                
                // Fallback to createdAt date
                let draftDate;
                if (draft.createdAt?.toDate) {
                  draftDate = draft.createdAt.toDate();
                } else if (draft.createdAt) {
                  draftDate = new Date(draft.createdAt);
                } else {
                  return false;
                }
                
                return draftDate.getMonth() === getMonthInfo.current.month && 
                       draftDate.getFullYear() === getMonthInfo.current.year;
              });

              return {
                id: docSnap.id,
                name: raw.name || raw.companyName || "Unnamed Company",
                status: raw.status || "active",
                employeesCount: raw.parsedCSV?.length || 0,
                createdAt: raw.createdAt?.toDate?.() || new Date(),
                computationCount: clientDraftsData.length,
                lastUpdated: raw.updatedAt?.toDate?.() || raw.createdAt?.toDate?.() || new Date(),
                recentDraft: recentDraft,
                hasCurrentMonthComputation: hasCurrentMonthComputation,
                allDrafts: clientDraftsData
              };
            })
          );

          console.log("✅ Clients loaded:", fetchedClients);
          setClients(fetchedClients);
          
          // Store drafts by client ID for notifications
          const draftsByClient = {};
          fetchedClients.forEach(client => {
            draftsByClient[client.id] = client.allDrafts;
          });
          setClientDrafts(draftsByClient);
          
          setIsLoading(false);
        } catch (err) {
          console.error("❌ Error loading clients:", err);
          setError("Failed to load clients.");
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("❌ Firestore error:", error);
        setError("Failed to fetch data from server.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, getMonthInfo]);

  // --------------------------
  // Generate Notifications from Client Drafts
  // --------------------------
  useEffect(() => {
    if (Object.keys(clientDrafts).length === 0) return;

    const newNotifications = [];

    Object.values(clientDrafts).forEach(clientDraftsArray => {
      clientDraftsArray.forEach(draft => {
        const clientName = draft.clientName || "Unknown Client";
        const status = draft.status;
        const createdAt = draft.createdAt;
        const updatedAt = draft.updatedAt;
        
        // Only create notifications for relevant statuses
        switch (status) {
          case "pending_approval":
            newNotifications.push({
              id: `draft-${draft.id}-pending`,
              type: "computation_pending",
              message: `Computation for ${clientName} is waiting for supervisor approval`,
              clientName: clientName,
              draftId: draft.id,
              createdAt: updatedAt,
              priority: "medium"
            });
            break;
            
          case "approved":
            newNotifications.push({
              id: `draft-${draft.id}-approved`,
              type: "computation_approved", 
              message: `Computation for ${clientName} has been approved and is ready to send`,
              clientName: clientName,
              draftId: draft.id,
              createdAt: updatedAt,
              priority: "high"
            });
            break;
            
          case "revised":
          case "needs_revision":
            newNotifications.push({
              id: `draft-${draft.id}-revised`,
              type: "computation_needs_revision",
              message: `Computation for ${clientName} needs revisions`,
              clientName: clientName,
              draftId: draft.id,
              createdAt: updatedAt,
              priority: "high"
            });
            break;
          case "disputed":
            newNotifications.push({
              id: `draft-${draft.id}-disputed`,
              type: "computation_disputed",
              message: `Computation for ${clientName} has a dispute and needs recomputation`,
              clientName,
              draftId: draft.id,
              createdAt: updatedAt,
              priority: "high"
            });
            break;
            
          default:
            if (!draft.sentToClient && draft.status === "draft") {
              newNotifications.push({
                id: `draft-${draft.id}-created`,
                type: "computation_created",
                message: `New computation draft created for ${clientName}`,
                clientName: clientName,
                draftId: draft.id,
                createdAt: createdAt,
                priority: "low"
              });
            }
            break;
        }
        
        if (draft.sentToClient && draft.lastSentAt) {
          const sentTime = draft.lastSentAt?.toDate?.() || new Date();
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          if (sentTime > oneDayAgo) {
            newNotifications.push({
              id: `draft-${draft.id}-sent`,
              type: "computation_sent",
              message: `Computation sent to ${clientName}`,
              clientName: clientName,
              draftId: draft.id,
              createdAt: sentTime,
              priority: "low"
            });
          }
        }
      });
    });

    const uniqueNotifications = newNotifications
      .filter((notification, index, self) => 
        index === self.findIndex(n => n.id === notification.id)
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    console.log("🔔 Generated notifications:", uniqueNotifications.length);
    setAllNotifications(uniqueNotifications);
  }, [clientDrafts]);

  // --------------------------
  // Filtering + Sorting - FIXED VERSION
  // --------------------------
  const { filteredClients, clientCount } = useMemo(() => {
    let arr = [...clients];

    // Search filter
    const term = search.toLowerCase();
    if (term) {
      arr = arr.filter((client) => 
        client.name.toLowerCase().includes(term)
      );
    }

    // Month filter - PROPERLY FIXED LOGIC
    if (selectedSort === "current") {
      // Show ONLY clients with current month computations
      arr = arr.filter((client) => client.hasCurrentMonthComputation);
    } else if (selectedSort === "previous") {
      // Show clients that have computations BUT NOT for current month
      arr = arr.filter((client) => {
        // If no computations at all, don't show in previous
        if (client.computationCount === 0) return false;
        
        // Check if any draft is from previous months
        const hasPreviousMonthComputation = client.allDrafts?.some(draft => {
          if (draft.monthYear) {
            try {
              const draftDate = new Date(draft.monthYear);
              const draftMonth = draftDate.getMonth();
              const draftYear = draftDate.getFullYear();
              
              // Check if draft is NOT from current month
              return !(draftMonth === getMonthInfo.current.month && 
                      draftYear === getMonthInfo.current.year);
            } catch (error) {
              console.log("Error parsing monthYear:", draft.monthYear);
            }
          }
          
          // Fallback to createdAt date
          let draftDate;
          if (draft.createdAt?.toDate) {
            draftDate = draft.createdAt.toDate();
          } else if (draft.createdAt) {
            draftDate = new Date(draft.createdAt);
          } else {
            return false;
          }
          
          const draftMonth = draftDate.getMonth();
          const draftYear = draftDate.getFullYear();
          
          // Check if draft is NOT from current month
          return !(draftMonth === getMonthInfo.current.month && 
                  draftYear === getMonthInfo.current.year);
        });

        return hasPreviousMonthComputation && !client.hasCurrentMonthComputation;
      });
    }

    // Sort by last activity (most recent first)
    arr.sort((a, b) => {
      const dateA = a.recentDraft?.updatedAt || a.lastUpdated;
      const dateB = b.recentDraft?.updatedAt || b.lastUpdated;
      return dateB - dateA;
    });

    return {
      filteredClients: arr,
      clientCount: arr.length
    };
  }, [clients, selectedSort, search, getMonthInfo]);

  // Get counts for month filter buttons
  const getMonthFilterCounts = useMemo(() => {
    const currentMonthClients = clients.filter(client => client.hasCurrentMonthComputation).length;
    
    const previousMonthClients = clients.filter(client => {
      if (client.computationCount === 0) return false;
      
      const hasPreviousMonthComputation = client.allDrafts?.some(draft => {
        if (draft.monthYear) {
          try {
            const draftDate = new Date(draft.monthYear);
            const draftMonth = draftDate.getMonth();
            const draftYear = draftDate.getFullYear();
            
            return !(draftMonth === getMonthInfo.current.month && 
                    draftYear === getMonthInfo.current.year);
          } catch (error) {
            console.log("Error parsing monthYear:", draft.monthYear);
          }
        }
        
        let draftDate;
        if (draft.createdAt?.toDate) {
          draftDate = draft.createdAt.toDate();
        } else if (draft.createdAt) {
          draftDate = new Date(draft.createdAt);
        } else {
          return false;
        }
        
        const draftMonth = draftDate.getMonth();
        const draftYear = draftDate.getFullYear();
        
        return !(draftMonth === getMonthInfo.current.month && 
                draftYear === getMonthInfo.current.year);
      });

      return hasPreviousMonthComputation && !client.hasCurrentMonthComputation;
    }).length;

    const allClients = clients.length;

    return {
      current: currentMonthClients,
      previous: previousMonthClients,
      all: allClients
    };
  }, [clients, getMonthInfo]);

  // --------------------------
  // Notification Functions
  // --------------------------
  const handleNotificationClick = (notification) => {
    console.log("🎯 Notification clicked:", notification);
    setSelectedNotification(notification);
    setShowNotificationAlert(true);
  };

  const markNotificationAsRead = (notificationId) => {
    setReadNotificationIds(prev => new Set([...prev, notificationId]));
  };

  const markAllNotificationsAsRead = () => {
    const allNotificationIds = allNotifications.map(n => n.id);
    setReadNotificationIds(prev => new Set([...prev, ...allNotificationIds]));
    setShowNotificationList(false);
  };

  const getNotificationTitle = (type) => {
    const titles = {
      'computation_pending': 'Pending Approval',
      'computation_approved': 'Computation Approved',
      'computation_needs_revision': 'Needs Revision',
      'computation_created': 'New Draft',
      'computation_sent': 'Sent to Client',
      'computation_disputed': 'Disputed Computation'
    };
    return titles[type] || 'Notification';
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'computation_pending': timeOutline,
      'computation_approved': checkmarkDoneOutline,
      'computation_needs_revision': timeOutline,
      'computation_created': documentTextOutline,
      'computation_sent': checkmarkDoneOutline,
      'computation_disputed': timeOutline
    };
    return icons[type] || notificationsOutline;
  };

  const getNotificationColor = (type) => {
    const colors = {
      'computation_pending': 'warning',
      'computation_approved': 'success',
      'computation_needs_revision': 'danger',
      'computation_created': 'primary',
      'computation_sent': 'medium',
      'computation_disputed': 'tertiary'
    };
    return colors[type] || 'medium';
  };

  // Filter out read notifications from display
  const unreadNotifications = useMemo(() => {
    return allNotifications.filter(notification => !readNotificationIds.has(notification.id));
  }, [allNotifications, readNotificationIds]);

  // --------------------------
  // Handle Client Selection
  // --------------------------
  const handleClientSelect = (client) => {
    console.log("🎯 Selected client:", client.name);
    history.push(
      `/bookkeeper-client-list?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`
    );
  };

  // --------------------------
  // Handle View Computation History
  // --------------------------
  const handleViewComputationHistory = (client) => {
    console.log("📊 Viewing computation history for:", client.name);
    history.push(
      `/bookkeeper-computation-history?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`
    );
  };

  if (loading) return <p>Loading user info...</p>;
  if (!user) return <p>You are not logged in.</p>;

  return (
    <>
      <Sidebar 
        notificationCount={unreadNotifications.length}
        onNotificationClick={() => setShowNotificationList(true)}
      />

      <IonPage id="main-content">
        <IonContent fullscreen className="client-list-content">
          <IonImg src="/Gradient-Ellipses.png" alt="BG" className="ellipse-bg" />

          <div className="client-card-container">
          <IonGrid>
             
            {/* Header */}
            <IonRow>
              <IonCol>
                <IonText>
                  <h1 className="client-list-history-title">Client List</h1>
                  <p className="client-list-subheader">
                    Choose a client to start payroll computation or open its computation history.
                  </p>
                </IonText>
                </IonCol>
            </IonRow>

                {/* Notification Indicator - Only show if there are unread notifications */}
                {unreadNotifications.length > 0 && (
                  <IonRow>
                    <IonCol size="auto" className="ion-text-center">
                  <div
                    className="notification-badge"
                    onClick={() => setShowNotificationList(true)}
                    style={{ 
                      cursor: 'pointer', 
                      marginTop: '10px',
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
                  >
                    <IonIcon icon={notificationsOutline} style={{ marginRight: '5px' }} />
                    {unreadNotifications.length} new notification{unreadNotifications.length > 1 ? 's' : ''}

                </div>
              </IonCol>
            </IonRow>
             )}

            {/* Search Bar */}
            <IonRow>
              <IonCol>
                <IonSearchbar
                 className="client-searchbar"
                  placeholder="Search clients..."
                  value={search}
                  onIonInput={(e) => setSearch(e.detail.value || "")}
                />
              </IonCol>
            </IonRow>

            {/* Time Filter Buttons */}
            <IonRow className="month-filter-row">
              <IonCol size="4" sizeMd="4">
                <IonButton
                  className="month-filter-btn"
                  fill={selectedSort === "all" ? "solid" : "outline"}
                  onClick={() => setSelectedSort("all")}
                >
                  All ({getMonthFilterCounts.all})
                </IonButton>
              </IonCol>
              <IonCol size="4">
                <IonButton
                  className="month-filter-btn"
                  fill={selectedSort === "current" ? "solid" : "outline"}
                  onClick={() => setSelectedSort("current")}
                >
                  Current ({getMonthFilterCounts.current})
                </IonButton>
              </IonCol>

              <IonCol size="4" sizeMd="4">
                <IonButton
                  className="month-filter-btn"
                  fill={selectedSort === "previous" ? "solid" : "outline"}
                  onClick={() => setSelectedSort("previous")}
                >
                  Previous ({getMonthFilterCounts.previous})
                </IonButton>
              </IonCol>
            </IonRow>
             <IonRow>
                <IonCol>
                  <div className="client-counter">
                    {clientCount} {clientCount === 1 ? 'Client' : 'Clients'}
                  </div>
                </IonCol>
              </IonRow>

            {/* Loading State */}
            {isLoading && (
              <IonRow>
                <IonCol className="ion-text-center">
                  <IonSpinner name="crescent" />
                  <IonText><p>Loading clients...</p></IonText>
                </IonCol>
              </IonRow>
            )}

            {/* Error State */}
            {error && (
              <IonRow>
                <IonCol>
                  <IonCard color="danger">
                    <IonCardContent className="ion-text-center">
                      <IonText>{error}</IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            )}

            {/* Empty State */}
            {!isLoading && !error && clientCount === 0 && (
              <IonRow>
                <IonCol>
                  <IonCard color="warning">
                    <IonCardContent className="ion-text-center">
                      <IonText>
                        <p>
                          {selectedSort === "current" 
                            ? `No clients with computations for ${getMonthInfo.current.name}`
                            : selectedSort === "previous"
                            ? "No clients with previous month computations"
                            : "No clients assigned yet."
                          }
                        </p>
                        <p>
                          {selectedSort === "all" && "Please contact your admin to get assigned to clients."}
                        </p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            )}

            {/* Clients List */}
            {!isLoading && !error && filteredClients.length > 0 && (
              <div className="client-list-table">
                <div className="client-list-table-header">
                  <div>Client</div>
                  <div>Summary</div>
                  <div>Status</div>
                  <div>Activity</div>
                  <div>Actions</div>
                </div>

                {filteredClients.map((client) => (
                  <IonCard key={client.id} className="client-card">
                    <IonCardContent>
                      <div className="client-card-grid">
                        <button
                          type="button"
                          className="client-table-cell client-info-column"
                          onClick={() => handleClientSelect(client)}
                        >
                          <span className="client-table-label">Client</span>
                          <span className="client-card-title">{client.name}</span>
                          <span className="client-detail-line">
                            Created on {formatDate(client.createdAt)}
                          </span>
                        </button>

                        <div className="client-table-cell">
                          <span className="client-table-label">Summary</span>
                          <div className="client-meta-stack">
                            <span>{client.employeesCount} employee{client.employeesCount !== 1 ? "s" : ""}</span>
                            <span>{client.computationCount} computation{client.computationCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        <div className="client-table-cell">
                          <span className="client-table-label">Status</span>
                          <IonBadge color={getStatusColor(client.status)} className="client-status-badge">
                            {getStatusLabel(client.status)}
                          </IonBadge>
                        </div>

                        <div className="client-table-cell">
                          <span className="client-table-label">Activity</span>
                          <span className="client-detail-line">
                            Last activity: {formatDate(client.recentDraft?.updatedAt || client.lastUpdated)}
                          </span>
                          <span className="client-detail-line client-detail-line-strong">
                            {getLatestComputationText(client)}
                          </span>
                        </div>

                        <div className="client-table-cell client-action-column">
                          <span className="client-table-label">Actions</span>
                          <IonButton
                            expand="block"
                            className="client-action-btn"
                            onClick={() => handleClientSelect(client)}
                          >
                            Compute Payroll
                          </IonButton>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
            
          </IonGrid>
          </div>

          {/* Notification List Modal */}
          <IonModal
            className="notification-modal"
            isOpen={showNotificationList}
            onDidDismiss={() => setShowNotificationList(false)}
          >
            <IonContent className="notification-modal-content">
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <div>
                    <p className="notification-panel-kicker">Status updates</p>
                    <h2>Computation Notifications</h2>
                    <p className="notification-panel-subtitle">
                      {unreadNotifications.length} active item{unreadNotifications.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <IonButton fill="clear" className="notification-close-btn" onClick={() => setShowNotificationList(false)}>
                    <IonIcon icon={closeOutline} />
                  </IonButton>
                </div>

                {unreadNotifications.length === 0 ? (
                  <div className="notification-empty-state">
                    <IonIcon icon={notificationsOutline} />
                    <h3>No active notifications</h3>
                    <p>All computations are up to date.</p>
                  </div>
                ) : (
                  <>
                    <div className="notification-list">
                      {unreadNotifications.map((notification) => {
                        const color = getNotificationColor(notification.type);

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            className={`notification-item notification-item-${color}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <span className="notification-item-icon">
                              <IonIcon
                                icon={getNotificationIcon(notification.type)}
                                color={color}
                              />
                            </span>
                            <span className="notification-item-content">
                              <span className="notification-item-topline">
                                <span className="notification-item-title">
                                  {getNotificationTitle(notification.type)}
                                </span>
                                {notification.clientName && (
                                  <IonBadge color="light" className="notification-client-badge">
                                    {notification.clientName}
                                  </IonBadge>
                                )}
                              </span>
                              <span className="notification-item-message">
                                {notification.message}
                              </span>
                              <span className="notification-item-time">
                                {formatDateTime(notification.createdAt)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <IonButton
                      expand="block"
                      fill="outline"
                      className="notification-clear-btn"
                      onClick={markAllNotificationsAsRead}
                    >
                      Clear All
                    </IonButton>
                  </>
                )}
              </div>
            </IonContent>
          </IonModal>
        </IonContent>

        {/* Notification Alert */}
        <IonAlert
          isOpen={showNotificationAlert}
          onDidDismiss={() => {
            setShowNotificationAlert(false);
            if (selectedNotification) {
              markNotificationAsRead(selectedNotification.id);
            }
          }}
          header={selectedNotification ? getNotificationTitle(selectedNotification.type) : 'Notification'}
          message={selectedNotification?.message}
          buttons={[
            {
              text: 'View Computations',
              handler: () => {
                history.push('/bookkeeper-computation-history');
              }
            },
            'OK'
          ]}
        />

        <FooterNav />
      </IonPage>
    </>
  );
}

export default ClientListHistory;
