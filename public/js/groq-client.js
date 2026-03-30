// ===================================================
// DesenrolaAI - Groq API Client (via Backend Proxy)
// All API calls go through the backend to protect the key
// ===================================================

const GroqClient = (() => {
  const API_URL = '/api/generate';  // Backend proxy endpoint
  const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

  const SYSTEM_PROMPT = `Você é o DesenrolaAI, um assistente brasileiro especializado em comunicação interpessoal e paquera.

Sua missão é ajudar o usuário a responder stories do Instagram, mensagens no WhatsApp ou iniciar conversas de forma natural, interessante e envolvente.

Você analisa o contexto visual (prints de stories/conversas) e textual para gerar respostas que:
- Soem naturais e autênticas, como se o próprio usuário tivesse escrito
- Despertem interesse e mantenham a conversa fluindo
- Sejam adaptadas ao contexto e tom desejado pelo usuário
- Usem linguagem jovem brasileira quando apropriado (gírias leves, emojis)

REGRAS OBRIGATÓRIAS:
1. Sempre respeite limites éticos - NUNCA sugira mensagens ofensivas, invasivas, assediadoras ou desrespeitosas
2. Não crie mensagens que possam ser consideradas stalking ou pressão
3. Respeite sinais de desinteresse - se o contexto mostrar desinteresse, sugira recuar educadamente
4. Adapte o tom conforme solicitado (humor, interesse, casual, romântico, misterioso, confiante)
5. Considere o contexto emocional e cultural da conversa
6. Use português brasileiro natural e contemporâneo
7. Nunca invente informações sobre a outra pessoa - baseie-se apenas no que está visível

FORMATO DE RESPOSTA:
Sempre forneça exatamente 3 sugestões de resposta, cada uma com uma abordagem diferente.
Use o seguinte formato EXATO (isso é crucial para o parsing):

[SUGESTÃO 1 - DIRETA]
{sua sugestão aqui}

[SUGESTÃO 2 - CRIATIVA]
{sua sugestão aqui}

[SUGESTÃO 3 - OUSADA]
{sua sugestão aqui}

Após as 3 sugestões, adicione uma breve dica de 1-2 linhas sobre o contexto:

[DICA]
{dica contextual sobre timing, abordagem, etc.}`;

  /**
   * Generates responses based on image and prompt
   * @param {string|null} imageBase64 - Base64 encoded image (optional)
   * @param {string} userPrompt - User's prompt/request
   * @param {object} style - Style preferences { tone, formality, length }
   * @returns {Promise<object>} Parsed responses
   */
  async function generateResponses(imageBase64, userPrompt, style) {
    const styleContext = buildStyleContext(style);
    const userMessage = buildUserMessage(imageBase64, userPrompt, styleContext);

    const requestBody = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        userMessage
      ],
      temperature: getTemperature(style.tone),
      max_tokens: getMaxTokens(style.length),
      top_p: 0.9,
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erro no servidor (${response.status})`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      return parseResponses(content);
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
      }
      throw error;
    }
  }

  /**
   * Builds the style context string
   */
  function buildStyleContext(style) {
    const tones = {
      'humor': 'Use humor e leveza, faça ela rir',
      'interesse': 'Demonstre interesse genuíno, faça perguntas',
      'misterioso': 'Seja misterioso e intrigante, desperte curiosidade',
      'casual': 'Seja descontraído e natural, como um papo entre amigos',
      'romantico': 'Seja romântico e charmoso, mas sem exageros',
      'confiante': 'Seja confiante e assertivo, mostre segurança'
    };

    const formalities = {
      'informal': 'Use linguagem bem informal, gírias e emojis',
      'neutro': 'Use linguagem equilibrada, natural mas educada',
      'formal': 'Use linguagem mais formal e polida'
    };

    const lengths = {
      'curta': 'Respostas curtas e diretas (1-2 frases)',
      'media': 'Respostas de tamanho médio (2-3 frases)',
      'longa': 'Respostas mais elaboradas (3-5 frases)'
    };

    return `
ESTILO DESEJADO:
- Tom: ${tones[style.tone] || tones['casual']}
- Formalidade: ${formalities[style.formality] || formalities['neutro']}
- Comprimento: ${lengths[style.length] || lengths['media']}`;
  }

  /**
   * Builds the user message with optional image
   */
  function buildUserMessage(imageBase64, userPrompt, styleContext) {
    const textContent = `${userPrompt || 'Analise esta imagem e sugira respostas para continuar a conversa.'}

${styleContext}`;

    if (imageBase64) {
      return {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          },
          {
            type: 'text',
            text: textContent
          }
        ]
      };
    }

    return {
      role: 'user',
      content: textContent
    };
  }

  /**
   * Gets temperature based on tone
   */
  function getTemperature(tone) {
    const temps = {
      'humor': 0.9,
      'interesse': 0.7,
      'misterioso': 0.8,
      'casual': 0.75,
      'romantico': 0.7,
      'confiante': 0.65
    };
    return temps[tone] || 0.75;
  }

  /**
   * Gets max tokens based on length preference
   */
  function getMaxTokens(length) {
    const tokens = {
      'curta': 400,
      'media': 700,
      'longa': 1000
    };
    return tokens[length] || 700;
  }

  /**
   * Parses the AI response into structured format
   * Handles multiple format variations from the LLM
   */
  function parseResponses(content) {
    const suggestions = [];
    const tags = ['DIRETA', 'CRIATIVA', 'OUSADA'];
    const tagClasses = ['tag-direct', 'tag-creative', 'tag-bold'];

    // Extract tip first (to remove from content for cleaner parsing)
    let tip = '';
    const tipPatterns = [
      /\[?\s*DICA\s*\]?\s*[:\-]?\s*\n([\s\S]*?)$/i,
      /\*\*DICA\*\*\s*[:\-]?\s*\n([\s\S]*?)$/i,
      /DICA:\s*\n?([\s\S]*?)$/i
    ];
    for (const pattern of tipPatterns) {
      const tipMatch = content.match(pattern);
      if (tipMatch) {
        tip = tipMatch[1].trim();
        content = content.substring(0, tipMatch.index).trim();
        break;
      }
    }

    // Strategy 1: Match [SUGESTÃO X - LABEL] with flexible spacing/brackets
    for (let i = 0; i < 3; i++) {
      const patterns = [
        new RegExp(`\\[\\s*SUGEST[ÃA]O\\s*${i + 1}[^\\]]*\\]\\s*\\n([\\s\\S]*?)(?=\\[\\s*SUGEST[ÃA]O\\s*${i + 2}|\\[\\s*DICA|$)`, 'i'),
        new RegExp(`\\*\\*\\s*SUGEST[ÃA]O\\s*${i + 1}[^*]*\\*\\*\\s*\\n([\\s\\S]*?)(?=\\*\\*\\s*SUGEST[ÃA]O\\s*${i + 2}|\\*\\*\\s*DICA|$)`, 'i'),
        new RegExp(`SUGEST[ÃA]O\\s*${i + 1}[^\\n]*[:\\-]\\s*\\n([\\s\\S]*?)(?=SUGEST[ÃA]O\\s*${i + 2}|DICA[:\\s]|$)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1].trim()) {
          suggestions.push({
            tag: tags[i],
            tagClass: tagClasses[i],
            text: match[1].trim().replace(/^[""]|[""]$/g, '').trim()
          });
          break;
        }
      }
    }

    // Strategy 2: numbered format
    if (suggestions.length < 2) {
      suggestions.length = 0;
      const numberedRegex = /(?:^|\n)\s*(?:\*\*)?(\d+)[.\)]\s*(?:\*\*)?\s*(?:[-–—]\s*)?(?:DIRETA|CRIATIVA|OUSADA|[^:\n]{0,20})?[:\-]?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*)?\d+[.\)])|$)/gi;
      let match;
      let idx = 0;
      while ((match = numberedRegex.exec(content)) !== null && idx < 3) {
        const text = match[2].trim().replace(/^[""]|[""]$/g, '').trim();
        if (text && text.length > 5) {
          suggestions.push({ tag: tags[idx], tagClass: tagClasses[idx], text });
          idx++;
        }
      }
    }

    // Strategy 3: Split by double newlines
    if (suggestions.length < 2) {
      suggestions.length = 0;
      const blocks = content.split(/\n\s*\n/).filter(b => {
        const cleaned = b.replace(/[\[\]*#\-]/g, '').trim();
        return cleaned.length > 15;
      });

      for (let i = 0; i < Math.min(3, blocks.length); i++) {
        let text = blocks[i]
          .replace(/^\s*[\[\(]?\s*SUGEST[ÃA]O\s*\d+[^\]\)]*[\]\)]?\s*/i, '')
          .replace(/^\s*\*\*[^*]+\*\*\s*/i, '')
          .replace(/^\s*\d+[.\)]\s*/i, '')
          .replace(/^[""]|[""]$/g, '')
          .trim();

        if (text.length > 5) {
          suggestions.push({ tag: tags[i], tagClass: tagClasses[i], text });
        }
      }
    }

    // Last resort
    if (suggestions.length === 0) {
      suggestions.push({ tag: 'RESPOSTA', tagClass: 'tag-direct', text: content.trim() });
    }

    return { suggestions, tip };
  }

  /**
   * Tests if the backend is connected and API key is configured
   */
  async function testConnection() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      return data.status === 'ok' && data.apiKeyConfigured;
    } catch {
      return false;
    }
  }

  return {
    generateResponses,
    testConnection
  };
})();
