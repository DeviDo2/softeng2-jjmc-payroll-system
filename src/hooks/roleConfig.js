// /hooks/roleConfig.js 

import { 
  documentTextOutline, 
  barChartOutline, 
  chatbubbleOutline, 
  playBackOutline
} from "ionicons/icons";

export const roleConfig = {
  "client-staff": {
    greetingRole: "Client Staff",
    dashboardCards: [
      { title: "Dashboard",
         subtitle: "View your current progress",
          path: "/client-staff-current-computation" },
      { title: "Dashboard", 
        subtitle: "Your current salary rate",
         path: "/client-staff-computation-history" },
    ],
    menuItems: [
      { label: "Current Computation", 
        icon: barChartOutline, 
        path: "/client-staff-current-computation" },
      { label: "Computation History", 
        icon: documentTextOutline, 
        path: "/client-staff-computation-history" },
      { label: "Inquiry",
         icon: chatbubbleOutline, 
         path: "/inquiry" },
      { label: "Tutorials",
        icon: playBackOutline,
        path: "/client-staff-tutorials"
      }
    ],
    homePath: "/client-staff-home",
    profilePath: "/client-staff-profile",
  },

  bookkeeper: {
    greetingRole: "Bookkeeper",
    dashboardCards: [
      { title: "Dashboard", 
        subtitle: "View your current progress",
         path: "/bookkeeper-current-computation" },
      { title: "Dashboard", 
        subtitle: "Your computation history", 
        path: "/bookkeeper-computation-history" },
    ],
    menuItems: [
      { label: "Client List History",
         icon: documentTextOutline, 
         path: "/bookkeeper-client-history"},
      { label: "Compute Client Staff Data",
         icon: barChartOutline, 
         path: "/bookkeeper-client-list-base"},
      { label: "Inquiry",
         icon: chatbubbleOutline,
        path: "/bookkeeper-inquiry-forum" },
    ],
    homePath: "/bookkeeper-home",
    profilePath: "/bookkeeper-profile",
  },

  admin: {
    greetingRole: "Admin",
    dashboardCards: [
      { title: "System Monitor",
         subtitle: "Admin overview",
          path: "/admin-dashboard" },
      { title: "User Management", 
        subtitle: "Manage accounts",
         path: "/user-management" },
    ],
    menuItems: [
      { label: "Computation Approval",
         icon: barChartOutline,
          path: "/admin-computation-approval"},
      { label: "Client Company",
         icon: documentTextOutline,
          path: "/admin-assign-bookkeeper"},
      {label: "Inquiry Approval",
        icon: chatbubbleOutline,
        path: "/admin-inquiry-forum"},
      {label: "Tutorials",
        icon: playBackOutline,
        path: "/admin-manage-tutorials"
      }
    ],
    homePath: "/admin-home",
    profilePath: "/admin-profile",
  },
};
