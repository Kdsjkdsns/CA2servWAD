// include the required modules
const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

// initialize express app
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// database connection configuration
const dbConfig = {
    host: (process.env.DB_HOST || "").trim(),
    user: (process.env.DB_USER || "").trim(),
    password: process.env.DB_PASSWORD,
    database: (process.env.DB_NAME || "").trim(),
    port: Number(process.env.DB_PORT) || 3306,

    // pool options (these only apply when using createPool)
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
};

// create ONE pool for the whole app (do this once)
const pool = mysql.createPool(dbConfig);

// start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const cors = require("cors");

const allowedOrigins = [
    "http://localhost:3000",
    "https://ca2assignmentmanager.onrender.com",
];

app.use(
    cors({
        origin: function (origin, callback) {
            // allow requests with no origin (Postman/server-to-server)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    }),
);

const DEMO_USER = { id: 1, username: "admin", password: "admin123" };

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // create a token using the JWT secret
    const token = jwt.sign(
        { id: DEMO_USER.id, username: DEMO_USER.username },
        JWT_SECRET,
        { expiresIn: "1h" },
    );

    res.json({ token });
});

// Middleware to protect routes
function requireAuth(req, res, next) {
    const header = req.headers.authorization; // "Bearer TOKEN"

    if (!header) {
        return res.status(401).json({ error: "Authorization header required" });
    }

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid authorization format" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // attach user info to request
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// get all cards
app.get("/allcards", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM assignments");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching assignments:", error);
        res
            .status(500)
            .json({ error: "Internal Server Error for getting all assignments" });
    }
});

// add a new card
app.post("/addcard", requireAuth, async (req, res) => {
    const { cardname, cardpic } = req.body;

    if (!assignmentname || !duedate || !status) {
        return res
            .status(400)
            .json({ error: "assignmentname, duedate and status are required" });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO assignments (assignmentname, duedate, status) VALUES (?, ?, ?)",
            [assignmentname, duedate, status],
        );
        res.status(201).json(result);
    } catch (error) {
        console.error("Error adding assignment:", error);
        res.status(500).json({ error: "Internal Server Error for adding an assignment" });
    }
});

// update a card, week 10
app.put("/updatecard/:id", async (req, res) => {
    const { id } = req.params;
    const { assignmentname, duedate, status } = req.body;

    if (!assignmentname || !duedate || !status) {
        return res
            .status(400)
            .json({ error: "assignmentname, duedate and status are required" });
    }

    try {
        const [result] = await pool.query(
            "UPDATE assignments SET assignmentname = ?, duedate = ?, status = ? WHERE id = ?",
            [assignmentname, duedate, status, id],
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        res
            .status(200)
            .json({ message: "Assignment updated", affectedRows: result.affectedRows });
    } catch (error) {
        console.error("Error updating assignment:", error);
        res
            .status(500)
            .json({ error: "Internal Server Error for updating an assignment" });
    }
});

// delete a card, week 10
app.delete("/deletecard/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM assignments WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        res
            .status(200)
            .json({ message: "Assignment deleted", affectedRows: result.affectedRows });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        res
            .status(500)
            .json({ error: "Internal Server Error for deleting an assignment" });
    }
});
