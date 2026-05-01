// authService.js
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../database-components/firebaseConfig";

export async function signUp(email, password, role) {
  // 1️. Create the user account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Store the user’s extra info (role, email)
  await setDoc(doc(db, "users", user.uid), {
    email,
    role,
    createdAt: serverTimestamp()
  });

  return user;
}
