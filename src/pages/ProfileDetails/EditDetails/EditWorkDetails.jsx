import EditDetailsBase from "./EditDetailsBase" 
import{ barChartOutline, documentTextOutline, chatbubbleOutline, playBackOutline } from "ionicons/icons";

export default function EditWorkDetails() {
  return (
    <EditDetailsBase
      pageTitle="Edit Work Details"
      fields={[
        { name: "phoneNumber", label: "Phone Number", type: "tel" },
        { name: "company", label: "Company", type: "text" },
        { name: "position", label: "Position", type: "text", colSize: "6" },
        { name: "department", label: "Department", type: "text", colSize: "6" },
        { name: "salary", label: "Salary Rate", type: "number" },
        { name: "taxId", label: "Tax Identification Number", type: "text" },
      ]}
    />
  );
}
