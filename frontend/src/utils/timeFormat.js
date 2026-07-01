export function formatTime(timeStr) {
  if (!timeStr) return "—";

  let str = String(timeStr).trim();

  // If it's a full ISO datetime string containing 'T' or space (e.g. 1970-01-01T02:00:00.000Z or similar)
  if (str.includes("T") || str.includes(" ")) {
    const parts = str.includes("T") ? str.split("T") : str.split(" ");
    const timePart = parts[1];
    if (timePart) {
      const match = timePart.match(/^(\d{2}):(\d{2})/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${hours}:${minutes} ${ampm}`;
      }
    }
  }

  // Handle formats like "14:30" or "02:30 PM"
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(\s*[AP]M)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    let ampm = match[3] ? match[3].trim().toUpperCase() : "";
    if (!ampm) {
      ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
    }
    return `${hours}:${minutes} ${ampm}`;
  }

  return timeStr;
}
