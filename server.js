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

    const formattedPrompt = `
You are an AI assistant for a workforce kiosk transfer system.

User said: "${prompt}"

Available dropdown categories and options:
${JSON.stringify(lcfContext, null, 2)}

Instructions:
- Only choose values from the provided options.
- Return ONLY valid JSON with category-value pairs.
- If unsure, return null for that category.
- Example output:
{
  "Department": "ADMINISTRATION",
  "Shift": "MORNING SHIFT",
  "Job": null
}
`;

    const response = await axios.post(
      GROQ_URL,
      {
        // model: "llama3-70b-8192", // Llama 3 model
        model: "llama-3.1-8b-instant",

        messages: [
          { role: "system", content: "You are a helpful assistant that returns only valid JSON." },
          { role: "user", content: formattedPrompt }
        ],
        temperature: 0,
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

    res.json({ result: parsedResult });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "LLM request failed" });
  }
});

// ===== Start server =====
app.listen(4000, () =>
  console.log("Cloud Llama3 server running on port 4000")
);
