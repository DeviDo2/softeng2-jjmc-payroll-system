import EditPersonalDetails from "../ProfileDetails/EditDetails/EditPersonalDetails";
import EditWorkDetails from "../ProfileDetails/EditDetails/EditWorkDetails";

export default function EditDetailsClientStaff() {
  if (type === "work") return <EditWorkDetails/>;
  return <EditPersonalDetails/>;
}
