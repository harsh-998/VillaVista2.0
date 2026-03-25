if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const { Strategy: GoogleAuthStrategy } = require("passport-google-oauth20"); // ✅ renamed for clarity
const ExpressError = require("./utils/ExpressError.js");

const User = require("./models/user.js");
const listings = require("./models/listing.js");

// Routers
const ListingRouter = require("./routes/listing.js");
const categoryRouter = require("./routes/category.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const searchRouter = require("./routes/search.js");

// ✅ Middleware setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session configuration
const sessionOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport (Local Strategy)
passport.use(new LocalStrategy(User.authenticate()));

// ✅ Passport (Google Strategy)
passport.use(
  new GoogleAuthStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1️⃣ Check by Google ID
        let existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) return done(null, existingUser);

        // 2️⃣ Check if user with same email already exists
        const email = profile.emails[0].value;
        let emailUser = await User.findOne({ email });

        if (emailUser) {
          emailUser.googleId = profile.id;
          await emailUser.save();
          return done(null, emailUser);
        }

        // 3️⃣ Create a new user
        const newUser = new User({
          googleId: profile.id,
          email,
          username: profile.displayName || email.split("@")[0],
        });

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        console.error("Google Auth Error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ✅ Flash message + current user middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ✅ Routes
app.use("/listings", ListingRouter);
app.use("/listings/:id", reviewRouter);
app.use("/", userRouter);
app.use("/", categoryRouter);
app.use("/search", searchRouter);

// ✅ MongoDB Connection
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/Wanderlust");
  console.log("✅ MongoDB Connected Successfully");
}
main().catch((err) => console.error("MongoDB Connection Error:", err));

// ✅ Error handling
app.use( (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

// ✅ Start Server
app.listen(8080, () => {
  console.log("🚀 Server started on port 8080");
});
