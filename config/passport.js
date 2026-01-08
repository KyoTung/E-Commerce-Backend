const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");
const { v4: uuidv4 } = require("uuid");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://e-commerce-backend-f62w.onrender.com/api/user/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Tìm xem user đã tồn tại chưa (dựa vào email)
        const user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Trường hợp 1: Đã có tài khoản -> Cho qua đăng nhập
          return done(null, user);
        } else {
          // Trường hợp 2: Chưa có -> Tạo mới
          // Vì login google không có password, ta tạo password ngẫu nhiên
          const newUser = await User.create({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            password: uuidv4(), // Password ngẫu nhiên (để hacker ko đoán được)
            role: "user",
            // Lưu thêm googleId để sau này biết user này từ google
            // Bạn có thể cần thêm trường googleId vào User Model (không bắt buộc nếu check bằng email)
          });
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize/Deserialize (Bắt buộc với Passport dù dùng JWT hay Session)
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});