const cleanIpAddress = (ip) => {
  if (!ip) return "";
  let clean = ip.trim().toLowerCase();

  // If it's a comma-separated list (from X-Forwarded-For), take the first IP
  if (clean.includes(",")) {
    clean = clean.split(",")[0].trim();
  }

  // Remove zone index in IPv6 (e.g. fe80::abcd%12 or fe80::1%lo0)
  clean = clean.split("%")[0].trim();

  // Extract from bracket notation if present (e.g. [::1]:5000 -> ::1, [::1] -> ::1)
  if (clean.startsWith("[")) {
    const closeBracket = clean.indexOf("]");
    if (closeBracket !== -1) {
      clean = clean.substring(1, closeBracket);
      return clean;
    }
  }

  // Handle IPv4 port stripping (e.g. 192.168.1.1:5000)
  if (clean.includes(".")) {
    const lastColon = clean.lastIndexOf(":");
    const lastDot = clean.lastIndexOf(".");
    if (lastColon > lastDot) {
      clean = clean.substring(0, lastColon);
    }
  } else {
    // If it has only one colon and no dots, it could be a hostname with a port (e.g. localhost:5000)
    const colons = (clean.match(/:/g) || []).length;
    if (colons === 1) {
      clean = clean.split(":")[0];
    }
  }

  return clean;
};

const getClientIp = (req) => {
  if (!req) return "";
  
  // 1. Check req.ip (Express parses X-Forwarded-For if trust proxy is enabled)
  let ip = req.ip;

  // 2. Fallback to manually checking X-Forwarded-For if req.ip is not resolved
  const xForwardedFor = req.headers ? req.headers["x-forwarded-for"] : null;
  if (!ip && xForwardedFor) {
    const ips = xForwardedFor.split(",").map(item => item.trim());
    if (ips.length > 0) {
      ip = ips[0];
    }
  }

  // 3. Fall back to socket or connection remoteAddress
  if (!ip && req.socket) {
    ip = req.socket.remoteAddress;
  }
  if (!ip && req.connection) {
    ip = req.connection.remoteAddress;
  }

  return cleanIpAddress(ip);
};

const isPrivateIp = (ip) => {
  const cleanIp = cleanIpAddress(ip);
  if (!cleanIp) return false;

  // Directly check loopback and localhost
  if (
    cleanIp === '::1' || 
    cleanIp === 'localhost' || 
    cleanIp === '127.0.0.1' || 
    cleanIp === '::ffff:127.0.0.1'
  ) {
    return true;
  }

  // Check IPv6 private/local ranges
  // 1. Link-local (fe80::/10)
  if (cleanIp.startsWith('fe80:')) return true;
  // 2. Unique Local Address (fc00::/7)
  if (cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:')) return true;

  // Clean IPv4-mapped IPv6 format (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  const ipv4Match = cleanIp.match(/^(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    const ipv4 = ipv4Match[1];
    
    // Check IPv4 private/local ranges
    // Loopback: 127.0.0.0/8
    if (ipv4.startsWith('127.')) return true;
    // Private Network: 10.0.0.0/8
    if (ipv4.startsWith('10.')) return true;
    // Link-local: 169.254.0.0/16
    if (ipv4.startsWith('169.254.')) return true;
    // Private Network: 192.168.0.0/16
    if (ipv4.startsWith('192.168.')) return true;
    // Private Network: 172.16.0.0/12 (172.16.* to 172.31.*)
    if (ipv4.startsWith('172.')) {
      const parts = ipv4.split('.');
      if (parts.length >= 2) {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }
    }
  }

  return false;
};

const isAdminIpAllowed = (ip) => {
  const clean = cleanIpAddress(ip);
  if (!clean) return false;

  // Localhost is ALWAYS allowed (to ensure we don't accidentally lock ourselves out on the server machine)
  if (
    clean === "::1" ||
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "::ffff:127.0.0.1" ||
    clean.startsWith("127.")
  ) {
    return true;
  }

  const mode = (process.env.ADMIN_ACCESS_MODE || "private").trim().toLowerCase();

  if (mode === "local") {
    // Only localhost/loopback is allowed, which was already handled above. So return false.
    return false;
  }

  if (mode === "whitelisted") {
    const whitelist = (process.env.ADMIN_WHITELISTED_IPS || "")
      .split(",")
      .map(item => cleanIpAddress(item))
      .filter(Boolean);
    
    return whitelist.includes(clean);
  }

  // Default mode is 'private'
  return isPrivateIp(clean);
};

module.exports = {
  cleanIpAddress,
  getClientIp,
  isPrivateIp,
  isAdminIpAllowed
};
