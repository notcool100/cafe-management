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
PORT=3001
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

This will create:
- **2 Branches**: Main Branch (Kathmandu) and Suburban Branch (Thamel)
- **3 Users**:
  - Admin: `admin@cafe.com` / `admin123`
  - Staff 1: `staff1@cafe.com` / `staff123` (Main Branch)
  - Staff 2: `staff2@cafe.com` / `staff123` (Suburban Branch)
- **13 Menu Items** across both branches (food, beverages, desserts)
- **2 Sample Orders** with tokens

### 5. Start Backend Server
```bash
pnpm dev
```

Backend runs at `http://localhost:3001`

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
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Frontend Server
```bash
pnpm dev
```

Frontend runs at `http://localhost:3000`

---

## Testing the Application

### 1. Login as Admin
- Go to `http://localhost:3000`
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
- ⏳ Remaining CRUD forms (branches, menu)
- ⏳ Staff dashboard
- Customer interface

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
- Backend (3001): Check if another app is using the port
- Frontend (3000): Same check

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
