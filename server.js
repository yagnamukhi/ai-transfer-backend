// server.js - Cloud Llama3 version (Groq)

require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== Simple In-Memory Cache =====
const transferHistory = {}; 
// Structure:
// {
//   employeeId: [
//     { Department: "Admin", Location: "Hyd" },
//     ...
//   ]
// }


// ===== Groq Config =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ===== POST /save-transfer =====
app.post("/save-transfer", (req, res) => {
  const { employeeId, selection } = req.body;

  if (!employeeId || !selection) {
    return res.status(400).json({ error: "Missing data" });
  }

  if (!transferHistory[employeeId]) {
    transferHistory[employeeId] = [];
  }

  // Add new selection to beginning
  transferHistory[employeeId].unshift(selection);

  // Keep only last 10
  transferHistory[employeeId] = transferHistory[employeeId].slice(0, 10);
  console.log("Full Transfer History:", JSON.stringify(transferHistory, null, 2));

  res.json({ message: "Saved successfully" });
});

// ===== GET /predict/:employeeId =====
// ===== GET /predict/:employeeId (Hybrid AI Version) =====
app.get("/predict/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const history = transferHistory[employeeId] || [];

    // ===== CASE 1: No history =====
    if (history.length === 0) {
      return res.json({
        prediction: null,
        message: "No previous transfers found"
      });
    }

    // ===== CASE 2: Only one submission (No pattern exists) =====
    if (history.length === 1) {
      return res.json({
        prediction: history[0],
        message: "You recently selected these values"
      });
    }

    // ===== CASE 3: 2 or more submissions → Use AI =====
    const aiPrompt = `
You are an AI prediction engine for a workforce transfer system.

Employee transfer history (most recent first):
${JSON.stringify(history, null, 2)}

Your task:
1. Analyze frequency patterns.
2. Consider recency bias.
3. Predict the most likely next transfer selection.

STRICT RULES:
- Return ONLY valid JSON.
- Do NOT explain.
- Do NOT add extra text.
- Output format must match previous selection object exactly.
`;

    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a strict JSON prediction engine."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const rawOutput = response.data.choices[0].message.content.trim();
    console.log("AI Prediction RAW:", rawOutput);

    let parsedPrediction;

    try {
      parsedPrediction = JSON.parse(rawOutput);
    } catch (err) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: rawOutput
      });
    }

    return res.json({
      prediction: parsedPrediction,
      message: "AI-based prediction"
    });

  } catch (error) {
    console.error("Prediction Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Prediction failed" });
  }
});





// ===== POST /generate =====
app.post("/generate", async (req, res) => {
  try {
    const { prompt, lcfContext } = req.body;

    if (!prompt || !lcfContext) {
      return res.status(400).json({ error: "Missing prompt or lcfContext" });
    }

    // ===== Strict Prompt =====
    const formattedPrompt = `
You are an AI assistant for a workforce kiosk transfer system.

User speech:
"${prompt}"

Matched categories and allowed options:
${JSON.stringify(lcfContext, null, 2)}

STRICT RULES:
1. You MUST only choose values from the provided options.
2. If the spoken text does NOT clearly contain one of the options, return null.
3. Do NOT guess.
4. Do NOT infer.
5. Do NOT create new values.
6. If nothing matches, return an empty JSON {}.
7. Return ONLY valid JSON.
8. No explanation text.
`;

    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.1-8b-instant",
        temperature: 0,
        response_format: { type: "json_object" }, // Force JSON
        messages: [
          {
            role: "system",
            content: `
You are a strict JSON generator.
You never explain.
You never add extra text.
You never guess values.
You only select from provided options.
If no exact match exists, return null.
`
          },
          {
            role: "user",
            content: formattedPrompt
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const rawOutput = response.data.choices[0].message.content.trim();
    console.log("RAW LLM OUTPUT:", rawOutput);

    let parsedResult;

    try {
      parsedResult = JSON.parse(rawOutput);
    } catch (err) {
      return res.status(500).json({
        error: "AI did not return valid JSON",
        raw: rawOutput
      });
    }

    // ===== Backend Validation Layer =====
    const validatedResult = {};

    Object.keys(parsedResult).forEach(category => {
      const categoryData = lcfContext.find(
        c => c.category === category
      );

      if (!categoryData) return;

      if (categoryData.options.includes(parsedResult[category])) {
        validatedResult[category] = parsedResult[category];
      } else {
        validatedResult[category] = null;
      }
    });

    res.json({ result: validatedResult });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "LLM request failed" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 4000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
