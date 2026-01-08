const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const passport = require("passport");
const app = express();
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');

const connectDB = require("./config/connectDB");
const authRouter = require("./routes/authRoute");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const productRouter = require("./routes/productRoute");
const blogRouter = require("./routes/blogRoute");
const categoryRoute = require("./routes/categoryRoute");
const brandRoute = require("./routes/brandRoute");
const blogcateRoute = require("./routes/blogcateRoute");
const couponRoute = require("./routes/couponRoute");
const orderRoute = require("./routes/orderRoute");
const cartRoute = require("./routes/cartRoute");
const colorRoute = require("./routes/colorRoute");
const enquiryRoute = require("./routes/enquiryRoute");
require("./config/passport");

// Middleware
app.use(morgan("dev"));
const CLIENT_ORIGIN = "http://localhost:3000"; // React dev

app.use(passport.initialize());

// CORS cho tất cả route
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [],
  })
);
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Kết nối db
connectDB();

//api de ping den render tranh sleep time
app.get("/ping", (req, res) => {
  return res.send("Pong");
});

// Routes
app.use("/api/user", authRouter);
app.use("/api/product", productRouter);
app.use("/api/blog", blogRouter);
app.use("/api/category", categoryRoute);
app.use("/api/brand", brandRoute);
app.use("/api/blogcategory", blogcateRoute);
app.use("/api/coupon", couponRoute);
app.use("/api/cart", cartRoute);
app.use("/api/order", orderRoute);
app.use("/api/color", colorRoute);
app.use("/api/enquiry", enquiryRoute);

app.use(notFound);
app.use(errorHandler);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
