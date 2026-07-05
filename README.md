# StudentOS AI 

StudentOS AI is a highly-polished, all-in-one student workspace featuring attendance tracking, a smart note library with AI capabilities, a CGPA calculator, dynamic flashcards, and an AI Study Assistant.

---

## 🚀 How to Run Locally in VS Code

Follow these simple steps to set up and run StudentOS AI on your local machine using Visual Studio Code.

### 📋 Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: Version `18.x` or higher (Recommended: LTS version)
- **npm**: Version `9.x` or higher (Bundled with Node.js)
- **VS Code**: A modern code editor with recommended extensions installed

---

### 📂 Setup Instructions

#### Step 1: Open the Project in VS Code
1. Download or extract the project folder to your local drive.
2. Launch VS Code.
3. Go to **File** > **Open Folder...** and select the root directory of this project.

#### Step 2: Configure Environment Variables
1. In the project root, create a file named `.env` by copying the example:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in VS Code and fill in the required API keys and configuration parameters:
   - `GROQ_API_KEY`: Your Groq API Key (if using Groq).
   - `GEMINI_API_KEY`: Your Google Gemini API Key (if using Gemini features).
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: (Optional) Your Supabase project URL and anon key.

#### Step 3: Install Dependencies
Open the VS Code integrated terminal (`Ctrl + `` or **Terminal** > **New Terminal**) and run:
```bash
npm install
```

#### Step 4: Launch the Development Server
Run the local full-stack development server with:
```bash
npm run dev
```
- This launches the Express backend combined with the Vite development middleware.
- The terminal will display the local URL (usually `http://localhost:3000`).
- Open this URL in your web browser to interact with StudentOS AI!

---

## 🛠️ Build and Production Deployment

To compile the application and bundle it for production deployment, run the following commands:

1. **Build the production bundle**:
   ```bash
   npm run build
   ```
   *This command bundles the client-side SPA static assets under `dist/` and compiles the backend `server.ts` into a fast, self-contained CommonJS file at `dist/server.cjs` via esbuild.*

2. **Start the production server**:
   ```bash
   npm run start
   ```
   *This runs the application on standard Node.js using the optimized production server.*

---

## 🔌 Recommended VS Code Extensions

For the best developer experience, we recommend installing the following VS Code extensions:
- 🎨 **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - For instant CSS utility class autocompletion.
- 📐 **ESLint** (`dbaeumer.vscode-eslint`) - For real-time code quality check and formatting warnings.
- 💅 **Prettier - Code formatter** (`esbenp.prettier-vscode`) - For automatic and consistent code styling.
- ⚡ **TypeScript Nightly** or the built-in TypeScript compiler for type safety support.
