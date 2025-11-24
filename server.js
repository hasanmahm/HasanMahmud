// server.js (replace your existing server.js with this)
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// -- session middleware (server-side admin auth) --
const SESSION_SECRET = process.env.SESSION_SECRET || "secretdev";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }, // 4 hours
  })
);

// static & uploads
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(PUBLIC));

// multer for posts uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// nodemailer transporter (gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// simple JSON helpers
const readJson = (file, defaultVal) => {
  try {
    if (!fs.existsSync(file)) return defaultVal;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("readJson error", e);
    return defaultVal;
  }
};
const writeJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const MSG_FILE = path.join(ROOT, "messages.json");
const POSTS_FILE = path.join(ROOT, "posts.json");
const HITS_FILE = path.join(ROOT, "hits.json");
if (!fs.existsSync(HITS_FILE)) writeJson(HITS_FILE, { hits: 0 });
if (!fs.existsSync(POSTS_FILE)) writeJson(POSTS_FILE, []);
if (!fs.existsSync(MSG_FILE)) writeJson(MSG_FILE, []);

// === AUTH ROUTES ===
// POST /login  -> sets session if ADMIN_EMAIL & ADMIN_PASS match
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminEmail || !adminPass)
    return res.status(500).json({ ok: false, error: "admin not configured" });
  if (email === adminEmail && password === adminPass) {
    req.session.isAdmin = true;
    req.session.adminEmail = email;
    return res.json({ ok: true });
  } else {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
});

// POST /logout -> destroy session
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// middleware to protect admin-only routes
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

// === SITE ROUTES ===
// increment hit
app.post("/api/hit", (req, res) => {
  const hits = readJson(HITS_FILE, { hits: 0 });
  hits.hits =(hits.hits || 0) + 1;
  writeJson(HITS_FILE, hits);
  res.json({ ok: true, hits: hits.hits});
});





// contact: save message to messages.json and send optional email
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const id = Date.now().toString(36);
    const date = new Date().toISOString();
    const arr = readJson(MSG_FILE, []);
    arr.push({ id, name, email, phone, message, date });
    writeJson(MSG_FILE, arr);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.SMTP_USER,
          subject: `New message from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}\n\nDate: ${date}`,
        });
      } catch (merr) {
        console.error("Mail error:", merr);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Contact error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// create post (admin-only? we allow dashboard to post via login session)
app.post("/api/posts", requireAdmin, upload.array("files", 6), (req, res) => {
  try {
    const author = req.body.author || req.session.adminEmail || "Admin";
    const text = req.body.text || "";
    const files = (req.files || []).map(
      (f) => `/uploads/${path.basename(f.path)}`
    );
    const id = Date.now().toString(36);
    const date = new Date().toISOString();
    const posts = readJson(POSTS_FILE, []);
    posts.push({ id, author, text, files, date, views: 0 });
    writeJson(POSTS_FILE, posts);
    res.json({ ok: true, id, files, date });
  } catch (err) {
    console.error("Post create error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// get posts (public)
app.get("/api/posts", (req, res) => {
  const posts = readJson(POSTS_FILE, []).slice().reverse();
  res.json({ ok: true, posts });
});

// increment view
app.post("/api/posts/:id/view", (req, res) => {
  try {
    const id = req.params.id;
    const posts = readJson(POSTS_FILE, []);
    for (let p of posts)
      if (String(p.id) === String(id)) {
        p.views = (p.views || 0) + 1;
        break;
      }
    writeJson(POSTS_FILE, posts);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === NEW: DELETE post (admin-only) ===
app.delete("/api/posts/:id", requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    let posts = readJson(POSTS_FILE, []);
    const idx = posts.findIndex((p) => String(p.id) === String(id));
    if (idx === -1)
      return res.status(404).json({ ok: false, error: "Post not found" });
    // delete associated files from uploads (optional)
    const removed = posts.splice(idx, 1)[0];
    if (removed.files && removed.files.length) {
      for (const f of removed.files) {
        try {
          const p = path.join(ROOT, f.replace(/^\//, "")); // '/uploads/xxx' -> 'uploads/xxx'
          if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (e) {
          console.warn("file delete failed", e);
        }
      }
    }
    writeJson(POSTS_FILE, posts);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === MESSAGES PAGINATION ===
// GET /api/messages?page=1&limit=10
app.get("/api/messages", requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.max(1, parseInt(req.query.limit || "10"));
    const all = readJson(MSG_FILE, []);
    const total = all.length;
    const start = (page - 1) * limit;
    const pageItems = all
      .slice()
      .reverse()
      .slice(start, start + limit); // newest first
    res.json({ ok: true, messages: pageItems, page, limit, total });
  } catch (err) {
    console.error("Messages pagination error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// stats
app.get("/api/stats", (req, res) => {
  const hits = readJson(HITS_FILE, { hits: 0 }).hits || 0;
  const posts = readJson(POSTS_FILE, []);
 
  res.json({ ok: true, hits, postsCount: posts.length });
});

// export messages & posts (optional)
app.get("/api/export-messages", async (req, res) => {
  try {
    const arr = readJson(MSG_FILE, []);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("messages");
    sheet.columns = [
      { header: "id", key: "id" },
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone" },
      { header: "Message", key: "message" },
      { header: "Date", key: "date" },
    ];
    arr.forEach((r) => sheet.addRow(r));
    const out = path.join(ROOT, "messages_export.xlsx");
    await workbook.xlsx.writeFile(out);
    res.download(out);
  } catch (err) {
    console.error(err);
    res.status(500).send("export failed");
  }
});

app.get("*", (req, res) => res.sendFile(path.join(PUBLIC, "index.html")));

app.listen(PORT, () => console.log("Server listening on", PORT));
