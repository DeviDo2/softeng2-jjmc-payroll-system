/* -------------------------------------------------------
   DELETE (Use only server-side)
------------------------------------------------------- */
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";

export const deleteFromCloudinary = async (publicId, resourceType = "video") => {
  const callFn = httpsCallable(functions, "deleteCloudinaryMedia");

  const res = await callFn({
    publicId,
    resourceType,
  });

  return res.data;
};
