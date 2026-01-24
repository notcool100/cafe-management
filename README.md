# Running the Application

## Backend Setup

### 1. Install Dependencies
```bash
cd be
pnpm install
```

### 2. Configure Database
Create `.env` file with:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cafe_management?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=4100
```

### 3. Run Prisma Migrations
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Seed the Database
```bash
pnpm prisma:seed
```

This seed creates a SaaS-ready baseline:
- **Plans**: `starter` (1 branch / 5 seats / 50 items), `growth` (5 branches / 30 seats / 500 items)
- **Tenant**: Demo Cafe Group with an active subscription on `growth`
- **Branches**: Main Branch (Kathmandu) and Suburban Branch (Thamel)
- **Users**:
  - Admin: `admin@cafe.com` / `admin123`
  - Manager (Main): `manager1@cafe.com` / `manager123`
  - Manager (Suburban): `manager2@cafe.com` / `manager123`
- **Menu Items**: 13 across both branches
- **Orders**: 2 sample orders (one completed, one cancellation_pending)

> Note: A SUPER_ADMIN account is **not** seeded by default. To add one, create a user with role `SUPER_ADMIN` (and a tenantId for now) via the database or an admin-only endpoint.

### 5. Start Backend Server
```bash
pnpm dev
```

Backend runs at `http://localhost:4100`

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd fe
pnpm install
```

### 2. Configure Environment
`.env.local` is already configured:
```env
NEXT_PUBLIC_API_URL=http://localhost:4100
```

### 3. Start Frontend Server
```bash
pnpm dev
```

Frontend runs at `http://localhost:4000`

---

## Testing the Application

### 1. Login as Admin
- Go to `http://localhost:4000`
- Email: `admin@cafe.com`
- Password: `admin123`
- You'll be redirected to `/admin` dashboard

### 2. Explore Admin Features
- View dashboard stats
- Browse employees list
- (More CRUD pages to be completed)

### 3. Login as Staff
- Logout and login with: `staff1@cafe.com` / `staff123`
- You'll be redirected to `/staff` (to be created)

---

## Notes

### Known TypeScript Issues in Backend

There are a few TypeScript warnings related to JWT library types. These don't affect functionality but can be fixed by:

1. Updating the `@types/jsonwebtoken` package
2. OR using type assertions in `auth.service.ts`

The application will still run correctly despite these warnings.

### Frontend Progress

- ✅ Foundation complete (40%)
- ✅ Authentication working
- ✅ Admin dashboard and employees list
- ✅ Manager/employee portal for orders
- ✅ Reporting dashboard
- ⏳ Remaining CRUD polish (branches, menu)
- ⏳ Customer interface

See the `summary.md` artifact for complete details.

---

## Prisma Studio

To view/edit database visually:
```bash
cd be
pnpm prisma:studio
```

Opens at `http://localhost:5555`

---

## Troubleshooting

### "Too many clients" error
The backend properly uses a singleton Prisma instance, so this shouldn't occur. If it does, restart both backend and database.

### Port already in use
- Backend (4100): Check if another app is using the port
- Frontend (4000): Same check

### Database connection errors
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `be/.env`
- Check credentials and database name

---

## Project Structure

```
cafe-management/
├── be/                    # Backend (Express + Prisma)
│   ├── src/              # Source code
│   ├── prisma/           # Prisma schema + seed
│   └── .env              # Environment variables
├── fe/                    # Frontend (Next.js)
│   ├── app/              # Pages (App Router
