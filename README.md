# Daymark App

<p align="center">
  <a href="https://github.com/realximanta/daymark-app">
    <img src="https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80" alt="Daymark App Banner" width="100%" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node version" />
  <img src="https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/GitHub-App-Enabled-181717?logo=github&logoColor=white" alt="GitHub App" />
  <img src="https://img.shields.io/badge/Groq-AI-Integrated-FB7185?logo=groq&logoColor=white" alt="Groq AI" />
  <img src="https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white" alt="Render" />
</p>

Daymark App is a lightweight journaling backend that turns daily check-ins into organized markdown notes inside a GitHub repository. It accepts a category and raw text, formats the entry with AI assistance, and saves it under a date-based folder structure.

## ✨ Features

- AI-assisted formatting for daily entries
- Structured category-based journaling
- GitHub App authentication for secure repository writes
- Automatic date-based file organization
- Health check endpoint for uptime monitoring
- Ready for Render deployment

## 🧠 Supported categories

- `currently-doing`
- `what-i-ate`
- `new-idea`
- `schedule-tasks`
- `regret`
- `success`
- `travelled-to`
- `plan-tomorrow`
- `watched`

## 🏗️ How it works

The app receives a POST request to `/entry`, validates the category and text, then:

1. Formats the raw diary entry using Groq AI
2. Determines the correct file name from the category map
3. Creates or updates the date-based markdown file in the target GitHub repo
4. Saves the entry with a timestamped section block

## 📦 Tech stack

- Node.js
- Express.js
- GitHub REST API via Octokit
- JWT-based GitHub App authentication
- Groq OpenAI-compatible chat completions API

## 🚀 API usage

### POST `/entry`

Request body:

```json
{
  "category": "currently-doing",
  "rawText": "Built the dashboard and reviewed the feature list.",
  "timestamp": 1720000000000
}
```

Example response:

```json
{
  "ok": true,
  "path": "2025-07-05/currently-doing.md"
}
```

## 🔐 Environment variables

Set the following environment variables before running the app:

```bash
GH_APP_ID=your_github_app_id
GH_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GH_INSTALL_ID=your_installation_id
GH_REPO_OWNER=your_github_username_or_org
GH_REPO_NAME=your_repository_name
GROQ_API_KEY=your_groq_api_key
MODEL_NAME=openai/gpt-oss-20b
PORT=3000
```

## ▶️ Run locally

```bash
npm install
npm start
```

Then visit:

- `http://localhost:3000/health`

## ☁️ Deploy on Render

This repository includes a `render.yaml` configuration for deployment. Once connected to Render, the service will run the app with the required environment variables.

## 🖼️ Preview

<p align="center">
  <a href="https://github.com/realximanta/daymark-app">
    <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80" alt="Productivity workspace" width="420" />
  </a>
  <a href="https://github.com/realximanta/daymark-app">
    <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80" alt="Team collaboration" width="420" />
  </a>
</p>

## 📌 Notes

This project is designed for journaling workflows where personal updates are captured as plain markdown files in a GitHub repository.

If you want, you can extend it with:

- a frontend dashboard
- analytics summaries
- category-specific templates
- note export features

---

<p align="center">
  Built with ❤️ for daily reflection and structured personal tracking.
</p>
