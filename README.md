# Labour Management System

## Project structure

| Folder | Purpose |
|--------|---------|
| `backend/` | Express API, SQL Server, JWT auth |
| `frontend/` | React UI |

## Database connection

Node.js uses **ODBC Driver 18** with the same settings as Azure Data Studio:

- Server: `localhost\SQLEXPRESS`
- Windows Authentication (`KUMKUM\digit`)
- Encrypt: yes, Trust server certificate: yes
- Database: `LabourManagementSystem`

Your `users` table uses `username` + `password_hash` + `role_id` (roles: ADMIN, HOD, LABOUR).

## Run the app

**Terminal 1 — Backend**

```powershell
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend**

```powershell
cd frontend
npm install
npm start
```

Open http://localhost:3000

## Test commands

```powershell
cd backend
npm run check:db    # database connection
npm run test:api    # full auth API tests (server must be running)
```

## API endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/health` | Server + DB status |
| POST | `/api/auth/register` | Register user (`username`, `password`, `role`) |
| POST | `/api/auth/login` | Login → JWT (`username`, `password`) |
| GET | `/api/test/protected` | Requires Bearer token |
| GET | `/api/test/admin` | ADMIN only |
| GET | `/api/test/hod` | ADMIN or HOD |

**Test login:** `rajesh` / `123456` (HOD)
