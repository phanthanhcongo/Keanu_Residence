# 📚 API Testing Documentation

**Base URL**: `http://localhost:3000` (hoặc URL production của bạn)

**Authentication**: Hầu hết các API yêu cầu JWT token trong header:
```
Authorization: Bearer <your_access_token>
```

---

## **1. Auth API** (`/auth`)

### 1.1. Đăng ký
**POST** `/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "interest": "buying_to_live" // Optional: buying_to_live | buying_as_investment | buying_for_holiday | not_a_buyer
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email for OTP.",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

### 1.2. Đăng nhập
**POST** `/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-20T10:00:00Z",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "USER"
  }
}
```
*Note: Refresh token được set trong cookie `refresh_token`*

---

### 1.3. Xác thực OTP
**POST** `/auth/verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Verification successful! Your account has been activated.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-20T10:00:00Z",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "isVerified": true
  }
}
```

---

### 1.4. Gửi lại OTP
**POST** `/auth/resend-otp`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully"
}
```

---

### 1.5. Quên mật khẩu - Yêu cầu OTP
**POST** `/auth/forgot-password/request`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email"
}
```

---

### 1.6. Quên mật khẩu - Xác thực OTP
**POST** `/auth/forgot-password/verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully"
}
```

---

### 1.7. Reset mật khẩu
**POST** `/auth/forgot-password/reset`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

### 1.8. Lấy thông tin user hiện tại
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "USER",
  "isVerified": true,
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

### 1.9. Refresh token
**POST** `/auth/refresh`

**Headers:**
```
Content-Type: application/json
```
*Note: Refresh token được lấy từ cookie `refresh_token`*

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-20T10:00:00Z"
}
```

---

### 1.10. Logout
**POST** `/auth/logout`

**Headers:**
```
Content-Type: application/json
```
*Note: Refresh token được lấy từ cookie `refresh_token`*

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

## **2. Users API** (`/users`)

### 2.1. Lấy profile
**GET** `/users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "phoneNumber": "+84901234567",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "address": "123 Main Street",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "avatarUrl": "https://example.com/avatar.jpg",
  "isProfileComplete": true
}
```

---

### 2.2. Cập nhật profile
**PATCH** `/users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+84901234567",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "address": "123 Main Street",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```
*Tất cả các field đều optional*

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  ...
}
```

---

### 2.3. Upload avatar
**POST** `/users/profile/avatar`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
file: <image_file> (max 5MB, jpg/jpeg/png/gif/webp)
```

**Response:**
```json
{
  "avatarUrl": "https://example.com/uploads/avatar-123.jpg"
}
```

---

## **3. Units API** (`/units`)

### 3.1. Lấy danh sách villas với filter
**GET** `/units/villas`

**Query Parameters:**
```
?unitType=VILLA
&status=AVAILABLE,RESERVED,SOLD
&projectId=123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "unitNumber": "V-101",
      "unitType": "VILLA",
      "floor": 1,
      "size": 150,
      "bedrooms": 3,
      "bathrooms": 2,
      "price": 5000000,
      "status": "AVAILABLE",
      "imageUrls": ["https://example.com/image1.jpg"],
      "project": {
        "id": "project-id",
        "name": "Luxury Villas",
        "slug": "luxury-villas"
      }
    }
  ],
  "total": 10
}
```

---

## **4. Admin API** (`/admin`)

**Tất cả endpoints yêu cầu:**
- `Authorization: Bearer <admin_access_token>`
- User phải có role `ADMIN` hoặc `SUPER_ADMIN`

---

### 4.1. Quản lý Users

#### 4.1.1. List users
**GET** `/admin/users`

**Query Parameters:**
```
?search=john
&role=USER
&isVerified=true
&page=1
&limit=20
&includeDeleted=false
```

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "role": "USER",
      "isVerified": true,
      "isLocked": false,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### 4.1.2. Get user detail
**GET** `/admin/users/:id`

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "USER",
  "profile": { ... },
  "reservations": [ ... ],
  "shortlist": [ ... ]
}
```

---

#### 4.1.3. Update user role
**PATCH** `/admin/users/:id/role`

**Request Body:**
```json
{
  "role": "ADMIN" // USER | ADMIN | SUPER_ADMIN
}
```

---

#### 4.1.4. Update user status
**PATCH** `/admin/users/:id/status`

**Request Body:**
```json
{
  "isLocked": false,
  "isVerified": true
}
```

---

### 4.2. Quản lý Projects

#### 4.2.1. List projects
**GET** `/admin/projects`

**Query Parameters:**
```
?search=skyview
&status=ACTIVE
&page=1
&limit=20
&includeDeleted=false
```

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Skyview Towers",
      "slug": "skyview-towers",
      "developer": "ABC Corp",
      "status": "ACTIVE",
      "launchDate": "2025-06-01",
      "launchTime": "10:00:00",
      "timezone": "Asia/Ho_Chi_Minh"
    }
  ],
  "pagination": { ... }
}
```

