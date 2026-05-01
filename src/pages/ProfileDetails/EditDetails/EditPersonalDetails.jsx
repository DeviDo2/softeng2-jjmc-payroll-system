import EditDetailsBase from "./EditDetailsBase"
import{
  barChartOutline, 
  documentTextOutline, 
  chatbubbleOutline, 
  playBackOutline 
} 
from "ionicons/icons";


export default function EditPersonalDetails() {
  return (
    <EditDetailsBase
      pageTitle="Edit Personal Details"
      showCalendarField={true}
      fields={[
        { name: "email", label: "Email", type: "email" },
        { name: "password", label: "Password", type: "password" },
        { name: "firstName", label: "First Name", type: "text" },
        { name: "lastName", label: "Last Name", type: "text" },
        { name: "birthdate", label: "Birthdate", type: "text", readonly: true },
        {
          name: "gender",
          label: "Gender",
          type: "select",
          options: [
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Others", value: "others" },
          ],
        },
        { name: "address", label: "Address", type: "text" },
      ]}
    />
  );
}
