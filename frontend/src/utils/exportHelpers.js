import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { formatTime } from "./timeFormat";

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

export const exportSinglePassToPdf = (req) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150]
  });

  // Background card border
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.rect(5, 5, 90, 140);

  // Header Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text("OUTING PASS", 50, 18, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Frigerio Conserva Allana Pvt Ltd", 50, 23, { align: "center" });

  // Draw status stamp box
  const status = String(req.status || "Pending").toUpperCase();
  let stampBg = [254, 243, 199]; // Amber 100
  let stampText = [180, 83, 9]; // Amber 700
  if (status === "APPROVED") {
    stampBg = [220, 252, 231]; // Emerald 100
    stampText = [21, 128, 61]; // Emerald 700
  } else if (status === "REJECTED") {
    stampBg = [254, 226, 226]; // Red 100
    stampText = [185, 28, 28]; // Red 700
  }

  // Draw a colored status stamp
  doc.setFillColor(...stampBg);
  doc.roundedRect(35, 27, 30, 7, 1.5, 1.5, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...stampText);
  doc.text(status, 50, 32, { align: "center" });

  // Separator line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(10, 38, 90, 38);

  // Pass Details
  let y = 45;
  const drawRow = (label, value, isBold = false) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 12, y);

    doc.setFont("Helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(String(value || "—"), 40, y);
    y += 7;
  };

  drawRow("Pass ID:", `#OP-${req.requestID}`, true);
  drawRow("Employee ID:", req.employeeCode);
  drawRow("Employee Name:", req.labourName, true);
  drawRow("Department:", req.departmentName);
  drawRow("Outing Date:", new Date(req.requestDate).toLocaleDateString());
  drawRow("Out Time:", formatTime(req.outTime));
  drawRow("Return Time:", formatTime(req.returnTime));
  
  // Wrap reason text
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Reason:", 12, y);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const splitReason = doc.splitTextToSize(req.reason || "—", 48);
  doc.text(splitReason, 40, y);
  y += Math.max(splitReason.length * 4.5, 7);

  drawRow("Assigned HOD:", req.hodName);

  // Security Signature
  if (req.securitySignature) {
    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 112, 90, 112);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Security Signature", 50, 116, { align: "center" });

    try {
      doc.addImage(req.securitySignature, "PNG", 35, 118, 30, 12);
    } catch (e) {
      console.error("Failed to add signature image to PDF", e);
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Verified by: ${req.securityUsername || "Security"}`, 50, 134, { align: "center" });
  }

  // Footer
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 50, 142, { align: "center" });

  doc.save(`Gate_Pass_OP_${req.requestID}.pdf`);
};