---

#### 4.2.2. Get project detail
**GET** `/admin/projects/:id`

---

#### 4.2.3. Create project
**POST** `/admin/projects`

**Request Body:**
```json
{
  "name": "Skyview Towers",
  "slug": "skyview-towers",
  "description": "Luxury residential project",
  "developer": "ABC Corp",
  "location": "Ho Chi Minh City",
  "launchDate": "2025-06-01",
  "launchTime": "10:00:00",
  "timezone": "Asia/Ho_Chi_Minh",
  "status": "ACTIVE",
  "logoUrl": "https://example.com/logo.png",
  "primaryColor": "#B4533A",
  "secondaryColor": "#BBAF9F",
  "heroImageUrl": "https://example.com/hero.jpg",
  "videoUrl": "https://example.com/video.mp4",
  "termsUrl": "https://example.com/terms",
  "policyUrl": "https://example.com/policy",
  "reservationDuration": 10,
  "depositAmount": 50000
}
```

---

#### 4.2.4. Update project
**PATCH** `/admin/projects/:id`

**Request Body:**
```json
{
  "name": "Skyview Towers Updated",
  "launchDate": "2025-07-01",
  "launchTime": "11:00:00",
  "timezone": "Asia/Ho_Chi_Minh"
}
```
*Tất cả các field đều optional. Khi update launchDate/launchTime/timezone, hệ thống sẽ tự động reschedule launch job.*

---

#### 4.2.5. Delete project
**DELETE** `/admin/projects/:id`

---

#### 4.2.6. Restore project
**PATCH** `/admin/projects/:id/restore`

---

### 4.3. Quản lý Units

#### 4.3.1. List units
**GET** `List units`

**Query Parameters:**
```
?projectId=123e4567-e89b-12d3-a456-426614174000
&status=AVAILABLE
&unitType=VILLA
&minPrice=1000000
&maxPrice=10000000
&page=1
&limit=20
&includeDeleted=false
```

---

#### 4.3.2. Get unit detail
**GET** `/admin/units/:id`

---

#### 4.3.3. Create unit
**POST** `/admin/units`

**Request Body:**
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "unitNumber": "V-101",
  "unitType": "VILLA",
  "floor": 1,
  "size": 150,
  "bedrooms": 3,
  "bathrooms": 2,
  "price": 5000000,
  "status": "AVAILABLE",
  "description": "Luxury villa with ocean view",
  "floorPlanUrl": "https://example.com/floorplan.jpg",
  "imageUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "features": {
    "parking": true,
    "balcony": true
  },
  "xPosition": 100,
  "yPosition": 200
}
```

---

#### 4.3.4. Update unit
**PATCH** `/admin/units/:id`

**Request Body:**
```json
{
  "price": 5500000,
  "status": "RESERVED",
  "imageUrls": ["https://example.com/new-image.jpg"]
}
```
*Tất cả các field đều optional*

---

#### 4.3.5. Delete unit
**DELETE** `/admin/units/:id`

---

#### 4.3.6. Restore unit
**PATCH** `/admin/units/:id/restore`

---

#### 4.3.7. Upload unit images
**POST** `/admin/units/:id/images`

**Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
files: <image_file_1>, <image_file_2>, ... (max 10 files, 10MB each)
```

**Response:**
```json
{
  "imageUrls": [
    "https://example.com/unit-image-1.jpg",
    "https://example.com/unit-image-2.jpg"
  ]
}
```

---

### 4.4. Quản lý Reservations

#### 4.4.1. List reservations
**GET** `/admin/reservations`

**Query Parameters:**
```
?userId=123e4567-e89b-12d3-a456-426614174000
&projectId=123e4567-e89b-12d3-a456-426614174000
&unitId=123e4567-e89b-12d3-a456-426614174000
&status=PENDING
&paymentStatus=PENDING
&page=1
&limit=20
&includeDeleted=false
```

