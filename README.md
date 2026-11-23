# BorrowNest — Peer-to-Peer Rental Platform

A backend REST API for a peer-to-peer rental platform that enables users to list household and personal assets, discover rental items, check availability, reserve time slots, process payments, and communicate through booking-specific messaging.

**BorrowNest** provides the server-side business logic, scheduling engine, authentication, and database persistence for an item-sharing marketplace.

---

## Overview

BorrowNest is designed around a simple idea: make underutilized assets accessible through a structured rental system.

The backend supports:

- User registration, authentication, and profile management.
- Item listing and category-based discovery.
- Hourly rental pricing.
- Seven-day availability analysis.
- Booking creation with time-slot conflict prevention.
- Online payment integration through Razorpay and pay-in-person settlement.
- Booking-specific messaging between renters and owners.
- Secure password recovery through email.

> **Project scope:** This repository contains the backend REST API. A frontend application is not included.

## Technology Stack

| Category | Technologies |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express.js 5 |
| Database | MongoDB |
| ODM | Mongoose 8 |
| Authentication | JSON Web Tokens (JWT) |
| Password Security | bcryptjs |
| File Uploads | Multer |
| Payment Integration | Razorpay SDK |
| Email Service | Nodemailer |
| Security Utilities | Node.js Crypto |
| Configuration | dotenv |

## Architecture

BorrowNest follows a layered backend architecture, separating routing, request handling, authentication, and data persistence.

```text
Client Application
       |
       v
Express REST API
       |
       v
Middleware Layer
(CORS, JSON, JWT, Multer)
       |
       v
Route Layer
       |
       v
Controller Layer
       |
       v
Mongoose Models
       |
       v
MongoDB Database
```

## Features

### 1. Authentication and User Management

- User registration and login.
- Password hashing using bcryptjs.
- JWT-based authentication with seven-day token expiration.
- Protected API routes using Bearer token verification.
- User profile retrieval and updates.
- Password recovery using cryptographically generated reset tokens.
- SHA-256 hashed reset-token storage with one-hour expiration.

### 2. Item Listing and Discovery

- Create rental listings with item details and hourly pricing.
- Organize items into Electronics, Kitchen, Home, Transport, and Others.
- Upload item images using Multer.
- Browse available items.
- Filter listings by category.
- Retrieve individual item details.
- View and manage personally listed items.
- Soft-delete and restore listings through the `isAvailable` field.

### 3. Availability and Booking Engine

- Calculate item availability over a rolling seven-day window.
- Retrieve existing booked time slots.
- Create bookings for specific start and end times.
- Prevent overlapping active reservations.
- Prevent owners from booking their own items.
- Support renter and owner booking views.
- Allow eligible renters to cancel future bookings.
- Cancel pending-payment bookings.

**Booking conflict detection**

A booking is rejected when its requested interval overlaps an existing active reservation:

```text
existing.startTime < requested.endTime
AND
existing.endTime > requested.startTime
```

The booking engine checks reservations with `booked` and `pending_payment` statuses.

### 4. Payment Processing

BorrowNest includes server-side Razorpay integration.

- Create Razorpay payment orders.
- Verify payment signatures using HMAC-SHA256.
- Associate payment information with bookings.
- Cancel the booking when signature verification fails.
- Support pay-in-person settlement.

**Configuration note:** Online Razorpay checkout requires valid API credentials. Without them, the online order endpoint returns a configuration error. Pay-in-person functionality does not require Razorpay credentials.

### 5. Booking-Specific Messaging

- Automatically initialize a chat when a booking is created.
- Associate conversations with individual bookings.
- Restrict chat access to booking participants.
- Store messages in MongoDB.
- Retrieve chat history and send messages through REST endpoints.

Messaging currently uses HTTP request-response operations rather than WebSocket-based real-time communication.

### 6. Image Uploads

- Disk-based image storage using Multer.
- Timestamp-based filenames.
- MIME type and extension filtering for JPEG, JPG, PNG, and WebP.
- Static image serving through the `/uploads` route.

### 7. Password Recovery Emails

- Nodemailer-based email delivery.
- Gmail SMTP support through environment variables.
- Ethereal test-email fallback in development.
- Password reset links with expiring tokens.

---

## Project Structure

```text
BorrowNest/
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── itemController.js
│   │   ├── bookingController.js
│   │   ├── paymentController.js
│   │   └── chatController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Item.js
│   │   ├── Booking.js
│   │   └── Chat.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── itemRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── chatRoutes.js
│   │
│   ├── uploads/
│   ├── .env.example
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
├── .gitignore
└── README.md
```

