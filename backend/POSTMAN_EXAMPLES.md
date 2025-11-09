# Warehouse Management API - Postman Examples

This document provides detailed examples for testing the Warehouse Management API using Postman.

## Setup

1. Import the `Warehouse_API.postman_collection.json` file into Postman
2. Set the `baseUrl` variable to your server URL (default: `http://localhost:4000`)
3. Follow the authentication flow to get tokens

## Authentication Flow

### 1. Register a User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### 2. Login (User or Admin)
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "USER"
  }
}
```

**Note:** Save the token in the `userToken` or `adminToken` collection variable for subsequent requests.

## Categories

### Create Category (Admin Only)
```http
POST /api/categories
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic devices and components"
}
```

### Get All Categories
```http
GET /api/categories
Authorization: Bearer {userToken}
```

### Get Category by ID
```http
GET /api/categories/1
Authorization: Bearer {userToken}
```

## Items

### Create Item (Admin Only)
```http
POST /api/items
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "name": "Laptop Dell XPS 15",
  "sku": "LAP-DELL-XPS15-001",
  "barcode": "BC1234567890",
  "supplier": "Dell Inc.",
  "categoryId": 1,
  "initialQuantity": 10,
  "lowStockThreshold": 3,
  "status": "AVAILABLE"
}
```

**Note:** If `barcode` is not provided, it will be auto-generated.

### Get All Items (with filters)
```http
GET /api/items?status=AVAILABLE&categoryId=1&search=laptop
Authorization: Bearer {userToken}
```

**Query Parameters:**
- `status`: Filter by status (AVAILABLE, ISSUED)
- `categoryId`: Filter by category
- `search`: Search in name, SKU, or barcode

### Get Item by ID or Barcode
```http
GET /api/items/1
Authorization: Bearer {userToken}
```

or

```http
GET /api/items/BC1234567890
Authorization: Bearer {userToken}
```

### Update Item (Admin Only)
```http
PUT /api/items/1
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "name": "Laptop Dell XPS 15 (Updated)",
  "status": "ISSUED",
  "lowStockThreshold": 5
}
```

## Movements (Inbound/Outbound Requests)

### Request Inbound Movement (User)
```http
POST /api/movements
Authorization: Bearer {userToken}
Content-Type: application/json

{
  "itemId": 1,
  "type": "INBOUND",
  "quantity": 5,
  "notes": "New stock received from supplier"
}
```

**Response:**
```json
{
  "message": "Movement request created. Waiting for admin approval.",
  "movement": {
    "id": 1,
    "itemId": 1,
    "type": "INBOUND",
    "quantity": 5,
    "status": "PENDING",
    "requestedBy": {
      "id": 2,
      "email": "user@example.com",
      "role": "USER"
    }
  }
}
```

### Request Outbound Movement (User)
```http
POST /api/movements
Authorization: Bearer {userToken}
Content-Type: application/json

