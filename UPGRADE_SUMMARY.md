# 🚀 Upgrade to Next.js 15 and React 19

## Summary
This PR upgrades the project from Next.js 13.4.11 to Next.js 15.5.6 and React 18 to React 19, along with all necessary dependency updates and breaking change fixes.

## 📦 Dependency Updates

### Major Upgrades
- **Next.js**: `13.4.11` → `15.5.6`
- **React**: `18.2.0` → `19.2.0`
- **React DOM**: `18.2.0` → `19.2.0`
- **@clerk/nextjs**: `4.23.0` → `6.33.7`

### Updated Dependencies
- **@radix-ui/react-avatar**: `1.0.3` → `1.1.10`
- **@radix-ui/react-dialog**: `1.0.4` → `1.1.15`
- **@radix-ui/react-label**: `2.0.2` → `2.1.7`
- **@radix-ui/react-slot**: `1.0.2` → `1.2.3`

### Dev Dependencies
- **@types/react**: `18.2.15` → `19.2.2`
- **@types/react-dom**: `18.2.7` → `19.2.2`
- **eslint-config-next**: `13.4.11` → `15.5.6`
- **typescript**: `5.1.6` → `5.9.3`

## 🔧 Breaking Changes & Fixes

### 1. Clerk v6 Migration

**Updated authentication imports** (`app/api/conversation/route.ts`, `app/api/sqlconversation/route.ts`)
```typescript
// Before
import { auth } from "@clerk/nextjs";
const { userId } = auth();

// After
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
```

**Migrated middleware** (`middleware.ts`)
```typescript
// Before
import { authMiddleware } from "@clerk/nextjs";
export default authMiddleware({
  publicRoutes: ["/"]
});

// After
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isPublicRoute = createRouteMatcher(['/']);
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
```

**Updated user profile property** (`components/user-avatar.tsx`)
```typescript
// Before
<AvatarImage src={user?.profileImageUrl} />

// After
<AvatarImage src={user?.imageUrl} />
```

### 2. Radix UI Updates

**Fixed Dialog Portal props** (`components/ui/sheet.tsx`)
```typescript
// Before
const SheetPortal = ({
  className,
  ...props
}: SheetPrimitive.DialogPortalProps) => (
  <SheetPrimitive.Portal className={cn(className)} {...props} />
)

// After
const SheetPortal = (props: SheetPrimitive.DialogPortalProps) => (
  <SheetPrimitive.Portal {...props} />
)
```

## ✅ Verification
- All TypeScript type checks pass
- Build completes successfully
- No runtime errors detected

## 📚 Key Changes in Next.js 15
- **Async Request APIs**: Functions like `auth()`, `cookies()`, and `headers()` now return Promises
- **Caching Behavior**: Default changed from cached to uncached for GET Route Handlers
- **Turbopack**: Now stable for development
- **React 19 Support**: Full compatibility with React 19 features

## 📚 Key Changes in Clerk v6
- Server-side functions must be imported from `@clerk/nextjs/server`
- `auth()` is now async and must be awaited
- `authMiddleware` deprecated in favor of `clerkMiddleware` with explicit route protection
- User properties renamed (e.g., `profileImageUrl` → `imageUrl`)

## 🎯 Migration Impact
This upgrade brings significant performance improvements and access to the latest features in both Next.js and React ecosystems. All breaking changes have been addressed and the application builds successfully.