**Response:**
```json
{
  "data": [
    {
      "id": "reservation-id",
      "userId": "user-id",
      "unitId": "unit-id",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "depositAmount": 50000,
      "lockedAt": "2025-01-20T10:00:00Z",
      "expiresAt": "2025-01-20T10:10:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### 4.4.2. Get reservation detail
**GET** `/admin/reservations/:id`

---

#### 4.4.3. Update reservation status
**PATCH** `/admin/reservations/:id/status`

**Request Body:**
```json
{
  "status": "CONFIRMED" // PENDING | CONFIRMED | EXPIRED | CANCELLED | FAILED
}
```

---

#### 4.4.4. Update payment status
**PATCH** `/admin/reservations/:id/payment-status`

**Request Body:**
```json
{
  "paymentStatus": "PAID" // PENDING | PAID | FAILED | REFUNDED
}
```

---

### 4.5. Quản lý OTP

#### 4.5.1. List email OTPs
**GET** `/admin/email-otps`

**Query Parameters:**
```
?userId=123e4567-e89b-12d3-a456-426614174000
&email=user@example.com
&verified=true
&page=1
&limit=20
```

---



### 4.6. Activity Logs

#### 4.6.1. List activity logs
**GET** `/admin/activity-logs`

**Query Parameters:**
```
?userId=123e4567-e89b-12d3-a456-426614174000
&action=UNIT_VIEW
&entity=Unit
&entityId=123e4567-e89b-12d3-a456-426614174000
&startDate=2025-01-01
&endDate=2025-01-31
&page=1
&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "log-id",
      "userId": "user-id",
      "action": "UNIT_VIEW",
      "entity": "Unit",
      "entityId": "unit-id",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 4.7. Statistics

#### 4.7.1. Get statistics
**GET** `/admin/statistics`

**Query Parameters:**
```
?period=month // day | week | month | year
&days=30 // 7-365
```

**Response:**
```json
{
  "visits": [
    {
      "date": "2025-01-01",
      "count": 100
    }
  ],
  "registrations": [
    {
      "date": "2025-01-01",
      "count": 10
    }
  ]
}
```

---

## **5. Activity API** (`/activity`)

### 5.1. Log visit (authenticated)
**POST** `/activity/log-visit`

**Headers:**
```
Authorization: Bearer <access_token> // Optional
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "UNIT_VIEW", // HOME_PAGE_VIEW | EXPLORE_PAGE_VIEW | UNIT_VIEW | PROJECT_VIEW | LOGIN | SEARCH | PAGE_VIEW
  "entity": "Unit", // Optional
  "entityId": "123e4567-e89b-12d3-a456-426614174000", // Optional
  "metadata": { // Optional
    "searchQuery": "villa",
    "filterType": "price"
  }
}
```

**Response:**
```json
{
  "message": "Visit logged successfully"
}
```

---

### 5.2. Log visit (anonymous)
**POST** `/activity/log-visit-anonymous`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "HOME_PAGE_VIEW",
  "entity": "Page",
  "entityId": "home",
  "metadata": {}
}
```

---

## **6. GHL Integration API** (`/api/v1/integrations/ghl`)

### 6.1. OAuth authorization
**POST** `/api/v1/integrations/ghl/oauth/authorize`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=..."
  }
}
```

---

### 6.2. Check integration status
**GET** `/api/v1/integrations/ghl/oauth/status`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "locationId": "location-id",
    "locationName": "My Location",
    "connectedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

### 6.3. Disconnect integration
**DELETE** `/api/v1/integrations/ghl/oauth/disconnect`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "GHL integration disconnected successfully"
}
```

---

### 6.4. Handle user event
**POST** `/api/v1/integrations/ghl/contacts/events`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventType": "signup", // signup | fullProfile | shortlist | enquiry | reserve | deposit | login
  "contactData": {
    "email": "user@example.com",
    "phone": "+84901234567",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "Male",
    "address": "123 Main Street",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "dateOfBirth": "1990-01-01",
    "interest": "buying_to_live"
  },
  "metadata": {
    "unitId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contactId": "ghl-contact-id",
    "tagsAdded": ["DD.Signup", "DD.Shortlisted"]
  }
}
```

---

### 6.5. Get contacts list
**GET** `/api/v1/integrations/ghl/contacts`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?limit=50
&startAfter=cursor-string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact-id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    ],
    "nextCursor": "cursor-string"
  }
}
```

---

### 6.6. Get contact by ID
**GET** `/api/v1/integrations/ghl/contacts/:contactId`

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 6.7. Update contact
**PUT** `/api/v1/integrations/ghl/contacts/:contactId`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+84901234567"
}
```

---

### 6.8. Delete contact
**DELETE** `/api/v1/integrations/ghl/contacts/:contactId`

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 6.9. Add tags to contact
**POST** `/api/v1/integrations/ghl/contacts/:contactId/tags`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tags": ["DD.Signup", "DD.Shortlisted", "DD.Reserved"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tags added successfully"
}
```

---

## **7. GHL OAuth Callback API** (`/api/v1/oauth`)

### 7.1. OAuth callback
**GET** `/api/v1/oauth/callback`

**Query Parameters:**
```
?code=authorization_code
&locationId=location-id
&userId=user-id
```

*Endpoint này được GHL gọi sau khi user authorize. Tự động redirect về frontend.*

---
