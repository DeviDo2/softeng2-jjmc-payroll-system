export const validateCSVData = (parsedCSV) => {
  const data = parsedCSV?.data || parsedCSV; // handles Papa.parse & raw array
  
  if (!Array.isArray(data)) {
    throw new Error("Invalid CSV format: Expected an array of rows");
  }

  const errors = [];
  data.forEach((row, index) => {
    if (!row.name) errors.push(`Row ${index + 1}: Missing employee name`);
    if (!row.ratePerHour || isNaN(row.ratePerHour) || row.ratePerHour <= 0)
      errors.push(`Row ${index + 1}: Invalid rate per hour`);
    if (!row.hoursWorked || isNaN(row.hoursWorked) || row.hoursWorked <= 0)
      errors.push(`Row ${index + 1}: Invalid hours worked`);
  });

  return errors;
};
