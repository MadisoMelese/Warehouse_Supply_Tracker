# Warehouse Management System - Changes Summary

## Overview
This document summarizes all the updates made to the Warehouse Management System backend to implement role-based access control, approval workflows, item tracking, and enhanced features.

## Key Changes

### 1. Role-Based Access Control
- **Admin Role**: Full access to all endpoints
- **User Role**: Can request movements and view their own data
- **Middleware**: Created `admin.js` middleware to protect admin-only routes

### 2. User Management
- ✅ **Get All Users**: Now restricted to admin only (`GET /auth/users`)
- Users can only see their own movement history
- Admins can see all users and their activities

### 3. Item Status System
- Added `ItemStatus` enum: `AVAILABLE`, `ISSUED`
- Items automatically change status based on stock:
  - `AVAILABLE`: Item has stock > 0
  - `ISSUED`: Item stock = 0 (all items taken)

### 4. Categories
- New `Category` model for organizing items
- Categories must be created before items
- Items require a `categoryId` when created
- Admin-only: Create, Update, Delete categories
- All users: View categories

### 5. Barcode System
- Every item now has a unique `barcode` field
- Barcodes can be:
  - Manually provided when creating items
  - Auto-generated if not provided (format: `BC` + 16 hex characters)
- Items can be looked up by ID or barcode

### 6. Movement Approval Workflow
- **Request Phase** (User):
  - Users create movement requests with `PENDING` status
  - Requests include: itemId, type (INBOUND/OUTBOUND), quantity, notes
  - Stock is NOT updated until approved

- **Approval Phase** (Admin):
  - Admins can approve or reject pending requests
  - When approved:
    - Stock is automatically updated
    - Item status changes if needed (ISSUED when stock = 0)
    - Movement status changes to `APPROVED`
  - When rejected:
    - Movement status changes to `REJECTED`
    - Admin can provide rejection reason

- **Return Phase**:
  - Users can return items they've taken
  - Admins can return any item
  - When returned:
    - Stock is restored
    - Item status changes to `AVAILABLE`
    - `isReturned` flag is set to `true`

### 7. Admin Tracking Features
- **Item Assignments** (`GET /api/tracking/assignments`):
  - See who took which items
  - Filter by user, item, return status
  - Shows complete assignment history

- **User Activity Summary** (`GET /api/tracking/user-activity`):
  - Overview of all users' requests
  - Statistics: total requests, approved, pending, rejected, returned
  - Current items each user has

- **Pending Requests** (`GET /api/tracking/pending-requests`):
  - List all pending movement requests
  - Helps admins prioritize approvals

## Database Schema Changes

### New Models
- `Category`: Stores item categories
- Updated `Movement`: Added approval workflow fields
- Updated `User`: Changed role to enum, added relations

### New Fields
- `Item`:
  - `barcode` (unique, required)
  - `categoryId` (required, foreign key)
  - `status` (enum: AVAILABLE, ISSUED)

- `Movement`:
  - `status` (enum: PENDING, APPROVED, REJECTED)
  - `requestedById` (required, foreign key)
  - `approvedById` (optional, foreign key)
  - `isReturned` (boolean)
  - `returnedAt` (datetime)
  - `notes` (text)

- `User`:
  - `role` (enum: USER, ADMIN)
  - `updatedAt` (timestamp)

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user (defaults to USER role)
- `POST /auth/login` - Login (returns token + user info)
- `GET /auth/users` - Get all users (Admin only)

### Categories
- `POST /api/categories` - Create category (Admin)
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Items
- `POST /api/items` - Create item (Admin)
- `GET /api/items` - Get all items (with filters: status, categoryId, search)
- `GET /api/items/:id` - Get item by ID or barcode
- `PUT /api/items/:id` - Update item (Admin)
- `DELETE /api/items/:id` - Delete item (Admin)

### Movements
- `POST /api/movements` - Request movement (User)
- `GET /api/movements` - Get movements (Users see own, Admins see all)
- `GET /api/movements/:id` - Get movement by ID
- `POST /api/movements/:id/approve` - Approve movement (Admin)
- `POST /api/movements/:id/reject` - Reject movement (Admin)
- `POST /api/movements/:id/return` - Return item

### Tracking (Admin Only)
- `GET /api/tracking/assignments` - Get item assignments
- `GET /api/tracking/user-activity` - Get user activity summary
- `GET /api/tracking/pending-requests` - Get pending requests

## Migration Steps

1. **Run Database Migration**:
   ```bash
   npx prisma migrate dev --name add_approval_workflow
   ```

2. **Update Seed Data**:
   ```bash
   npm run seed
   ```

3. **Update Existing Users** (if any):
   - Update user roles to use enum values: `USER` or `ADMIN`
   - Example SQL: `UPDATE "User" SET role = 'USER' WHERE role = 'user';`

4. **Create Categories**:
   - Use the API or seed file to create initial categories
   - Update existing items to have a categoryId

5. **Add Barcodes to Existing Items**:
   - Items will need barcodes added
   - Can be done via API update or migration script

## Testing

1. **Import Postman Collection**:
   - Import `Warehouse_API.postman_collection.json`
   - Set `baseUrl` variable to your server URL

2. **Test Flow**:
   - Register/Login as admin
   - Create categories
   - Create items
   - Login as user
   - Request movements
   - Login as admin
   - Approve/reject requests
   - Check tracking endpoints

3. **Test Credentials** (from seed):
   - Admin: `admin@example.com` / `AdminPass123!`
   - User: `user@example.com` / `UserPass123!`

## Code Quality Improvements

- ✅ Professional error handling with try-catch blocks
- ✅ Comprehensive input validation
- ✅ Proper HTTP status codes
- ✅ Transaction-based operations for data integrity
- ✅ Role-based access control throughout
- ✅ Detailed API documentation
- ✅ Postman collection with examples
- ✅ Clean, maintainable code structure

## Security Enhancements

- ✅ JWT-based authentication
- ✅ Role-based authorization
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Input validation and sanitization
- ✅ SQL injection protection (Prisma ORM)
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ CORS configuration

## Notes

- All timestamps are in UTC
- Barcodes are auto-generated if not provided
- Stock updates only happen when movements are approved
- Item status automatically updates based on stock levels
- Users can only see and manage their own movement requests
- Admins have full visibility and control

