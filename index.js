import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: true
}));

app.set("view engine", "ejs");

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// database connection



const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect();



// home route

app.get("/", isLoggedIn, async (req, res) => {
  const userId = req.session.user.id;

  const result = await db.query(
    "SELECT * FROM books WHERE user_id = $1",
    [userId]
  );

  res.render("index.ejs", { 
    books: result.rows,
    user: req.session.user
  });
});

// add book
app.post("/add", isLoggedIn, async (req, res) => {
  const { title, author, rating, notes } = req.body;

  const userId = req.session.user.id;   // 🔥 important

  await db.query(
    "INSERT INTO books (title, author, rating, notes, user_id) VALUES ($1, $2, $3, $4, $5)",
    [title, author, rating, notes, userId]
  );

  res.redirect("/");
});

app.post("/delete", isLoggedIn, async (req, res) => {
      const userId = req.session.user.id;

await db.query(
  "DELETE FROM books WHERE id = $1 AND user_id = $2",
  [id, userId]
);

  res.redirect("/");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  const id = req.params.id;

  const result = await db.query(
    "SELECT * FROM books WHERE id = $1",
    [id]
  );

  res.render("edit.ejs", { book: result.rows[0] });
});

app.post("/edit/:id", isLoggedIn, async (req, res) => {
      const id = req.params.id;
  const { title, author, rating, notes } = req.body;

  await db.query(
    "UPDATE books SET title=$1, author=$2, rating=$3, notes=$4 WHERE id=$5",
    [title, author, rating, notes, id]
  );

  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (email, password) VALUES ($1, $2)",
    [email, hashedPassword]
  );

  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    res.redirect("/");
  } else {
    res.send("Invalid login");
  }
});





app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});