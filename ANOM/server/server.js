const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("🚀 ANOM AI Backend is Running");
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Hello from ANOM AI Backend!"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});