## Database Models

BorrowNest uses four primary MongoDB collections.

| Model | Purpose |
|---|---|
| User | User identity, profile information, credentials, and password-reset data |
| Item | Rental item details, category, hourly price, owner, and availability |
| Booking | Reservation interval, renter, owner, booking status, and payment information |
| Chat | Booking-specific participants and embedded message history |

### Model Relationships

```text
User
 ├── Owns many Items
 ├── Creates many Bookings as Renter
 ├── Receives many Bookings as Owner
 └── Participates in Chats

Item
 └── Referenced by Bookings

Booking
 └── Associated with one Chat

Chat
 ├── References Booking
 └── Contains Messages
```

## API Documentation

All API endpoints use the `/api` prefix unless otherwise specified.

### Authentication — `/api/auth`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/register` | Public |
| POST | `/login` | Public |
| POST | `/forgot-password` | Public |
| POST | `/reset-password/:token` | Public |

### User Profile — `/api/users`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/me` | Authenticated |
| PATCH | `/me` | Authenticated |

### Items — `/api/items`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/with-availability` | Public |
| GET | `/:id` | Public |
| POST | `/add` | Authenticated |
| GET | `/my` | Authenticated |
| PATCH | `/soft-delete/:id` | Authenticated |
| PATCH | `/restore/:id` | Authenticated |

### Bookings — `/api/bookings`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/create` | Authenticated |
| GET | `/my` | Authenticated |
| GET | `/owner` | Authenticated |
| GET | `/item/:itemId` | Public |
| PATCH | `/cancel/:id` | Authenticated |
| PATCH | `/cancel-pending/:id` | Authenticated |

### Payments — `/api/payments`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/create-order` | Authenticated |
| POST | `/verify` | Authenticated |
| POST | `/pay-on-delivery` | Authenticated |

### Messaging — `/api/chats`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/my` | Authenticated |
| GET | `/booking/:bookingId` | Authenticated |
| GET | `/:chatId` | Authenticated |
| POST | `/:chatId/message` | Authenticated |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Backend service status |
| GET | `/api/protected` | Protected-route verification |

Authenticated endpoints require:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher.
- MongoDB local instance or MongoDB Atlas account.
- npm.

### 1. Clone the Repository

```bash
git clone https://github.com/akshat568/BorrowNest.git
cd BorrowNest/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create your local environment file:

```bash
cp .env.example .env
```

Configure the required variables in `backend/.env`:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secure_random_secret

FRONTEND_URL=http://localhost:3000

CORS_ORIGIN=http://localhost:3000

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

EMAIL_USER=
EMAIL_PASS=

NODE_ENV=development
```

`MONGO_URI` and `JWT_SECRET` are required. Other integrations can be configured when needed.

**Note:** `CORS_ORIGIN` is included in the environment template, but the current server implementation uses a wildcard CORS origin instead. `FRONTEND_URL` has a code fallback of `http://localhost:8080`.

### 4. Start the Backend

```bash
npm start
```

The server runs on:

```text
http://localhost:5000
```

### 5. Verify the Server

Open:

```text
http://localhost:5000/
```

Expected response:

```text
BorrowNest backend running
```

---

## Security Implementation

- Password hashing using bcryptjs.
- JWT authentication for protected endpoints.
- Ownership checks for item management.
- Participant-based chat authorization.
- Booking ownership validation.
- Cryptographically generated password-reset tokens.
- Hashed password-reset token storage.
- HMAC-SHA256 payment signature verification.
- Environment-based configuration for sensitive credentials.

## Current Limitations

- This repository contains no frontend implementation.
- Chat messaging uses REST APIs rather than WebSockets.
- Image upload middleware currently has no explicit file-size limit.
- CORS currently uses a wildcard origin.
- Availability calculations assume an 8 AM–9 PM operating window and do not apply timezone-specific operating hours.
- Razorpay online checkout requires external account credentials and configuration.

## Future Improvements

- Develop a dedicated frontend application.
- Add real-time messaging using WebSockets.
- Implement image upload size restrictions.
- Configure environment-based CORS restrictions.
- Introduce timezone-aware availability scheduling.
- Add automated API and integration tests.
- Improve booking concurrency protection.

## License

This project is available for educational and portfolio purposes. No formal open-source license has been specified.

---

**Built as a backend engineering project exploring REST API design, authentication, database modeling, booking systems, payment verification, and secure resource management.**
