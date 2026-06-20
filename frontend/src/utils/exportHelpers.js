import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export const exportToPdf = (title, rows, columns) => {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  let y = 26;
  const header = columns.map((c) => c.label).join(" | ");
  doc.text(header, 14, y);
  y += 8;
  rows.forEach((row) => {
    const line = columns.map((c) => String(row[c.key] ?? "")).join(" | ");
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line.slice(0, 120), 14, y);
    y += 7;
  });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
};

export const exportToExcel = (title, rows, columns) => {
  const data = rows.map((row) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.label] = row[c.key];
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
};

export const printTable = (title) => {
  window.print();
};
