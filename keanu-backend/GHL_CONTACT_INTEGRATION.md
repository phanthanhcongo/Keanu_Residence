# GHL Contact Integration

## 📋 Tổng quan

Tích hợp GoHighLevel (GHL) để tự động upsert contact và thêm tags khi user thực hiện các hành động trên hệ thống. Hệ thống hỗ trợ 7 loại events: `signup`, `fullProfile`, `shortlist`, `enquiry`, `reserve`, `deposit`, `login`.

## 🏗️ Kiến trúc

### Layers

1. **Frontend Services** → Gọi GHL Events API
2. **GHL Contact Controller** → Nhận requests từ frontend
3. **GHL Contact Service** → Business logic, map events → tags
4. **GHL Tag Utils** → Reusable utilities cho tag operations
5. **GHL OAuth Service** → Quản lý authentication, token refresh
6. **GHL API Client** → HTTP client gọi GHL API

### File Structure

```
keanu-backend/src/modules/integrations/ghl/
├── ghl-contact.controller.ts      # API endpoints
├── ghl-contact.service.ts         # Business logic
├── ghl-oauth.service.ts           # OAuth & token management
├── providers/
│   └── ghl-api-client.ts          # GHL API HTTP client
└── utils/
    └── ghl-tag.utils.ts           # Tag utilities
```

---

## 🔐 OAuth Flow (Admin Setup)

### 1. Admin kết nối GHL

**Endpoint**: `POST /api/v1/integrations/ghl/oauth/authorize` (Cần JWT - Admin)

**Flow**:
1. Admin login và authorize JWT token
2. Gọi endpoint → Generate authorization URL với state & nonce
3. Redirect đến GHL authorization page
4. Admin chọn location và authorize
5. GHL redirect về callback với code
6. Backend exchange code → access_token + refresh_token
7. Lưu encrypted credentials vào database

**Cách test trong Swagger**:
1. Login với admin account: `POST /auth/login`
2. Copy `accessToken` từ response
3. Click **"Authorize"** ở góc trên bên phải
4. Nhập: `Bearer YOUR_ACCESS_TOKEN`
5. Test: `POST /api/v1/integrations/ghl/oauth/authorize`
6. Browser redirect đến GHL → Chọn location → Authorize
7. Kiểm tra status: `GET /api/v1/integrations/ghl/oauth/status`

### 2. OAuth Callback

**Endpoint**: `GET /api/v1/integrations/ghl/oauth/callback`

Tự động được GHL gọi sau khi admin authorize. Xử lý:
- Validate state & nonce
- Exchange authorization code → tokens
- Lưu encrypted credentials vào `Integration` table
- Set status = `active`

### 3. Token Management

**Auto-refresh**: Token tự động refresh khi:
- Token expired hoặc sắp expire (trong 5 phút)
- API call nhận 401 Unauthorized

**Location**: `ghl-oauth.service.ts` → `createGHLClient()`

---

## 📊 Integration Management

### Kiểm tra trạng thái

**Endpoint**: `GET /api/v1/integrations/ghl/oauth/status` (Cần JWT)

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "status": "active",
    "locationId": "location_123",
    "tokenExpired": false
  }
}
```

### Ngắt kết nối

**Endpoint**: `DELETE /api/v1/integrations/ghl/oauth/disconnect` (Cần JWT)

Set integration status = `inactive` hoặc `isDeleted = true`.

---

## 🎯 Event Types & Tags Mapping

Hệ thống hỗ trợ 7 loại events, mỗi event được map thành tags tương ứng:

| Event Type | Tags | Mô tả |
|------------|------|-------|
| `signup` | `DD.Signup` | User đăng ký tài khoản |
| `fullProfile` | `DD.FullProfile` | User hoàn thành profile đầy đủ |
| `shortlist` | `DD.Shortlisted`<br>`DD.Shortlist.{unitId}` | User thêm unit vào shortlist |
| `enquiry` | `DD.Enquiry`<br>`DD.Enquire.{unitId}` | User gửi enquiry cho unit |
| `reserve` | `DD.Reserved` | User tạo reservation |
| `deposit` | `DD.Deposit` | User thanh toán deposit |
| `login` | `DD.Login` | User đăng nhập |

**Location**: `ghl-contact.service.ts` → `getTagsForEvent()`

---

## 🔄 Flow chi tiết

### Flow 1: User đăng ký (Signup)

**Backend Flow**:
```
POST /auth/register
  → AuthService.register()
  → Tạo user trong database
  → Gửi OTP email
  → GHLContactService.upsertContactFromUser(userId, undefined, 'signup')
    → Lấy user data từ database
    → GHLOAuthService.createGHLClient() [auto-refresh token nếu cần]
    → GHLApiClient.upsertContact(contactData)
    → Lưu ghlContactId vào user record
    → getTagsForEvent('signup') → ['DD.Signup']
    → addTagsToGHLContact() → GHLApiClient.addTags()
