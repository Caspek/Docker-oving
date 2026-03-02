import express from "express";
import cors from "cors";
import { initDb, pool } from "./db.js";
import { runJavaScript } from "./runner.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "200kb" }));

await initDb();

app.get("/health", (req, res) => res.json({ ok: true, name: "Docker-oving" }));

app.post("/api/run", async (req, res) => {
  try {
    const { lang, code } = req.body ?? {};

    if (lang !== "js") {
      return res.status(400).json({ error: "Only lang=js supported." });
    }
    if (typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({ error: "code must be a non-empty string" });
    }
    if (code.length > 50_000) {
      return res.status(400).json({ error: "code too large" });
    }

    const result = await runJavaScript(code);

    const insert = await pool.query(
      `INSERT INTO runs (lang, code, stdout, stderr, exit_code)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, created_at`,
      ["js", code, result.stdout, result.stderr, result.exitCode]
    );

    res.json({
      id: insert.rows[0].id,
      createdAt: insert.rows[0].created_at,
      ...result
    });
  } catch (e) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.get("/api/runs", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, lang, exit_code, created_at
     FROM runs
     ORDER BY created_at DESC
     LIMIT 20`
  );
  res.json(rows);
});

app.get("/api/runs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const { rows } = await pool.query(`SELECT * FROM runs WHERE id=$1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: "not found" });

  res.json(rows[0]);
});

app.listen(3000, () => console.log("Docker-oving API on http://localhost:3000"));