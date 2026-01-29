import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

dotenv.config();
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
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
};
const pool = mysql.createPool(dbConfig);

// simple CORS setup (optional)
app.use(cors());

// Demo user for login
const DEMO_USER = { id: 1, username: "admin", password: "admin123" };
const JWT_SECRET = process.env.JWT_SECRET;

// LOGIN
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: DEMO_USER.id, username: DEMO_USER.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
});

// GET all assignments
app.get("/assignments", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM assignments");
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ADD assignment
app.post("/assignments", async (req, res) => {
    const { assignmentname, duedate, status } = req.body;
    if (!assignmentname || !duedate || !status) {
        return res.status(400).json({ error: "assignmentname, duedate and status are required" });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO assignments (assignmentname, duedate, status) VALUES (?, ?, ?)",
            [assignmentname, duedate, status]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// UPDATE assignment
app.put("/assignments/:id", async (req, res) => {
    const { id } = req.params;
    const { assignmentname, duedate, status } = req.body;
    if (!assignmentname || !duedate || !status) {
        return res.status(400).json({ error: "assignmentname, duedate and status are required" });
    }
    try {
        const [result] = await pool.query(
            "UPDATE assignments SET assignmentname = ?, duedate = ?, status = ? WHERE id = ?",
            [assignmentname, duedate, status, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: "Assignment not found" });
        res.json({ message: "Assignment updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE assignment
app.delete("/assignments/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("DELETE FROM assignments WHERE id = ?", [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Assignment not found" });
        res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
