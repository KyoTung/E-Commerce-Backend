const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 4000;

const connectDB = require("./config/connectDB");
const authRouter = require("./routes/authRoute");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const productRouter = require("./routes/productRoute")

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Kết nối db
connectDB();

// Routes
app.use("/api/user", authRouter);
app.use("/api/product", productRouter)

app.use(notFound);
app.use(errorHandler);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
