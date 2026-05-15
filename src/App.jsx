import React from "react";
import { Route, Redirect } from "react-router-dom";
import {
  IonApp,
  IonSplitPane,
  IonRouterOutlet,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";

// Ionic setup
setupIonicReact();

// CSS Imports
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "./theme/variables.css";

// Components
import Sidebar from "./components/Sidebar";
import RoleGuard from "./components/RoleGuard";

// Public Pages
import WelcomePage from "./pages/Welcome/WelcomePage";

// Base Pages
import LoginBase from "./pages/Login/LoginBase";
import SignUpBase from "./pages/Signup/SignUpBase";
import ForgotPassword from "./pages/Login/ForgotPassword";

import HomePageBase from "./pages/Home/HomePageBase";
import CurrentComputation from "./pages/CurrentComputate/CurrentComputationBase";
import ComputationHistory from "./pages/HistoryComputate/ComputationHistoryBase";

import ProfileBase from "./pages/ProfileDetails/ProfileBase";
import EditDetailsBase from "./pages/ProfileDetails/EditDetails/EditDetailsBase";
import ViewDetailsBase from "./pages/ProfileDetails/ViewDetails/ViewDetailsBase";

import Inquiry from "./pages/Inquiry/InquiryBase";
import InquiryForumBase from "./pages/Inquiry/InquiryForumBase";

// Profile Editor
import EditProfilePic from "./pages/ProfileDetails/EditDetails/EditProfilePic";
import EditPersonalDetails from "./pages/ProfileDetails/EditDetails/EditPersonalDetails";
import EditWorkDetails from "./pages/ProfileDetails/EditDetails/EditWorkDetails";

// Client Staff
import SignUpClientStaff from "./pages/ClientStaffOnly/SignUpClientStaff";
import HomeClientStaff from "./pages/ClientStaffOnly/HomeClientStaff";
import ProfileClientStaff from "./pages/ClientStaffOnly/ProfileClientStaff";

import CurrentCompClientStaff from "./pages/ClientStaffOnly/CurrentCompClientStaff";

import InquiryForumClientStaff from "./pages/ClientStaffOnly/InquiryForumClientStaff";
import TutorialsClientStaff from "./pages/ClientStaffOnly/TutorialsClientStaff";

// Bookkeeper
import SignUpBookkeeper from "./pages/BookkeeperOnly/SignUpBookkeeper";
import HomeBookkeeper from "./pages/BookkeeperOnly/HomeBookkeeper";
import ProfileBookkeeper from "./pages/BookkeeperOnly/ProfileBookkeeper";

import ClientListBase from "./pages/BookkeeperOnly/ClientList/ClientListBase";

import ComputationEngine from "./pages/BookkeeperOnly/ComputationEngine/ComputationPageBase";

import CompHistoryBookkeeper from "./pages/BookkeeperOnly/ComputationEngine/CompHistoryBookkeeper";

import ClientListHistory from "./pages/BookkeeperOnly/ClientList/ClientListHistory";
import ClientEmployeeList from "./pages/BookkeeperOnly/ClientList/ClientEmployeeList";

import InquiryBookkeeper from "./pages/BookkeeperOnly/InquiryForumBookkeeper";

// Admin
import HomeAdmin from "./pages/AdminOnly/HomeAdmin";
import InquiryForumAdmin from "./pages/AdminOnly/InquiryForumAdmin";

import ComputationApproval from "./pages/AdminOnly/ComputationApproval/ComputationApproval";
import AssignBookkeeper from "./pages/AdminOnly/AssignBookkeeper/AssignBookkeeper";
import ManageTutorialsAdmin from "./pages/AdminOnly/ManageTutorialsAdmin";

function App() {
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/welcome");
  };

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main-content">
          <Sidebar onLogout={handleLogout} />

          <IonRouterOutlet id="main-content">
            {/* Public */}
            <Route exact path="/" render={() => <Redirect to="/welcome" />} />
            <Route exact path="/welcome" component={WelcomePage} />
            <Route exact path="/login" component={LoginBase} />
            <Route exact path="/login-base" render={() => <Redirect to="/login" />} />
            <Route exact path="/signup-base" component={SignUpBase} />
            <Route exact path="/forgot-password" component={ForgotPassword} />
            
            <Route exact path="/home-base" component={HomePageBase} />
            <Route exact path="/profile-details-base" component={ProfileBase} />
            <Route exact path="/edit-details-base" component={EditDetailsBase} />
            <Route exact path="/view-details-base" component={ViewDetailsBase} />

            <Route exact path="/inquiry" component={Inquiry} />
            <Route exact path="/inquiry-forum-base" component={InquiryForumBase} />

            
            {/* Profile Editor */}
            <Route exact path="/edit-profile-pic" component={EditProfilePic} />
            <Route exact path="/edit-personal-details" component={EditPersonalDetails} />
            <Route exact path="/edit-work-details" component={EditWorkDetails} />

            {/* Client-Staff */}
            <Route exact path="/client-staff-login" render={() => <Redirect to="/login" />} />
            <Route exact path="/client-staff-signup" component={SignUpClientStaff} />
            <Route exact path="/client-staff-profile" component={ProfileClientStaff} />
            <Route exact path="/client-staff-current-computation" component={CurrentComputation} />
            <Route exact path="/client-staff-computation-history" component={ComputationHistory} />
            <Route exact path="/client-staff-inquiry-forum" component={InquiryForumClientStaff} />
            <Route
              exact
              path="/client-staff-home"
              render={() => (
                <RoleGuard allowedRole="client-staff">
                  <HomeClientStaff />
                </RoleGuard>
              )}
            />

            <Route exact path="/client-staff-tutorials" component={TutorialsClientStaff} />

            {/* Bookkeeper */}
            <Route exact path="/bookkeeper-signup" component={SignUpBookkeeper} />
            <Route exact path="/bookkeeper-login" render={() => <Redirect to="/login" />} />
            <Route exact path="/bookkeeper-profile" component={ProfileBookkeeper} />
            
            <Route exact path="/bookkeeper-inquiry-forum" component={InquiryBookkeeper} />
            
            <Route exact path="/bookkeeper-client-list-base" component={ClientListBase} />
            
            <Route exact path="/bookkeeper-client-list" component={ClientEmployeeList} />
            <Route exact path="/bookkeeper-computation-engine" component={ComputationEngine} />
            <Route exact path="/bookkeeper-client-history" component={ClientListHistory} />
            <Route exact path="/bookkeeper-computation-history" component={CompHistoryBookkeeper} />
            
            <Route
              exact
              path="/bookkeeper-home"
              render={() => (
                <RoleGuard allowedRole="bookkeeper">
                  <HomeBookkeeper />
                </RoleGuard>
              )}
            />

            {/* Admin */}
            <Route exact path="/admin-login" render={() => <Redirect to="/login" />} />
            <Route
              exact
              path="/admin-home"
              render={() => (
                <RoleGuard allowedRole="admin">
                  <HomeAdmin />
                </RoleGuard>
              )}
            />
            <Route exact path="/admin-inquiry-forum" component={InquiryForumAdmin} />
            <Route exact path="/admin-computation-approval" component={ComputationApproval} />
            <Route exact path="/admin-assign-bookkeeper" component={AssignBookkeeper} />
            <Route exact path="/admin-manage-tutorials" component={ManageTutorialsAdmin} />

            {/* 404 fallback */}
            <Route render={() => <Redirect to="/welcome" />} />
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
}

export default App;
