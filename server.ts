import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Groq API Client securely on the server
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GROQ_API_KEY environment variable is not set. AI features will fallback to mock responses.");
    }
    groqClient = new Groq({
      apiKey: apiKey || "MOCK_KEY",
    });
  }
  return groqClient;
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// API: Convert Handwritten Notes
app.post("/api/notes/convert-handwritten", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      res.status(400).json({ error: "Image data is required" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // Return a simulated structured note with a visual diagram if API Key is missing
      res.json({
        title: "Transcribed Note (Offline Demo)",
        category: "Machine Learning",
        text: `# Backpropagation & Gradient Descent

Here is a simulated transcription of your handwritten note. Connect your **GROQ_API_KEY** in the Secrets panel to activate live high-performance handwritten notes conversion!

## Core Concepts
1. **Feed-Forward Pass**: Input vectors are propagated through layers to produce outputs.
2. **Loss Computation**: The difference between predicted outputs and ground truth is calculated.
3. **Backpropagation**: Loss gradients are propagated backward to update weights.

## Conceptual Visual Diagram
\`\`\`mermaid
graph TD
    A[Input Layer] -->|Feed-Forward| B[Hidden Layer]
    B -->|Feed-Forward| C[Output Layer]
    C -->|Compute Loss| D[Loss Node]
    D -.->|Backpropagate Gradient| B
    B -.->|Backpropagate Gradient| A
\`\`\`

## Detailed Notes & Explanation
Backpropagation is the cornerstone of modern deep learning. By using the chain rule of calculus, we compute the gradient of the loss function with respect to each weight in the network. This allows gradient descent to iteratively minimize the loss and optimize model performance.`
      });
      return;
    }

    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are the StudentOS AI Document Processing Engine. 
Your task is to analyze the uploaded handwritten notes image and convert it into a "perfect" study note.

Follow these strict output guidelines:
1. Extract and transcribe all text from the handwriting perfectly, fixing any handwriting typos or incomplete phrases.
2. Structure the transcribed text into a highly professional, beautifully formatted markdown document.
3. Critically: Design and embed a clear conceptual diagram illustrating the topic using Mermaid JS syntax (inside \`\`\`mermaid ... \`\`\` block). If a diagram isn't explicitly in the image, synthesize a helpful, clean diagram that explains the underlying academic concepts (e.g. flowcharts, state diagrams, hierarchies).
4. Organize the note into clear logical sections:
   - Start with a clear "# [A highly descriptive title derived from the note]"
   - A section "## Overview" or "## Core Concepts"
   - A section "## Conceptual Visual Diagram" containing the Mermaid block
   - A section "## Detailed Notes & Explanation" elaborating on the concepts with high technical rigor, formulas (using clean readable notation), and key definitions.
5. Determine an appropriate subject/category name for this note from common subjects (e.g., "Machine Learning", "DBMS", "Operating Systems", "Mathematics", "Physics", "General").

You must return a JSON response matching the following structure:
{
  "title": "A concise and elegant title for the note",
  "category": "The selected category name",
  "text": "The entire structured markdown content including the Mermaid diagram"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || "image/png"};base64,${image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    const textResult = response.choices[0]?.message?.content || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(textResult);
    } catch (parseErr) {
      console.error("Failed to parse Groq output as JSON, returning raw text:", textResult);
      parsedResult = {
        title: "Converted Handwritten Note",
        category: "General",
        text: textResult
      };
    }
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Handwritten Note Conversion Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// API: AI Study Assistant
app.post("/api/study-assistant", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // Return beautiful academic simulation if API Key is missing
      res.json({
        text: `[Offline Mode] Here is some helpful information regarding: "${message}". Connect your GROQ_API_KEY in the Secrets panel to activate live high-performance answers! Since we are in offline mode, a binary search tree is a node-based binary tree data structure which has the following properties: The left subtree of a node contains only nodes with keys lesser than the node's key, and the right subtree of a node contains only nodes with keys greater than the node's key.`
      });
      return;
    }

    const groq = getGroqClient();
    
    // Construct formatting and guidelines for deep tech/professional tutor responses
    const systemInstruction = `You are the StudentOS AI Study Assistant, an elite, high-performance academic tutor. 
Provide extremely precise, technically rich, and structured academic explanations. 
Include formatted elements like list items, key definitions, and clean formatting.
Match the student's ambitious, technical profile (high performance focus). Keep it professional, encouraging, and clear.`;

    const messages = [
      {
        role: "system",
        content: systemInstruction
      }
    ];

    // Map history to messages structure for Groq SDK
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        messages.push({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text
        });
      });
    }
    
    // Add the current message
    messages.push({
      role: "user",
      content: message
    });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages as any,
      temperature: 0.7,
    });

    res.json({ text: response.choices[0]?.message?.content || "" });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// API: Note Enhancer / AI Actions
app.post("/api/notes/ai-action", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { noteTitle, noteContent, action } = req.body;
    if (!noteContent) {
      res.status(400).json({ error: "Note content is required" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.json({
        text: `\n\n=== AI Action Simulation (Offline) ===\nSelected Action: ${action}\nConnect your GROQ_API_KEY to see live AI insights.\nHere is a simulated response based on your note "${noteTitle || "Untitled"}": This topic is central to core academic examinations. Ensure you master the underlying formulas and time complexity bounds.`
      });
      return;
    }

    const groq = getGroqClient();

    let prompt = "";
    if (action === "summarize") {
      prompt = `Provide a concise, high-impact technical summary with key takeaways for the following note titled "${noteTitle || "Untitled"}":\n\n${noteContent}`;
    } else if (action === "quiz") {
      prompt = `Generate a 3-question challenging study quiz (with multiple choice options and explained answers) to test mastery on the following note titled "${noteTitle || "Untitled"}":\n\n${noteContent}`;
    } else if (action === "explain") {
      prompt = `Provide a comprehensive academic breakdown, explaining key concepts and mathematical/logical formulations for the following note titled "${noteTitle || "Untitled"}":\n\n${noteContent}`;
    } else {
      prompt = `Perform an academic optimization scan and suggest enhancements for this study note titled "${noteTitle || "Untitled"}":\n\n${noteContent}`;
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are the StudentOS AI Academic Engine. Your job is to format note annotations beautifully. Keep your answers focused, direct, and academic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
    });

    res.json({ text: response.choices[0]?.message?.content || "" });
  } catch (error: any) {
    console.error("AI Action Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