```

**File**: `auth.service.ts` line 144

**Contact Data**:
- Email (required)
- First Name, Last Name
- Phone Number (nếu có)
- Custom Field: `interest` (nếu có)

---

### Flow 2: User hoàn thành profile (Full Profile)

**Backend Flow**:
```
PUT /users/profile
  → UsersService.updateProfile()
  → Update user trong database
  → Check if profile is complete (firstName, lastName, phoneNumber, dateOfBirth, gender, address, city, country)
  → GHLContactService.upsertContactFromUser(userId, userData, 'fullProfile')
    → Upsert contact với đầy đủ thông tin
    → Add tag: DD.FullProfile
```

**File**: `users.service.ts` line 182

**Contact Data**: Tất cả fields có trong profile

---

### Flow 3: User đăng nhập (Login)

**Backend Flow**:
```
POST /auth/login
  → AuthService.login()
  → Validate credentials
  → Generate tokens
  → GHLContactService.upsertContactFromUser(userId, undefined, 'login')
    → Upsert contact với data hiện tại
    → Add tag: DD.Login
```

**File**: `auth.service.ts` line 473

---

### Flow 4: User add to shortlist

**Frontend Flow**:
```
User clicks "Add to Shortlist"
  → shortlistService.addUnit(unitId, unitNumber)
  → Update localStorage
  → Check if user authenticated
  → Get user info (email, phone, firstName, lastName)
  → POST /api/v1/integrations/ghl/contacts/events
    {
      eventType: 'shortlist',
      contactData: { email, phone, firstName, lastName },
      metadata: { unitId: unitNumber || unitId }
    }
```

**Backend Flow**:
```
POST /api/v1/integrations/ghl/contacts/events
  → GHLContactController.handleEvent()
  → GHLContactService.handleUserEvent('shortlist', contactData, { unitId })
    → Validate: email hoặc phone phải có
    → GHLOAuthService.createGHLClient()
    → GHLApiClient.upsertContact(upsertData)
    → getTagsForEvent('shortlist', { unitId })
      → ['DD.Shortlisted', 'DD.Shortlist.{unitId}']
    → addTagsToGHLContact() → GHLApiClient.addTags()
```

**Files**:
- Frontend: `shortlistService.ts` line 141-237
- Backend: `ghl-contact.controller.ts` line 36-118, `ghl-contact.service.ts` line 307-490

**Lưu ý**: 
- Frontend gọi trực tiếp GHL events endpoint (bypass backend shortlist API)
- Backend shortlist service cũng có logic tương tự (line 88-133) nhưng ít được dùng

---

### Flow 5: User submit enquiry

**Frontend Flow**:
```
User submits contact form với unitId
  → contactService.submitContactForm(data, { unitId, isEnquiry: true })
  → POST /api/v1/integrations/ghl/contacts/events
    {
      eventType: 'enquiry',
      contactData: { email, phone, firstName, lastName },
      metadata: { unitId }
    }
```

**Backend Flow**:
```
POST /api/v1/integrations/ghl/contacts/events
  → GHLContactController.handleEvent()
  → GHLContactService.handleUserEvent('enquiry', contactData, { unitId })
    → Upsert contact
    → Add tags: ['DD.Enquiry', 'DD.Enquire.{unitId}']
```

**Files**:
- Frontend: `contactService.ts` line 25-94
- Backend: `ghl-contact.controller.ts` line 36-118

---

### Flow 6: User tạo reservation

**Backend Flow**:
```
POST /reservations
  → ReservationsService.createReservation()
  → Validate user profile
  → Lock unit (10 minutes)
  → Create reservation record
  → GHLContactService.upsertContactFromUser(userId, userData, 'reserve', { unitId })
    → Upsert contact
    → Add tag: DD.Reserved
```

**File**: `reservations.service.ts` line 169-190

---

### Flow 7: User thanh toán deposit

**Backend Flow**:
```
POST /reservations/:id/confirm-payment
  → ReservationsService.confirmPayment()
  → Verify payment
  → Update reservation status = CONFIRMED
  → Update unit status = RESERVED
  → GHLContactService.upsertContactFromUser(userId, userData, 'deposit', { unitId })
    → Upsert contact
    → Add tag: DD.Deposit
