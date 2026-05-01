import React from "react";
import { Redirect } from "react-router-dom";

export default function RoleGuard({ allowedRole, children }) {
  const saved = sessionStorage.getItem("jjmcUser");
  const user = saved ? JSON.parse(saved) : null;

  // NOT LOGGED IN → send to welcome
  if (!user) {
    return <Redirect to="/welcome" />;
  }

  // Logged in but role mismatch → send to correct home
  if (user.role !== allowedRole) {
    const redirectMap = {
      "client-staff": "/client-staff-home",
      bookkeeper: "/bookkeeper-home",
      admin: "/admin-home",
    };

    return <Redirect to={redirectMap[user.role]} />;
  }

  // All good → allow content to render
  return <>{children}</>;
}
