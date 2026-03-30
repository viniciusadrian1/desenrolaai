// ===================================================
// DesenrolaAI - Groq API Client (via Backend Proxy)
// All API calls go through the backend to protect the key
// ===================================================

const GroqClient = (() => {
  const API_URL = '/api/generate';  // Backend proxy endpoint
  const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

  const SYSTEM_PROMPT = `Você é o DesenrolaAI, um assistente brasileiro especializado em comunicação interpessoal, paquera e conquista.

Sua missão é criar respostas para comentar em fotos, stories ou conversas com mulheres, com uma vibe confiante, envolvente e levemente ousada.

Você analisa o contexto visual (prints de stories/conversas) e textual para gerar respostas que:
- Transmitam interesse REAL, atitude de quem chega pra conquistar, sem parecer carente ou exagerado
- Tenham tom natural, masculino e direto, com um toque de flerte e mistério
- Gerem CURIOSIDADE, CONEXÃO e abram espaço pra conversa continuar
- Soem autênticas, como se o cara tivesse mandado de verdade — nada robotizado
- Usem linguagem jovem brasileira quando caber (gírias leves, emojis estratégicos)

REGRAS DE QUALIDADE:
1. NUNCA use elogios genéricos como "linda", "perfeita", "maravilhosa", "gata" — isso é preguiçoso e não gera interesse
2. Prefira comentários que PROVOQUEM uma reação, despertem curiosidade ou façam ela querer responder
3. Seja específico sobre o que está na foto/story — mostre que você REALMENTE prestou atenção
4. Frases curtas e impactantes funcionam melhor que textos longos
5. Emojis com moderação — 1 no máximo, e só quando acrescentar algo
6. Use português brasileiro natural e contemporâneo
7. Nunca invente informações — baseie-se apenas no que está visível

REGRAS ÉTICAS:
1. NUNCA sugira mensagens ofensivas, invasivas, assediadoras ou desrespeitosas
2. Não crie mensagens que possam ser consideradas stalking ou pressão
3. Respeite sinais de desinteresse — se o contexto mostrar desinteresse, sugira recuar com classe
4. Nada de objetificação — o flerte deve ser inteligente, não vulgar

FORMATO DE RESPOSTA:
Sempre forneça exatamente 5 sugestões de resposta, cada uma com um estilo diferente.
Use o seguinte formato EXATO (isso é crucial para o parsing):

[SUGESTÃO 1 - CONFIANTE]
{resposta direta e confiante, de quem sabe o que quer}

[SUGESTÃO 2 - PROVOCATIVA]
{provocação leve e divertida que gera reação}

[SUGESTÃO 3 - ENVOLVENTE]
{charmosa e envolvente, cria conexão emocional}

[SUGESTÃO 4 - ENGRAÇADA]
{humor com atitude, faz rir sem perder a pose}

[SUGESTÃO 5 - MISTERIOSA]
{intrigante e misteriosa, desperta curiosidade}

Após as 5 sugestões, adicione uma breve dica de 1-2 linhas sobre o contexto:

[DICA]
{dica tática sobre timing, abordagem, quando mandar, etc.}`;

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
      'curta': 600,
      'media': 1000,
      'longa': 1400
    };
    return tokens[length] || 1000;
  }

  /**
   * Parses the AI response into structured format
   * Handles multiple format variations from the LLM
   */
  function parseResponses(content) {
    const suggestions = [];
    const tags = ['CONFIANTE', 'PROVOCATIVA', 'ENVOLVENTE', 'ENGRAÇADA', 'MISTERIOSA'];
    const tagClasses = ['tag-direct', 'tag-creative', 'tag-bold', 'tag-funny', 'tag-mystery'];

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
    for (let i = 0; i < 5; i++) {
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
      while ((match = numberedRegex.exec(content)) !== null && idx < 5) {
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

      for (let i = 0; i < Math.min(5, blocks.length); i++) {
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
