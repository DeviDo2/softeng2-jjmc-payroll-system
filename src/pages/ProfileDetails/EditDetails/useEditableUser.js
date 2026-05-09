// useEditableUser.js

import { useState } from "react";
import { db } from "../../../database-components/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

import {
  getAuth,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function useEditableUser() {
  const auth = getAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ------------------------------------------------------
  // REAUTH FUNCTION
  // ------------------------------------------------------
  const reauthenticate = async (user, currentPassword) => {
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    return reauthenticateWithCredential(user, credential);
  };

  // ------------------------------------------------------
  // MAIN UPDATE FUNCTION
  // ------------------------------------------------------
  const updateUserDetails = async (userId, newData) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No authenticated user found.");
    }

    setSaving(true);
    setError(null);

    try {
      let requiresReauth = false;

      const newEmail = newData.email;
      const newPassword = newData.password;

      // Detect if email or password changed
      if (newEmail && newEmail !== currentUser.email) {
        requiresReauth = true;
      }

      if (newPassword) {
        requiresReauth = true;
      }

      // ------------------------------------------------------
      // HANDLE REAUTH WHEN NEEDED
      // ------------------------------------------------------
      if (requiresReauth) {
        const currentPassword = prompt(
          "For security reasons, please enter your current password:"
        );

        if (!currentPassword) {
          throw new Error("Action cancelled: password is required.");
        }

        await reauthenticate(currentUser, currentPassword);
      }

      // ------------------------------------------------------
      // UPDATE EMAIL (if changed)
      // ------------------------------------------------------
      if (newEmail && newEmail !== currentUser.email) {
        await updateEmail(currentUser, newEmail);
      }

      // ------------------------------------------------------
      // UPDATE PASSWORD (if provided)
      // ------------------------------------------------------
      if (newPassword) {
        await updatePassword(currentUser, newPassword);
      }

      // ------------------------------------------------------
      // UPDATE FIRESTORE (remove password before saving)
      // ------------------------------------------------------
      const { password, ...firestoreSafe } = newData;

      if (firestoreSafe.taxId !== undefined) {
        firestoreSafe.taxIdNumber = firestoreSafe.taxId;
      } else if (firestoreSafe.taxIdNumber !== undefined) {
        firestoreSafe.taxId = firestoreSafe.taxIdNumber;
      }

      if (firestoreSafe.salary !== undefined) {
        firestoreSafe.salaryRate = firestoreSafe.salary;
      } else if (firestoreSafe.salaryRate !== undefined) {
        firestoreSafe.salary = firestoreSafe.salaryRate;
      }

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, firestoreSafe);

      setSaving(false);
      return { success: true };
    } catch (err) {
      console.error("Update failed:", err);
      setSaving(false);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    updateUserDetails,
    saving,
    error,
  };
}
