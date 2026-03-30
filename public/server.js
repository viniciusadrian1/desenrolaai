// ===================================================
// DesenrolaAI - Backend Server
// Express proxy to Groq API (protects API key)
// ===================================================

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Middleware
app.use(express.json({ limit: '10mb' }));  // Allow large payloads for base64 images
app.use(express.static(path.join(__dirname, 'public')));

// Health check / API status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!GROQ_API_KEY
  });
});

// Proxy endpoint for Groq API
app.post('/api/generate', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: 'API key do Groq não configurada no servidor. Verifique o arquivo .env'
    });
  }

  try {
    const { model, messages, temperature, max_tokens, top_p } = req.body;

    // Validate required fields
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Campos obrigatórios: model, messages (array)'
      });
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.75,
        max_tokens: max_tokens ?? 700,
        top_p: top_p ?? 0.9
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      const status = groqResponse.status;

      if (status === 429) {
        return res.status(429).json({
          error: 'Rate limit atingido. Aguarde alguns segundos e tente novamente.'
        });
      }
      if (status === 401) {
        return res.status(401).json({
          error: 'API key inválida. Verifique a chave no arquivo .env do servidor.'
        });
      }

      return res.status(status).json({
        error: errorData.error?.message || `Erro na API do Groq (${status})`
      });
    }

    const data = await groqResponse.json();
    res.json(data);

  } catch (error) {
    console.error('Erro ao chamar Groq API:', error.message);
    res.status(500).json({
      error: 'Erro interno do servidor ao se comunicar com a API do Groq.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🗣️  DesenrolaAI rodando em http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${GROQ_API_KEY ? '✅ Configurada' : '❌ NÃO ENCONTRADA - verifique o .env'}\n`);
});