{
  "itemId": 1,
  "type": "OUTBOUND",
  "quantity": 2,
  "notes": "Need for project deployment"
}
```

### Get All Movements
```http
GET /api/movements?type=OUTBOUND&status=PENDING&itemId=1
Authorization: Bearer {userToken}
```

**Query Parameters:**
- `type`: INBOUND or OUTBOUND
- `status`: PENDING, APPROVED, or REJECTED
- `itemId`: Filter by item
- `userId`: Filter by user (Admin only)
- `isReturned`: true/false (for outbound)
- `from`: Start date (ISO format)
- `to`: End date (ISO format)

**Note:** Regular users can only see their own movements. Admins can see all.

### Approve Movement (Admin Only)
```http
POST /api/movements/1/approve
Authorization: Bearer {adminToken}
```

**Response:**
```json
{
  "message": "Movement approved and stock updated",
  "movement": {
    "id": 1,
    "status": "APPROVED",
    "approvedBy": {
      "id": 1,
      "email": "admin@example.com"
    }
  },
  "currentStock": 8
}
```

### Reject Movement (Admin Only)
```http
POST /api/movements/1/reject
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "reason": "Insufficient justification for this request"
}
```

### Return Item
```http
POST /api/movements/1/return
Authorization: Bearer {userToken}
```

**Note:** Users can only return items they requested. Admins can return any item.

## Tracking (Admin Only)

### Get Item Assignments
Shows who took which items and their return status.

```http
GET /api/tracking/assignments?userId=2&isReturned=false&status=ISSUED
Authorization: Bearer {adminToken}
```

**Query Parameters:**
- `userId`: Filter by user
- `itemId`: Filter by item
- `isReturned`: true/false
- `status`: Item status (AVAILABLE, ISSUED)

**Response:**
```json
{
  "total": 5,
  "assignments": [
    {
      "id": 1,
      "item": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001",
        "barcode": "BC1234567890",
        "category": "Electronics",
        "status": "ISSUED"
      },
      "quantity": 2,
      "requestedBy": {
        "id": 2,
        "email": "user@example.com",
        "role": "USER"
      },
      "approvedBy": {
        "id": 1,
        "email": "admin@example.com"
      },
      "isReturned": false,
      "returnedAt": null,
      "timestamp": "2024-01-15T10:30:00Z",
      "approvedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### Get User Activity Summary
Shows summary of all users' item requests and returns.

```http
GET /api/tracking/user-activity
Authorization: Bearer {adminToken}
```

**Response:**
```json
{
  "totalUsers": 3,
  "users": [
    {
      "userId": 2,
      "email": "user@example.com",
      "role": "USER",
      "stats": {
        "totalRequests": 5,
        "approved": 4,
        "pending": 1,
        "rejected": 0,
        "returned": 2,
        "notReturned": 2
      },
      "currentItems": [
        {
          "movementId": 1,
          "item": {
            "id": 1,
            "name": "Laptop Dell XPS 15",
            "barcode": "BC1234567890"
          },
          "quantity": 2,
          "takenAt": "2024-01-15T10:30:00Z"
        }
      ]
    }
  ]
}
```

### Get Pending Requests
Get all pending movement requests that need admin approval.

```http
GET /api/tracking/pending-requests
Authorization: Bearer {adminToken}
```

## Complete Workflow Example

### 1. Admin creates a category
```http
POST /api/categories
Authorization: Bearer {adminToken}
{
  "name": "Electronics",
  "description": "Electronic devices"
}
```

### 2. Admin creates an item
```http
POST /api/items
Authorization: Bearer {adminToken}
{
  "name": "Laptop",
  "sku": "LAP-001",
  "categoryId": 1,
  "initialQuantity": 10,
  "status": "AVAILABLE"
}
```

### 3. User requests to take an item (outbound)
```http
POST /api/movements
Authorization: Bearer {userToken}
{
  "itemId": 1,
  "type": "OUTBOUND",
  "quantity": 2,
  "notes": "For project work"
}
```

### 4. Admin approves the request
```http
POST /api/movements/1/approve
Authorization: Bearer {adminToken}
```

### 5. Admin checks who has which items
```http
GET /api/tracking/assignments?isReturned=false
Authorization: Bearer {adminToken}
```

### 6. User returns the item
```http
POST /api/movements/1/return
Authorization: Bearer {userToken}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message description"
}
```

## Notes

1. **Role-based Access:**
   - Regular users (`USER` role) can request movements and view their own data
   - Admins (`ADMIN` role) can manage items, categories, approve/reject movements, and view all data

2. **Movement Workflow:**
   - Users create movement requests with `PENDING` status
   - Admins approve or reject requests
   - When approved, stock is automatically updated
   - Users can return items they've taken

3. **Item Status:**
   - `AVAILABLE`: Item is available for use
   - `ISSUED`: Item has been issued (stock = 0)

4. **Barcode:**
   - Can be provided manually or auto-generated
   - Can be used to look up items instead of ID

