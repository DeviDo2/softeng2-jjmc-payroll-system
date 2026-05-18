import EditDetailsBase from "./EditDetailsBase";
import useAuthRole from "../../../hooks/useAuthRole";

export default function EditWorkDetails() {
  const { role } = useAuthRole();
  const resolvedRole = (role || "").toLowerCase();

  const workFields = [
    { name: "phoneNumber", label: "Phone Number", type: "tel" },
    { name: "company", label: "Company", type: "text" },
    { name: "position", label: "Position", type: "text", colSize: "6" },
    { name: "department", label: "Department", type: "text", colSize: "6" },
    { name: "salary", label: "Salary Rate", type: "number" },
    { name: "taxId", label: "Tax Identification Number", type: "text" },
  ].filter((field) => {
    if (resolvedRole === "admin" || resolvedRole === "bookkeeper") {
      return field.name === "phoneNumber";
    }

    return true;
  });

  return (
    <EditDetailsBase
      pageTitle="Edit Work Details"
      fields={workFields}
    />
  );
}
