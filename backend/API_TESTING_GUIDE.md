# API Testing Guide

This guide explains how to test the Tender and Bid APIs for the Tenderflow application.

## Prerequisites

1. **Server Running**: Make sure your backend server is running on `http://localhost:5000`
2. **Database Connected**: Ensure MongoDB is connected and running
3. **Environment Variables**: Make sure `.env` file has `JWT_SECRET` configured

## Available Test Scripts

### 1. Node.js Test Script (Recommended)

**File**: `test-api.js`

**Requirements**: Node.js 18+ (has built-in `fetch`)

**Usage**:
```bash
cd backend
node test-api.js
```

**What it tests**:
- ✅ Authentication (Register, Login, Get Me)
- ✅ Tender CRUD operations
- ✅ Tender status management (Publish, Close, Award)
- ✅ Bid creation and management
- ✅ Complete workflow: Create Tender → Publish → Create Bid → Submit → Close → Award

### 2. cURL Test Script

**File**: `test-api-curl.sh`

**Usage** (Linux/Mac/Git Bash):
```bash
cd backend
chmod +x test-api-curl.sh
./test-api-curl.sh
```

**Usage** (Windows PowerShell):
```powershell
cd backend
bash test-api-curl.sh
```

## Manual Testing with Postman/Thunder Client

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### 1. Register Company Admin
```
POST /api/auth/register-company-admin
Content-Type: application/json

{
  "companyName": "Test Company",
  "emailDomain": "test.com",
  "industry": "Technology",
  "services": ["Software Development"],
  "adminName": "Admin User",
  "adminEmail": "admin@test.com",
  "adminPassword": "Test123!@#"
}
```

**Response**: Returns `token` - save this for authenticated requests

#### 2. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Test123!@#"
}
```

#### 3. Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```

### Tender Endpoints

#### 1. Create Tender
```
POST /api/tenders
Authorization: Bearer <company_admin_token>
Content-Type: application/json

{
  "title": "Software Development Project",
  "description": "We need a team to develop a web application",
  "budgetMin": 50000,
  "budgetMax": 100000,
  "emdAmount": 5000,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  "category": "Software Development",
  "tags": ["web-development", "nodejs", "react"],
  "documents": [
    {
      "url": "https://example.com/doc.pdf",
      "name": "Requirements",
      "type": "application/pdf"
    }
  ]
}
```

**Required Roles**: `COMPANY_ADMIN` or `TENDER_POSTER`

#### 2. Get My Company Tenders
```
GET /api/tenders/my-company
Authorization: Bearer <token>
```

#### 3. Get Available Tenders (Published)
```
GET /api/tenders/available
Authorization: Bearer <token>
```

**Required Roles**: `BIDDER`, `COMPANY_ADMIN`, or `TENDER_POSTER`

#### 4. Get Tender By ID
```
GET /api/tenders/:id
Authorization: Bearer <token>
```

#### 5. Publish Tender
```
PATCH /api/tenders/:id/publish
Authorization: Bearer <company_admin_token>
```

**Required**: Tender must be in `DRAFT` status

#### 6. Close Tender
```
PATCH /api/tenders/:id/close
Authorization: Bearer <company_admin_token>
```

**Required**: Tender must be in `PUBLISHED` status

#### 7. Award Tender
```
PATCH /api/tenders/:id/award
Authorization: Bearer <company_admin_token>
Content-Type: application/json

{
  "winningBidId": "<bid_id>"
}
```

**Required**: Tender must be in `CLOSED` status

### Bid Endpoints

#### 1. Create Bid (Draft)
```
POST /api/bids
Authorization: Bearer <bidder_token>
Content-Type: application/json

{
  "tenderId": "<tender_id>",
  "amount": 75000,
  "deliveryDays": 90,
  "validTill": "2024-03-01T00:00:00Z",
  "documents": [
    {
      "url": "https://example.com/proposal.pdf",
      "name": "Bid Proposal",
      "type": "application/pdf"
    }
  ],
  "notes": "We have extensive experience in similar projects"
}
```

