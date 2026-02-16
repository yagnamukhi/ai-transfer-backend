// server.js - Cloud Llama3 version (Groq)

require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== Groq Config =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