```

**File**: `reservations.service.ts` line 447-468

---

## 👤 Contact APIs (Admin)

### 1. Handle User Event (Main Endpoint)

**Endpoint**: `POST /api/v1/integrations/ghl/contacts/events` (Public - No Auth)

**Body**:
```json
{
  "eventType": "shortlist",
  "contactData": {
    "email": "user@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe"
  },
  "metadata": {
    "unitId": "1A"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contactId": "contact_123",
    "tagsAdded": ["DD.Shortlisted", "DD.Shortlist.1A"]
  }
}
```

**Lưu ý**: 
- Endpoint này được frontend gọi trực tiếp
- Không cần authentication (public endpoint)
- Yêu cầu: `contactData` phải có ít nhất `email` hoặc `phone`

---

### 2. Lấy danh sách contacts

**Endpoint**: `GET /api/v1/integrations/ghl/contacts` (Cần JWT - Admin)

**Query params**:
- `limit`: Số lượng contacts (optional)
- `startAfter`: Pagination cursor (optional)

---

### 3. Lấy contact theo ID

**Endpoint**: `GET /api/v1/integrations/ghl/contacts/:contactId` (Cần JWT - Admin)

---

### 4. Cập nhật contact

**Endpoint**: `PUT /api/v1/integrations/ghl/contacts/:contactId` (Cần JWT - Admin)

**Body**:
```json
{
  "email": "newemail@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

---

### 5. Xóa contact

**Endpoint**: `DELETE /api/v1/integrations/ghl/contacts/:contactId` (Cần JWT - Admin)

---

### 6. Add tags to contact

**Endpoint**: `POST /api/v1/integrations/ghl/contacts/:contactId/tags` (Cần JWT - Admin)

**Body**:
```json
{
  "tags": ["DD.Signup", "DD.Shortlisted"]
}
```

---

## 🔧 Technical Details

### Contact Upsert Logic

**Location**: `ghl-contact.service.ts` → `upsertContactFromUser()`

**Process**:
1. Tìm active GHL integration (admin's integration)
2. Nếu không có → return null (skip silently)
3. Lấy user data từ database (nếu không được provide)
4. Tạo GHL client với auto-refresh token
5. Prepare contact data:
   - Required: `email` hoặc `phone` (GHL API requirement)
   - Optional: firstName, lastName, gender, address, city, country, dateOfBirth
   - Custom fields: `interest`, `unitId` (nếu có)
6. Call `GHLApiClient.upsertContact()` → GHL API
7. Lưu `ghlContactId` vào user record
8. Nếu có `eventType` → Add tags

### Tag Addition Logic

**Location**: `ghl-tag.utils.ts` → `addTagsToGHLContact()`

**Process**:
1. Validate: contactId và tags array
2. Tìm active GHL integration (nếu adminUserId không được provide)
3. Tạo GHL client
4. Call `GHLApiClient.addTags(contactId, tags)` → GHL API
5. Return result với success/error status

### Token Refresh

**Location**: `ghl-oauth.service.ts` → `createGHLClient()`

**Auto-refresh triggers**:
- Token expired hoặc sắp expire (trong 5 phút)
- API call nhận 401 Unauthorized (trong axios interceptor)

**Process**:
1. Check token expiry
2. Nếu expired → Call `refreshAccessToken()`
3. Update credentials trong database
4. Retry original request với new token

---

## ⚠️ Important Notes

### 1. GHL API Requirements

- **Email hoặc Phone**: GHL API yêu cầu ít nhất một trong hai
- Nếu cả hai đều thiếu → Skip upsert (log warning, không throw error)

### 2. Non-blocking Operations

- Tất cả GHL operations là **async, non-blocking**
- Nếu GHL call fail → Log error nhưng không block user operations
- User vẫn có thể đăng ký, đăng nhập, add shortlist... ngay cả khi GHL down

### 3. Integration Status

- Nếu không có active GHL integration → Tất cả GHL operations skip silently
- Không throw error, không block user flow

### 4. Contact Upsert Strategy

- Sử dụng GHL **upsert API** (create or update)
- Match contact bằng `email` hoặc `phone`
- Nếu contact đã tồn tại → Update thông tin
- Nếu chưa tồn tại → Create mới

### 5. Unit ID trong Tags

- Tags có thể chứa `unitId` (ví dụ: `DD.Shortlist.1A`)
- Frontend nên pass `unitNumber` (e.g., "1A", "2B") thay vì UUID
- Backend sẽ fallback về `unitId` nếu không có `unitNumber`

---

## 🧪 Testing Guide

### Bước 1: Setup GHL Integration

1. Start backend: `npm run start:dev`
2. Mở Swagger: `http://localhost:4000api`
3. Login với admin: `POST /auth/login`
4. Authorize JWT token trong Swagger
5. Test: `POST /api/v1/integrations/ghl/oauth/authorize`
6. Authorize trên GHL → Chọn location
7. Verify: `GET /api/v1/integrations/ghl/oauth/status`

### Bước 2: Test Signup Event

```bash
POST /auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "interest": "buying_to_live"
}
```

**Expected**:
- User created in database
- Contact created in GHL
- Tag `DD.Signup` added
- `ghlContactId` saved to user record

### Bước 3: Test Shortlist Event (Frontend)

```javascript
// In browser console or frontend code
await fetch('http://localhost:4000api/v1/integrations/ghl/contacts/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'shortlist',
    contactData: {
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe'
    },
    metadata: {
      unitId: '1A'
    }
  })
});
```

**Expected**:
- Contact upserted in GHL
- Tags added: `DD.Shortlisted`, `DD.Shortlist.1A`

### Bước 4: Test Enquiry Event

```javascript
await fetch('http://localhost:4000api/v1/integrations/ghl/contacts/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'enquiry',
    contactData: {
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe'
    },
    metadata: {
      unitId: '2B'
    }
  })
});
```

**Expected**:
- Contact upserted
- Tags added: `DD.Enquiry`, `DD.Enquire.2B`

### Bước 5: Verify in GHL Dashboard

1. Login vào GHL dashboard
2. Navigate to Contacts
3. Search by email: `test@example.com`
4. Verify:
   - Contact information
   - Tags: `DD.Signup`, `DD.Shortlisted`, `DD.Shortlist.1A`, `DD.Enquiry`, `DD.Enquire.2B`

---

## ⚙️ Environment Variables

```env
GHL_CLIENT_ID=691fde7770a33e9d915a19a0-mi8b94rq
GHL_CLIENT_SECRET=5ba94800-8343-4d2e-827d-56af8d11aadf
GHL_REDIRECT_URI=http://localhost:4000api/v1/integrations/ghl/oauth/callback
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=your-secure-encryption-key-minimum-32-characters-long
```

---

## 📝 Database Schema

### User Table

```prisma
model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  phoneNumber   String?   @unique
  firstName     String?
  lastName      String?
  // ... other fields
  ghlContactId  String?   // GHL Contact ID sau khi upsert
}
```

### Integration Table

```prisma
model Integration {
  id            String    @id @default(uuid())
  userId        String    // Admin user ID
  providerName  String    // "ghl"
  status        String    // "active" | "inactive"
  credentials   Json      // Encrypted { access_token, refresh_token, location_id }
  config        Json?     // { location_id }
  isDeleted     Boolean   @default(false)
}
```

---

## 📚 API Reference

- **Swagger UI**: `http://localhost:4000api` → Tag "integrations"
- **GHL API Docs**: https://marketplace.gohighlevel.com/docs/ghl/contacts/get-contact
- **GHL Upsert API**: `POST /contacts/upsert`
- **GHL Add Tags API**: `POST /contacts/{contactId}/tags`

---

## 🔍 Debugging

### Check Logs

Backend logs sẽ hiển thị:
- GHL API requests/responses
- Token refresh events
- Contact upsert results
- Tag addition results
- Errors (nếu có)

### Common Issues

1. **"No active GHL integration found"**
   - Check: Admin đã kết nối GHL chưa?
   - Check: Integration status = "active"?

2. **"Email and phone are both missing"**
   - GHL API yêu cầu ít nhất email hoặc phone
   - Check: contactData có email hoặc phone không?

3. **"Token expired"**
   - Token sẽ tự động refresh
   - Check logs để xem refresh có thành công không

4. **"Contact upsert failed"**
   - Check: GHL API có đang hoạt động không?
   - Check: Location ID có đúng không?
   - Check: Contact data format có đúng không?

---

## 📌 Summary

Hệ thống GHL integration hoạt động theo nguyên tắc:
- **Non-blocking**: Không block user operations
- **Auto-retry**: Token tự động refresh
- **Silent fail**: Nếu GHL down, hệ thống vẫn hoạt động bình thường
- **Event-driven**: Mỗi user action trigger một event với tags tương ứng
- **Upsert strategy**: Contact được upsert (create or update) dựa trên email/phone