**Required Roles**: `BIDDER`
**Required**: Tender must be `PUBLISHED`

#### 2. Update Bid
```
PATCH /api/bids/:id
Authorization: Bearer <bidder_token>
Content-Type: application/json

{
  "amount": 70000,
  "deliveryDays": 85,
  "notes": "Updated proposal"
}
```

**Required**: Bid must be in `DRAFT` status

#### 3. Submit Bid
```
PATCH /api/bids/:id/submit
Authorization: Bearer <bidder_token>
```

**Required**: Bid must be in `DRAFT` status

#### 4. Withdraw Bid
```
PATCH /api/bids/:id/withdraw
Authorization: Bearer <bidder_token>
```

**Required**: Bid must be in `SUBMITTED` status

#### 5. Get My Company Bids
```
GET /api/bids/my-company
Authorization: Bearer <token>
```

#### 6. Get Tender Bids (Owner View)
```
GET /api/bids/tender/:tenderId
Authorization: Bearer <company_admin_token>
```

**Required Roles**: `COMPANY_ADMIN`, `TENDER_POSTER`, or `SUPER_ADMIN`

## Complete Test Flow

1. **Register two companies**:
   - Company A (Admin) - to create tenders
   - Company B (Bidder) - to place bids

2. **Create a tender** (as Company A admin):
   - Status will be `DRAFT`

3. **Publish the tender** (as Company A admin):
   - Status changes to `PUBLISHED`

4. **Create a bid** (as Company B bidder):
   - Status will be `DRAFT`

5. **Update the bid** (optional, as Company B bidder)

6. **Submit the bid** (as Company B bidder):
   - Status changes to `SUBMITTED`

7. **View bids** (as Company A admin):
   - Get all bids for the tender

8. **Close the tender** (as Company A admin):
   - Status changes to `CLOSED`

9. **Award the tender** (as Company A admin):
   - Status changes to `AWARDED`
   - Winning bid status changes to `ACCEPTED`
   - Other bids change to `REJECTED`

## Status Flow

### Tender Status Flow
```
DRAFT → PUBLISHED → CLOSED → AWARDED
```

### Bid Status Flow
```
DRAFT → SUBMITTED → (ACCEPTED | REJECTED | WITHDRAWN)
```

## Common Issues

### 1. "Forbidden" or 403 Error
- Check that you're using the correct token
- Verify the user has the required role
- Ensure the resource belongs to the user's company (for company-specific resources)

### 2. "Tender not found" or 404 Error
- Verify the tender ID is correct
- Check if the tender exists in the database
- Ensure you have access to view the tender (must be PUBLISHED or from your company)

### 3. "Only DRAFT tenders can be published"
- The tender must be in `DRAFT` status before publishing
- Check the current status of the tender

### 4. "Can only bid on PUBLISHED tenders"
- The tender must be `PUBLISHED` before creating bids
- Publish the tender first using the `/publish` endpoint

### 5. Authentication Token Issues
- Tokens expire after 7 days
- Make sure you're including the token in the `Authorization` header as `Bearer <token>`
- Re-login if token has expired

## Testing Tips

1. **Use different users for different roles**: Create separate accounts for testing different scenarios
2. **Save IDs**: When creating resources, save the returned IDs for subsequent requests
3. **Check status**: Always verify the status of resources before performing status-dependent operations
4. **Test error cases**: Try invalid data, missing fields, and unauthorized access
5. **Clean up**: Consider cleaning up test data after testing

## Environment Variables

Make sure your `.env` file includes:
```
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://localhost:27017/tenderflow
PORT=5000
```

## Next Steps

After testing, you can:
- Integrate with a frontend application
- Add more validation and business logic
- Implement file upload for documents
- Add email notifications
- Implement real-time updates with WebSockets

app password  : dqyr nfwf bkok dddx