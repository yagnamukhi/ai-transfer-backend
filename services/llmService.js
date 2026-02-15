// const OpenAI = require("openai");

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// async function extractEntities(transcript) {
//   const response = await client.chat.completions.create({
//     model: "gpt-4o-mini",
//     temperature: 0,
//     messages: [
//       {
//         role: "system",
//         content: `
// Extract work transfer entities from transcript.

// Return STRICT JSON only.

// {
//   "department": string | null,
//   "jobTitle": string | null,
//   "payGrade": string | null,
//   "employmentType": string | null,
//   "project": string | null,
//   "location": string | null,
//   "shift": string | null,
//   "workMode": string | null
// }
// `
//       },
//       {
//         role: "user",
//         content: transcript
//       }
//     ]
//   });

//   const content = response.choices[0].message.content.trim();
//   return JSON.parse(content);
// }

// module.exports = { extractEntities };
