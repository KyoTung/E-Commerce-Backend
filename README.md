📦 Nest Store Backend API
Server-side application for Nest Store E-Commerce - Specializing in Mobile Devices.

This project provides a robust, secure, and scalable RESTful API system designed to serve the Frontend application (ReactJS). It integrates comprehensive business logic ranging from advanced authentication and product management to online payment integration.

🚀 Tech Stack
Runtime Environment: Node.js

Framework: Express.js

Database: MongoDB (Mongoose ODM)

Authentication: JWT (Access Token & Refresh Token), Google OAuth2

Payment Gateway: ZaloPay Integration

Deployment: Render

🧩 Key Features
🔐 1. Authentication & Security
User Registration / Login: Secure authentication using Email & Password.

Google Login: Quick sign-in integration via Google OAuth2.

Token Rotation: Advanced security mechanism using short-lived Access Tokens and long-lived Refresh Tokens (Silent Refresh).

Password Encryption: One-way hashing using Bcrypt.

Role-based Access Control (RBAC): Strict permission separation between Users and Admins.

📱 2. Product Management
CRUD Operations: Create, Read, Update, and Delete products.

Image Upload: Support for image uploading (Cloudinary/Local).

Advanced Querying: Filter, Search, Sort, and Pagination features.

Organization: Management of Categories and Brands.

🛒 3. Order & Payment
Checkout Process: Order creation logic with Coupon application.

ZaloPay Integration: Online payment processing via ZaloPay Gateway.

Payment Error Handling:

Repay Support: Allows users to retry payment if the transaction fails without losing the order.

Switch to COD: Flexible option to switch payment method to Cash On Delivery (COD) in case of online payment failure.

Order Status Management: Full lifecycle tracking (Pending, Processing, Paid, Cancelled...).

📊 4. Admin Dashboard
Statistics: Revenue charts and order volume analysis.

User Management: View and manage user accounts.

Inventory Management: Track product stock.

⚙️ Installation & Local Development
1. Clone the repository
Bash

git clone https://github.com/your-username/e-commerce-backend.git
cd e-commerce-backend
2. Install Dependencies
Bash

npm install
3. Environment Variables Configuration
Create a .env file in the root directory and populate it with the following information:

Đoạn mã

PORT=5000
# Database Connection
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/neststore

# JWT Security
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Email Configuration (For Forgot Password feature)
MAIL_ID=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# ZaloPay Configuration (For Payment Testing)
APP_ID=2554
KEY1=sdngKKJ...
KEY2=trMrHtv...
ENDPOINT=https://sb-openapi.zalopay.vn/v2/create

# Google Login Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL (For redirection after Payment/Login)
CLIENT_URL=http://localhost:5173
4. Start the Server
Development Mode (Auto-restart on code changes):

Bash

npm run dev
Production Mode:

Bash

npm start
The server will start at: http://localhost:5000

📁 Folder Structure
e-commerce-backend/
├── config/             # DB connection, ZaloPay config, Constants
├── controllers/        # Business Logic (Auth, Product, Order...)
├── middlewares/        # Auth verification, Error Handler, Upload logic
├── models/             # Mongoose Schemas (User, Product, Order...)
├── routes/             # API Endpoints definitions
├── utils/              # Utility functions (Send mail, Validate...)
├── server.js           # Application Entry point
└── .env                # Environment variables
👨‍💻 Author
Name: Hoang Thanh Tung

Email: hoangthanhtung.ac1@gmail.com
