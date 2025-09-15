# 📦 E-Commerce Project
Một dự án thương mại điện tử sử dụng MERN Stack (MongoDB, Express, React, Node.js), chuyên bán các thiết bị điện thoại di động. Dự án bao gồm hệ thống xác thực người dùng, quản lý sản phẩm, đơn hàng và dashboard quản trị.

🚀 Giới thiệu
Dự án này được xây dựng nhằm mô phỏng một nền tảng thương mại điện tử hiện đại, bao gồm:

Frontend: React + Vite (được phát triển riêng)
Backend: Node.js + Express
Database: MongoDB
Authentication: JWT + Bcrypt
Quản lý: CRUD sản phẩm, người dùng, đơn hàng
🧩 Tính năng chính
🔐 Authentication
Đăng ký / Đăng nhập người dùng
Mã hóa mật khẩu bằng Bcrypt
Xác thực bằng JWT
Phân quyền người dùng (admin / khách hàng)
📦 CRUD sản phẩm
Tạo, sửa, xóa, xem chi tiết sản phẩm
Upload hình ảnh sản phẩm
Gắn danh mục, thương hiệu
📋 Quản lý đơn hàng
Tạo đơn hàng từ phía khách hàng
Admin xác nhận, cập nhật trạng thái đơn hàng
Lưu lịch sử đơn hàng
🧑‍💼 Quản trị hệ thống
Dashboard thống kê
Quản lý người dùng
Quản lý sản phẩm và đơn hàng

⚙️ Cài đặt backend
1. Clone repo

git clone https://github.com/your-username/e-commerce-backend.git
cd e-commerce-backend

2. Cài đặt dependencies
npm install

3. Tạo file .env

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

4. Khởi chạy server

npm run dev

Server sẽ chạy tại http://localhost:5000

📁 Cấu trúc thư mục backend
├── controllers/
├── models/
├── routes/
├── middleware/
├── utils/
├── config/
├── server.js
└── .env