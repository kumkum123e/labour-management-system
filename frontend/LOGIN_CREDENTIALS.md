# Login Credentials (Test / Development)

Backend must be running on `http://localhost:5000`.

| Role | Username | Password | After login |
|------|----------|----------|-------------|
| **Admin** | `admin_dept_1780479568776` | `admin123` | `/admin/dashboard` |
| **HOD** | `rajesh` | `123456` | `/hod/dashboard` |
| **Labour** | `ravi` | `123456` | `/labour/dashboard` |

## Notes

- **Admin** account was created during department API tests. If login fails, register a new admin via API:
  ```http
  POST /api/auth/register
  { "username": "admin", "password": "admin123", "role": "ADMIN" }
  ```
- **HOD** and **Labour** are seed users documented in `backend/database/schema.sql`.
- Labour login username is usually the **employee code** in lowercase (e.g. `ravi`).
