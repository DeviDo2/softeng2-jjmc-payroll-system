import { calculateDeductions } from "../../BookkeeperOnly/ComputationEngine/payrollCalculations";

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const rawText = reader.result;
        if (!rawText?.trim()) {
          return reject(new Error("CSV file is empty"));
        }

        const lines = rawText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().toLowerCase());

        const parsedRows = lines.slice(1).map((line, index) => {
          const values = line.split(",").map((v) => v.trim());
          const row = {};

          headers.forEach((header, i) => {
            row[header] = values[i] ?? "";
          });

          const ratePerHour = Number(row.rateperhour) || 0;
          const hoursWorked =
            Number(row.hoursworked) ||
            Number(row.hours) ||
            0;

          const grossPay = ratePerHour * hoursWorked;
          const deductions = calculateDeductions(grossPay);

          return {
            employeeCode:
              row.employeecode ||
              `EMP${String(index + 1).padStart(3, "0")}`,

            name: row.name || "",
            payrollPeriod: row.payrollperiod || "Monthly 2024",
            businessUnit: row.businessunit || "General",
            department: row.department || "",

            ratePerHour,
            hoursWorked,
            grossPay,

            ...deductions,
          };
        });

        const validRows = parsedRows.filter((r) => r.name !== "");

        resolve(validRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () =>
      reject(new Error("Failed to read CSV file"));

    reader.readAsText(file);
  });
};

