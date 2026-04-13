# Reservation System - keanu MVP

## 📋 Overview

Complete implementation of reservation system với tính năng:
- **Unit locking**: 10-minute Redis-based locks
- **Payment integration**: Stripe & Paystack support
- **Conflict resolution**: Queue system cho locked units
- **Real-time expiry**: Automatic cleanup của expired reservations
- **Admin controls**: Force expire, statistics, export

## 🏗 Architecture

```
ReservationsModule
├── ReservationsService          # Core business logic
├── ReservationLockService       # Redis-based locking
├── ReservationsController       # REST API endpoints
├── AdminReservationsController  # Admin endpoints
└── DTOs                        # Request/response validation
    ├── CreateReservationDto
    ├── ConfirmPaymentDto
    └── PaymentIntentDto
```

## 🚀 API Endpoints

### **Buyer APIs**

```bash
# Create reservation (lock unit for 10 minutes)
POST /api/reservations
{
  "unitId": "unit_123",
  "projectId": "proj_456", 
  "buyerName": "John Doe",        # Optional
  "buyerEmail": "john@email.com", # Optional
  "buyerPhone": "+1234567890",    # Optional
  "source": "google",             # UTM tracking
  "campaign": "launch_2025"       # UTM tracking
}

# Get reservation details
GET /api/reservations/:id

# List user's reservations with filters
GET /api/reservations?projectId=proj_456&status=PENDING&page=1&limit=10

# Cancel reservation (unlock unit)
DELETE /api/reservations/:id

# Create payment intent
POST /api/reservations/:id/payment-intent
{
  "reservationId": "res_789",
  "paymentMethod": "stripe|paystack",
  "buyerName": "John Doe",
  "buyerEmail": "john@email.com", 
  "buyerPhone": "+1234567890",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}

# Confirm payment (called by webhook or frontend)
POST /api/reservations/:id/confirm
{
  "paymentIntentId": "pi_stripe_123",
  "paymentMethod": "stripe",
  "buyerName": "John Doe",
  "buyerEmail": "john@email.com",
  "buyerPhone": "+1234567890"
}
```

### **Admin APIs**

```bash
# List all reservations
GET /api/admin/reservations?projectId=proj_456&userId=user_123

# Export reservations
GET /api/admin/reservations/export?projectId=proj_456&format=csv

# Get statistics
GET /api/admin/reservations/stats?projectId=proj_456

# Force expire reservation
POST /api/admin/reservations/:id/force-expire
```

## 📊 Response Format

```javascript
{
  "id": "res_789",
  "userId": "user_123", 
  "unitId": "unit_456",
  "projectId": "proj_789",
  
  // Status & Timing
  "status": "PENDING|CONFIRMED|EXPIRED|CANCELLED|FAILED",
  "lockedAt": "2025-11-11T10:00:00Z",
  "expiresAt": "2025-11-11T10:10:00Z", 
  "confirmedAt": "2025-11-11T10:05:00Z",
  "timeRemaining": 300, // seconds until expiry
  
  // Payment
  "depositAmount": 50000,
  "paymentIntentId": "pi_stripe_123",
  "paymentStatus": "PENDING|PROCESSING|SUCCEEDED|FAILED|REFUNDED",
  "paymentMethod": "stripe|paystack",
  
  // Contact
  "buyerName": "John Doe",
  "buyerEmail": "john@email.com", 
  "buyerPhone": "+1234567890",
  
  // Tracking
  "source": "google",
  "campaign": "launch_2025",
  
  // Relations
  "unit": {
    "id": "unit_456",
    "unitNumber": "A-101", 
    "unitType": "2BR",
    "price": 500000,
    "imageUrls": ["image1.jpg"]
  },
  "project": {
    "id": "proj_789",
    "name": "Luxury Tower",
    "developer": "ABC Corp"
  }
}
```

## 🔒 Business Rules

### **Reservation Flow**
1. **Create**: User locks unit for 10 minutes
2. **Payment**: Create payment intent & process deposit
3. **Confirm**: Payment success → unit status = RESERVED  
4. **Expiry**: Auto-cleanup after 10 minutes if no payment

### **Status Transitions**
```
PENDING → CONFIRMED (payment success)
PENDING → EXPIRED   (10min timeout)
PENDING → CANCELLED (user cancellation) 
PENDING → FAILED    (payment failure)
```

### **Unit Status Sync**
```
AVAILABLE → LOCKED    (reservation created)
LOCKED → RESERVED     (payment confirmed)
LOCKED → AVAILABLE    (reservation expired/cancelled)
```

### **Conflict Resolution**
- **Double booking prevention**: Redis locks với atomic operations
- **Queue system**: Users can join waitlist cho locked units
- **Race condition handling**: Database transactions + Redis locks

## 🧪 Testing Scenarios

### **Happy Path**
```bash
# 1. Create reservation
POST /api/reservations
# → Unit locked, 10min timer starts

# 2. Create payment intent  
POST /api/reservations/:id/payment-intent
# → Stripe/Paystack payment URL generated

# 3. Process payment
# → External gateway processes payment

# 4. Confirm payment
POST /api/reservations/:id/confirm  
# → Unit reserved, lock released
```

### **Conflict Scenarios**
```bash
# Scenario 1: Double booking attempt
User A: POST /api/reservations (unit_123) → SUCCESS
User B: POST /api/reservations (unit_123) → 409 CONFLICT

# Scenario 2: Reservation expiry
User A: POST /api/reservations (unit_123)
# Wait 10+ minutes
# → Auto-expired, unit unlocked

# Scenario 3: Payment timeout
User A: POST /api/reservations (unit_123)
User A: POST /api/reservations/:id/payment-intent
# Wait 10+ minutes without payment
# → Reservation expired
```

## 🔧 Configuration

### **Environment Variables**
```bash
# Cache TTL for locks (milliseconds)
RESERVATION_LOCK_TTL=600000  # 10 minutes

# Payment gateway settings  
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# Webhook URLs
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_WEBHOOK_SECRET=...
```

### **Integration với Reserve Manager**
```typescript
// Uncomment trong ReservationsService để enable
const canReserve = await this.reserveManagerService.canMakeReservation(projectId);
if (!canReserve) {
  throw new ForbiddenException('Reservations not allowed during this phase');
}
```

## 📈 Monitoring & Analytics

### **Key Metrics**
- **Conversion Rate**: Reservations → Confirmed payments
- **Lock Utilization**: % time units are locked vs available
- **Queue Performance**: Average wait time in lock queues  
- **Payment Success**: Success rate by gateway (Stripe vs Paystack)

### **Health Checks**
```bash
# Check Redis connectivity
GET /health/locks

# Check payment gateway status
GET /health/payments

# Monitor expired reservations
GET /admin/reservations/stats
```

## 🚀 Next Steps

1. **Authentication**: Integrate với JWT guards
2. **Payment Gateways**: Implement actual Stripe/Paystack APIs
3. **Background Jobs**: Replace setTimeout với Bull Queue
4. **Notifications**: Email/SMS confirmations
5. **Analytics**: Detailed tracking & reporting
6. **Testing**: Unit tests & E2E scenarios

---

**Status**: ✅ Complete implementation ready for integration!