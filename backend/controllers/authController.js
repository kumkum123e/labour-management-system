const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool, isDbConnected } = require("../config/db");

const ROLE_MAP = {
  admin: 1,
  ADMIN: 1,
  manager: 2,
  hod: 2,
  HOD: 2,
  employee: 3,
  labour: 3,
  LABOUR: 3,
};

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      username: user.username,
      role: user.role_name,
      role_id: user.role_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const normalizeUsername = (value) => String(value).trim().toLowerCase();

const resolveRoleId = (role) => {
  if (typeof role === "number") return role;
  return ROLE_MAP[role] ?? null;
};

const dbUnavailable = (res) =>
  res.status(503).json({
    message: "Database not connected. Restart the backend and check .env settings.",
  });

const register = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);

  try {
    const { name, username, email, password, role = "LABOUR" } = req.body;
    const loginName = username || email;

    if (!loginName || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const roleId = resolveRoleId(role);
    if (!roleId) {
      return res
        .status(400)
        .json({ message: "Invalid role. Use ADMIN, HOD, or LABOUR" });
    }

    const normalizedUsername = normalizeUsername(loginName);
    const pool = getPool();

    const existing = await pool
      .request()
      .input("username", sql.VarChar, normalizedUsername)
      .query("SELECT user_id FROM users WHERE LOWER(username) = @username");

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: "Username already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = (name || normalizedUsername).trim();

    const result = await pool
      .request()
      .input("username", sql.VarChar, displayName)
      .input("password_hash", sql.VarChar, hashedPassword)
      .input("role_id", sql.Int, roleId)
      .query(
        `INSERT INTO users (username, password_hash, role_id, is_active)
         OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.role_id
         VALUES (@username, @password_hash, @role_id, 1)`
      );

    const row = result.recordset[0];
    const roleRow = await pool
      .request()
      .input("role_id", sql.Int, row.role_id)
      .query("SELECT role_name FROM roles WHERE role_id = @role_id");

    const userPayload = {
      user_id: row.user_id,
      username: row.username,
      role_id: row.role_id,
      role_name: roleRow.recordset[0].role_name,
    };

    const token = signToken(userPayload);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: row.user_id,
        username: row.username,
        role: roleRow.recordset[0].role_name,
        role_id: row.role_id,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const verifyPassword = async (plain, stored) => {
  try {
    if (!stored) {
      console.error("No stored password hash found");
      return false;
    }
    const storedStr = String(stored).trim();
    if (storedStr.startsWith("$2")) {
      return await bcrypt.compare(plain, storedStr);
    }
    return plain === storedStr;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
};

const login = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);

  try {
    const { username, email, password } = req.body;
    const loginName = username || email;

    if (!loginName || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const normalizedUsername = normalizeUsername(loginName);
    const pool = getPool();

    const result = await pool
      .request()
      .input("username", sql.VarChar, normalizedUsername)
      .query(
        `SELECT DISTINCT u.user_id, u.username, u.password_hash, u.role_id, r.role_name
         FROM users u
         INNER JOIN roles r ON u.role_id = r.role_id
         LEFT JOIN hod_profiles hp ON u.user_id = hp.user_id
         LEFT JOIN labour_profiles lp ON u.user_id = lp.user_id
         WHERE (
           LOWER(u.username) = @username OR
           LOWER(hp.hod_name) = @username OR
           LOWER(lp.employee_id) = @username
         ) AND u.is_active = 1`
      );

    if (result.recordset.length === 0) {
      console.log(`Login attempt: User '${normalizedUsername}' not found`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = result.recordset[0];
    console.log(`Login attempt for user: ${user.username}, role: ${user.role_name}`);
    
    const isMatch = await verifyPassword(password, user.password_hash);

    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${user.username}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }
    if (String(user.role_name).trim().toUpperCase() === "ADMIN") {
      const { isPrivateIp } = require("../utils/ipUtils");
      const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (!isPrivateIp(clientIp)) {
        console.log(`Login blocked: Admin login attempt for ${user.username} from public IP ${clientIp}`);
        return res.status(403).json({ message: "Admin login is restricted to private network only" });
      }
    }

    if (!user.password_hash.startsWith("$2")) {
      const hashed = await bcrypt.hash(password, 10);
      await pool
        .request()
        .input("user_id", sql.Int, user.user_id)
        .input("password_hash", sql.VarChar, hashed)
        .query(
          "UPDATE users SET password_hash = @password_hash WHERE user_id = @user_id"
        );
    }

    const token = signToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role_name,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = { register, login };
