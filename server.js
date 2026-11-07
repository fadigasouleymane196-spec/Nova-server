import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

function client() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("OPENAI_API_KEY manquante sur le serveur.");
    err.status = 500;
    throw err;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function clean(value, max = 12000) {
  return String(value ?? "").trim().slice(0, max);
}

async function ask(text, extra = "") {
  const response = await client().responses.create({
    model: MODEL,
    instructions:
      "Tu es NOVAIA, un assistant intelligent francophone. " +
      "Réponds clairement, utilement et avec un ton naturel. " +
      "Pour les devoirs, explique les étapes. " +
      "Pour les demandes créatives, sois original mais précis. " +
      extra,
    input: clean(text)
  });
  return response.output_text || "Je n'ai pas pu produire une réponse.";
}

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "NOVAIA", model: MODEL });
});

app.post("/chat", async (req, res) => {
  try {
    const message = clean(req.body?.message);
    if (!message) return res.status(400).json({ error: "Message vide." });
    res.json({ answer: await ask(message) });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || "Erreur serveur." });
  }
});

app.post("/study", async (req, res) => {
  try {
    const subject = clean(req.body?.subject, 200);
    const question = clean(req.body?.question);
    if (!question) return res.status(400).json({ error: "Question vide." });
    const prompt = `Matière: ${subject || "générale"}\nQuestion/exercice: ${question}`;
    res.json({ answer: await ask(prompt, "Agis comme un professeur patient. Donne une explication structurée adaptée à un élève.") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
});

app.post("/create", async (req, res) => {
  try {
    const type = clean(req.body?.type, 100);
    const brief = clean(req.body?.brief);
    if (!brief) return res.status(400).json({ error: "Demande vide." });
    res.json({ answer: await ask(`Type de création: ${type || "texte"}\nDemande: ${brief}`, "Produis un résultat directement réutilisable et bien présenté.") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
});

app.post("/music", async (req, res) => {
  try {
    const subject = clean(req.body?.subject);
    const style = clean(req.body?.style, 200);
    if (!subject) return res.status(400).json({ error: "Sujet manquant." });
    const prompt = `Crée une chanson originale sur: ${subject}. Style souhaité: ${style || "afro moderne"}. Donne un titre, une structure couplet/refrain/pont et des paroles originales.`;
    res.json({ answer: await ask(prompt, "Ne reproduis pas de paroles protégées existantes.") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
});

app.post("/vision", async (req, res) => {
  try {
    const image = clean(req.body?.image, 11000000);
    const question = clean(req.body?.question || "Analyse cette image et explique ce qu'elle montre.");
    if (!image.startsWith("data:image/")) return res.status(400).json({ error: "Image invalide." });

    const response = await client().responses.create({
      model: MODEL,
      instructions: "Tu es NOVAIA. Analyse l'image de façon claire et prudente. Ne prétends pas connaître l'identité d'une personne dans l'image.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: question },
          { type: "input_image", image_url: image, detail: "auto" }
        ]
      }]
    });
    res.json({ answer: response.output_text || "Je n'ai pas pu analyser l'image." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur d'analyse d'image." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NOVAIA backend running on port ${PORT}`);
});
