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
  IonApp,
  IonBadge,
  IonAlert,
  IonList,
  IonItem,
  IonLabel,
  IonModal,
} from "@ionic/react";
import { chevronForward, documentTextOutline, notificationsOutline, closeOutline, timeOutline, checkmarkDoneOutline } from "ionicons/icons";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";
import useAuthRole from "../../../hooks/useAuthRole";

import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";
import { useHistory } from "react-router-dom";

function ClientListHistory() {
  const { loading, user } = useAuthRole();
  const history = useHistory();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSort, setSelectedSort] = useState("current");
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
      'computation_sent': 'Sent to Client'
    };
    return titles[type] || 'Notification';
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'computation_pending': timeOutline,
      'computation_approved': checkmarkDoneOutline,
      'computation_needs_revision': timeOutline,
      'computation_created': documentTextOutline,
      'computation_sent': checkmarkDoneOutline
    };
    return icons[type] || notificationsOutline;
  };

  const getNotificationColor = (type) => {
    const colors = {
      'computation_pending': 'warning',
      'computation_approved': 'success',
      'computation_needs_revision': 'danger',
      'computation_created': 'primary',
      'computation_sent': 'medium'
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
    <IonApp>
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
              <IonCol size="6">
                <IonButton
                className="month-filter-btn"
                  fill={selectedSort === "current" ? "solid" : "outline"}
                  onClick={() => setSelectedSort("current")}
                >
                  Current Month ({getMonthFilterCounts.current})
                </IonButton>
              </IonCol>

              <IonCol>
                <IonButton
                  fill={selectedSort === "previous" ? "solid" : "outline"}
                  onClick={() => setSelectedSort("previous")}
                >
                  Previous Months ({getMonthFilterCounts.previous})
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
            {!isLoading && !error && filteredClients.map((client) => (
              <IonCard key={client.id} className="client-card">
                <IonCardContent>
                  <IonRow className="ion-align-items-center">
                    {/* Client Info - Clickable Area */}
                    <IonCol 
                      style={{ cursor: "pointer" }}
                      onClick={() => handleClientSelect(client)}
                    >
                      <IonText>
                        <h3><strong>{client.name}</strong></h3>
                      </IonText>
                      <IonText color="medium">
                        <p>
                          {client.employeesCount} employees • 
                          Created {client.createdAt.toLocaleDateString()}
                        </p>
                        {client.computationCount > 0 && (
                          <p style={{color: 'var(--ion-color-success)'}}>
                            {client.computationCount} computation{client.computationCount !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </IonText>
                    </IonCol>

                    {/* Status Badge */}
                    <IonCol size="auto">
                      <IonButton
                        fill="outline"
                        size="small"
                        color={
                          client.status === "active" ? "success" :
                          client.status === "pending" ? "warning" : "medium"
                        }
                      >
                        {client.status?.toUpperCase() || "ACTIVE"}
                      </IonButton>
                    </IonCol>

                    {/* Computation History Button */}
                    <IonCol size="auto">
                      <IonButton
                        fill="solid"
                        color="primary"
                        size="small"
                        onClick={() => handleViewComputationHistory(client)}
                      >
                        <IonIcon icon={documentTextOutline} slot="start" />
                        History
                      </IonButton>
                    </IonCol>

                    {/* Forward Arrow */}
                    <IonCol size="auto">
                      <IonIcon 
                        icon={chevronForward} 
                        color="medium"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleClientSelect(client)}
                      />
                    </IonCol>
                  </IonRow>
                </IonCardContent>
              </IonCard>
            ))}
            
          </IonGrid>
          </div>

          {/* Notification List Modal */}
          <IonModal isOpen={showNotificationList} onDidDismiss={() => setShowNotificationList(false)}>
            <IonContent>
              <IonGrid className="ion-padding">
                <IonRow>
                  <IonCol>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <IonText>
                        <h2>Computation Status</h2>
                        <p>{unreadNotifications.length} active items</p>
                      </IonText>
                      <IonButton fill="clear" onClick={() => setShowNotificationList(false)}>
                        <IonIcon icon={closeOutline} />
                      </IonButton>
                    </div>
                  </IonCol>
                </IonRow>

                {unreadNotifications.length === 0 ? (
                  <IonRow>
                    <IonCol className="ion-text-center">
                      <IonText color="medium">
                        <p>No active notifications</p>
                        <p><small>All computations are up to date</small></p>
                      </IonText>
                    </IonCol>
                  </IonRow>
                ) : (
                  <>
                    <IonList>
                      {unreadNotifications.map(notification => (
                        <IonItem 
                          key={notification.id}
                          button
                          onClick={() => handleNotificationClick(notification)}
                          style={{ 
                            borderLeft: `4px solid var(--ion-color-${getNotificationColor(notification.type)})` 
                          }}
                        >
                          <IonIcon 
                            icon={getNotificationIcon(notification.type)} 
                            slot="start"
                            color={getNotificationColor(notification.type)}
                          />
                          <IonLabel>
                            <h3 style={{ fontWeight: 'bold' }}>
                              {getNotificationTitle(notification.type)}
                            </h3>
                            <p>{notification.message}</p>
                            <p className="notification-time" style={{ fontSize: '12px', color: '#666' }}>
                              {notification.createdAt.toLocaleDateString()} at {notification.createdAt.toLocaleTimeString()}
                            </p>
                            {notification.clientName && (
                              <IonBadge color="light" style={{ marginTop: '4px' }}>
                                {notification.clientName}
                              </IonBadge>
                            )}
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                    <IonRow>
                      <IonCol>
                        <IonButton 
                          expand="block" 
                          fill="clear" 
                          onClick={markAllNotificationsAsRead}
                          color="medium"
                        >
                          Clear All
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </>
                )}
                
              </IonGrid>
              
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
    </IonApp>
  );
}

export default ClientListHistory;