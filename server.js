const express = require('express');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ═══════════════════════════════════════════
// 🔐 GITHUB APP CONFIG  (Render env vars)
// ═══════════════════════════════════════════
const GH_APP_ID        = process.env.GH_APP_ID;
const GH_PRIVATE_KEY   = (process.env.GH_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GH_INSTALL_ID    = process.env.GH_INSTALL_ID;
const REPO_OWNER       = process.env.GH_REPO_OWNER;
const REPO_NAME        = process.env.GH_REPO_NAME;

// ═══════════════════════════════════════════
// 🤖 GROQ AI CONFIG  (Render env vars)
// ═══════════════════════════════════════════
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL_NAME   = process.env.MODEL_NAME || 'qwen/qwen3.6-27b';
const API_URL      = 'https://api.groq.com/openai/v1/chat/completions';

// ═══════════════════════════════════════════
// 🗂️ CATEGORY → FILE NAME MAP
// ═══════════════════════════════════════════
const CATEGORY_FILE = {
  'currently-doing': 'currently-doing.md',
  'what-i-ate':      'meals.md',
  'new-idea':        'ideas.md',
  'schedule-tasks':  'tasks.md',
  'regret':          'regrets.md',
  'success':         'success.md',
  'travelled-to':    'travel.md',
  'plan-tomorrow':   'plan-tomorrow.md',
  'watched':         'watched.md',
};

// ═══════════════════════════════════════════
// 🕐 IST TIME HELPERS
// ═══════════════════════════════════════════
function toIST(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function toISTDateStr(epochMs) {
  const d = epochMs ? new Date(epochMs) : new Date();
  return d.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// ═══════════════════════════════════════════
// 🔑 GitHub App installation token (cached)
// ═══════════════════════════════════════════
let cachedToken = null;
let tokenExpiry = 0;

async function getInstallationToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: GH_APP_ID };
  const appJwt = jwt.sign(payload, GH_PRIVATE_KEY, { algorithm: 'RS256' });

  const { data } = await axios.post(
    `https://api.github.com/app/installations/${GH_INSTALL_ID}/access_tokens`,
    {},
    { headers: { Authorization: `Bearer ${appJwt}`, Accept: 'application/vnd.github+json' } }
  );

  cachedToken = data.token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

// ═══════════════════════════════════════════
// 🤖 Groq: structure entry (retries + IST)
// ═══════════════════════════════════════════
async function structureEntry(category, rawText, timestamp) {
  const istTime = toIST(timestamp);
  const fallback = `### ${istTime}\n\n${rawText}`;

  if (!GROQ_API_KEY) {
    console.error('🤖 GROQ_API_KEY missing');
    return fallback;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data } = await axios.post(
        API_URL,
        {
          model: MODEL_NAME,
          messages: [
            {
              role: 'system',
              content:
                'You format diary entries as clean markdown. ' +
                'Add a heading using the EXACT IST time provided. ' +
                'Add bullet points if helpful. ' +
                'NEVER change names, times, places, or facts. ' +
                'NEVER invent information. ' +
                'Output ONLY the formatted markdown, no preamble.'
            },
            {
              role: 'user',
              content: `Category: ${category}\nIST Time: ${istTime}\nRaw entry:\n${rawText}`
            }
          ],
          temperature: 0.2,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );
      return data.choices?.[0]?.message?.content?.trim() || fallback;

    } catch (err) {
      const status = err.response?.status;
      console.error(`🤖 AI attempt ${attempt} failed:`, err.message, '| status:', status);

      if ((status === 429 || (status >= 500 && status < 600)) && attempt < 3) {
        const waitMs = attempt * 3000;
        console.error(`🤖 waiting ${waitMs}ms before retry...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      console.error('🤖 Data:', JSON.stringify(err.response?.data));
      return fallback;
    }
  }
  return fallback;
}

// ═══════════════════════════════════════════
// 📝 POST /entry — main write path
// ═══════════════════════════════════════════
app.post('/entry', async (req, res) => {
  try {
    const { category, rawText, timestamp } = req.body;
    if (!category || !rawText) return res.status(400).json({ error: 'missing fields' });

    const fileName = CATEGORY_FILE[category] || `${category}.md`;
    const ts = timestamp || Date.now();
    const date = toISTDateStr(ts);
    const path = `${date}/${fileName}`;

    // 🧠 refine with Groq
    const structured = await structureEntry(category, rawText, ts);

    // 🐙 write to GitHub
    const token = await getInstallationToken();
    const octokit = new Octokit({ auth: token });

    let sha = null;
    let newContent = structured;

    try {
      const { data } = await octokit.repos.getContent({
        owner: REPO_OWNER, repo: REPO_NAME, path,
      });
      sha = data.sha;
      const existing = Buffer.from(data.content, 'base64').toString('utf8');
      newContent = `${existing}\n\n---\n\n${structured}`;
    } catch (e) {
      // file doesn't exist yet → new file
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message: `📝 ${category} @ ${toIST(ts)}`,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      sha,
    });

    res.json({ ok: true, path });
  } catch (err) {
    console.error('❌ /entry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// 💓 HEALTH (UptimeRobot pings this)
// ═══════════════════════════════════════════
app.head('/health', (_, res) => res.status(200).end());
app.get('/health',  (_, res) => res.json({ status: 'alive', time: Date.now() }));

// ═══════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Daymark backend on :${PORT}`));
