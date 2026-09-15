const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const connectDB = require("./src/config/database.util");
const cookieParser = require("cookie-parser");
const authRouter = require("./src/routes/auth/auth.router");
const networkRouter = require("./src/routes/network.router");
const publicRouter = require("./src/routes/public.router");
const userMediaRoute = require("./src/routes/userMedia.router");
const cors = require("cors");
const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;


// Here, credentials: true is a CORS setting that allows the browser to include credentials, 
// such as cookies, when making cross-origin requests to your backend.
const corsOptions = {
  origin: isProd ? process.env.FRONTEND_URI : process.env.FRONTEND_URI_LOCAL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  credentials: true,
};

app.use(cors(corsOptions)); // this should be at the top of  file
// In a Node.js backend using Express, cookie-parser is middleware that helps you read cookies sent by the browser.
app.use(cookieParser());

//all middleWares
app.use(express.json());
// express.urlencoded() is a built-in Express function that creates middleware for parsing URL-encoded request bodies.
// Suppose a form :--->
// <form method="POST" action="/login">
//   <input name="email" value="user@example.com" />
//   <input name="password" value="123456" />
//   <button type="submit">Login</button>
// </form>

// The browser may send the body in this format: email=user%40example.com&password=123456
// The above format is called application/x-www-form-urlencoded.
// data is represented as key=value&key=value
// Special characters are encoded. For example: @  →  %40 and space → +

// Without the middleware, Express does not automatically parse this URL-encoded body into req.body.
// with app.use(express.urlencoded({ extended: true }));
// Express can parse it.
// Request : 
// POST /login
// Content-Type: application/x-www-form-urlencoded
// email=user%40example.com&password=123456
// After the middleware parses it:
// req.body becomes approximately :-
// {
//   email: "user@example.com",
//   password: "123456"
// }
// With extended: true, Express uses a more capable parser that can understand nested objects and arrays in URL-encoded data.
app.use(express.urlencoded({ extended: true }));

//all routes
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api/network", networkRouter);
// app.use("/api/media", uploadRoute);
// app.use("/api/post", postRoute);
app.use("/api/user", userMediaRoute);
app.get("/", (_, res) => {
  res.send("hello from server");
});

connectDB().then(() => {
  console.log("Server is starting...");
  app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
  });
});
