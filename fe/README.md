# Cafe Management System - Frontend

A modern, beautiful Next.js 14 frontend for the cafe management system featuring dark mode, glassmorphism effects, and a premium user experience.

## 🎨 Features

### Design Highlights
- 🌙 **Dark Mode** - Beautiful dark theme with purple/indigo gradients
- ✨ **Glassmorphism** - Modern frosted glass effects throughout
- 🎭 **Smooth Animations** - Fade-in, slide-up, and pulse animations
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- 🎨 **Premium Typography** - Inter font family for clean, modern text

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand with persistence
- **HTTP**: Axios with interceptors

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Backend running at `http://localhost:3001`

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Visit `http://localhost:3000`

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📁 Project Structure

```
fe/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                # Auth routes (grouped)
│   │   ├── login/            # Login page ✅
│   │   └── register/         # Registration page ✅
│   ├── admin/                # Admin dashboard ✅
│   │   ├── layout.tsx        # Admin layout with sidebar ✅
│   │   ├── page.tsx          # Dashboard stats ✅
│   │   ├── employees/        # Employee management
│   │   │   └── page.tsx      # Employee list ✅
│   │   ├── branches/         # Branch management (to create)
│   │   └── menu/             # Menu management (to create)
│   ├── staff/                # Staff dashboard (to create)
│   ├── menu/[branchId]/      # Customer menu (to create)
│   └── order/                # Order pages (to create)
├── components/
│   ├── ui/                   # Reusable UI components ✅
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── Spinner.tsx
│   ├── ProtectedRoute.tsx    # Auth wrapper ✅
│   ├── admin/                # Admin components
│   ├── staff/                # Staff components
│   └── customer/             # Customer components
├── lib/
│   ├── api/                  # API services ✅
│   │   ├── api-client.ts     # Axios instance
│   │   ├── auth-service.ts
│   │   ├── employee-service.ts
│   │   ├── branch-service.ts
│   │   ├── menu-service.ts
│   │   └── order-service.ts
│   ├── store/                # Zustand stores ✅
│   │   ├── auth-store.ts     # Authentication
│   │   └── cart-store.ts     # Shopping cart
│   ├── utils/                # Utilities ✅
│   │   ├── format.ts         # Formatters
│   │   ├── validation.ts     # Zod schemas
│   │   ├── order-helpers.ts  # Order utilities
│   │   └── cn.ts             # Class name merger
│   ├── hooks/                # Custom hooks ✅
│   │   └── useAuth.ts
│   └── types/                # TypeScript types ✅
│       └── index.ts
└── public/                   # Static assets
```

## ✅ Completed Features (40%)

### Foundation Layer
- ✅ TypeScript types for all models
- ✅ Axios API client with JWT interceptors
- ✅ API services for all backend endpoints
- ✅ Authentication store (Zustand)
- ✅ Shopping cart store (Zustand)
- ✅ Utility functions (formatting, validation, helpers)

### UI Components
- ✅ Button (5 variants, 3 sizes, loading state)
- ✅ Input (floating labels, error states)
- ✅ Card (glassmorphism, hover effects)
- ✅ Badge (status colors)
- ✅ Modal (ESC support, animations)
- ✅ Spinner (loading states)

### Authentication
- ✅ Login page with gradient background
- ✅ Registration page with role selection
- ✅ Protected route component
- ✅ Role-based redirects
- ✅ JWT token management

### Admin Dashboard
- ✅ Sidebar layout with navigation
- ✅ Dashboard with stats cards
- ✅ Employee list with search
- ✅ Delete confirmation modals
- ⏳ Employee create/edit forms
- ⏳ Branch management pages
- ⏳ Menu management pages

### Styling
- ✅ Dark mode theme
- ✅ Glassmorphism effects
- ✅ Gradient backgrounds
- ✅ Custom animations
- ✅ Inter font family

## 🚧 Remaining Work (60%)

### Admin Pages
- Create employee form (`/admin/employees/new`)
- Edit employee form (`/admin/employees/[id]`)
- Branch list page (`/admin/branches`)
- Branch create/edit forms
- QR code display and download
- Menu list page (`/admin/menu`)
- Menu create/edit forms

### Staff Dashboard
- Staff layout (`/staff/layout.tsx`)
- Active orders page (`/staff/orders`)
- Order cards with token numbers
- Status update buttons
- KOT/Bill PDF generation
- Order detail view

### Customer Interface
- Public menu page (`/menu/[branchId]`)
- Category filtering
- Add to cart functionality
- Cart sidebar component
- Order confirmation page
- Token display page with animations
- Order tracking page

## 🎨 Design System

### Colors
```css
--purple-gradient: from-purple-600 to-indigo-600
--success: #10B981 (green)
--warning: #F59E0B (orange)
--danger: #EF4444 (red)
--info: #3B82F6 (blue)
```

### Glassmorphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Typography
- Font: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700, 800

## 📝 Development Patterns

### Creating a New Page

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function NewPage() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Load data
  }, []);
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Title</h1>
      <Card variant="glass">
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Using Forms

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { schema } from '@/lib/utils/validation';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

const onSubmit = async (data) => {
  // Submit logic
};
```

### Using API Services

```typescript
import { employeeService } from '@/lib/api/employee-service';

// Get all
const employees = await employeeService.getEmployees();

// Create
await employeeService.createEmployee(data);

// Update
await employeeService.updateEmployee(id, data);

// Delete
await employeeService.deleteEmployee(id);
```

## 🧪 Testing

```bash
# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Build for production
pnpm build
```


## 🤝 Contributing

1. Follow the established design patterns
2. Use TypeScript strict mode
3. Add proper error handling
4. Keep components focused and reusable
5. Follow the glassmorphism design system

## 📄 License

Part of the Cafe Management System project.
