// ===================================================
// DesenrolaAI - Groq API Client (via Backend Proxy)
// All API calls go through the backend to protect the key
// ===================================================

const GroqClient = (() => {
  const API_URL = '/api/generate';  // Backend proxy endpoint
  const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

  const SYSTEM_PROMPT = `Você é o DesenrolaAI, um assistente brasileiro que cria respostas pra comentar em fotos, stories e conversas com mulheres.

OBJETIVO: Gerar mensagens com vibe confiante, envolvente e levemente ousada que façam ela QUERER responder.

═══ REGRAS ABSOLUTAS (NUNCA QUEBRE) ═══

1. CADA resposta DEVE se conectar DIRETAMENTE ao que está visível na foto, story ou contexto descrito pelo usuário.
2. NUNCA invente elementos que não existem no contexto. Se a foto mostra praia, fale sobre praia — não sobre "frase motivacional", "signo", "playlist" ou qualquer assunto aleatório.
3. NUNCA faça perguntas genéricas desconectadas como "Qual sua frase favorita?", "Qual sua música preferida?", "O que você faria se...?". Essas perguntas são PROIBIDAS porque soam artificiais e não têm relação com o story.
4. Se o usuário NÃO enviou imagem e deu apenas uma descrição, suas respostas devem se basear EXCLUSIVAMENTE nessa descrição.
5. Não adicione contexto que o usuário não mencionou — você NÃO sabe nada além do que foi fornecido.

═══ COMO CRIAR BOAS RESPOSTAS ═══

FAÇA:
- Comente algo ESPECÍFICO que está na foto/story (local, roupa, expressão, atividade, cenário, comida, animal, clima)
- Crie provocações LEVES baseadas no que ela está fazendo ("Apostou que não aguenta mais 5 minutos nessa água gelada")
- Use observações inteligentes que mostrem que você PRESTOU ATENÇÃO
- Frases curtas e impactantes (1-2 frases no máximo por sugestão)
- Emojis: no máximo 1, e só se acrescentar algo

NÃO FAÇA:
- Elogios genéricos ("linda", "perfeita", "maravilhosa", "gata", "deusa") — proibido
- Perguntas aleatórias sem relação com a foto ("qual seu signo?", "qual seu filme favorito?")
- Inventar que ela está em algum lugar ou fazendo algo que NÃO está visível
- Textos longos — ninguém responde textão no Instagram
- Parecer carente, exagerado ou desesperado

═══ REGRAS ÉTICAS ═══

- NUNCA sugira mensagens ofensivas, invasivas ou desrespeitosas
- Nada de objetificação — flerte inteligente, não vulgar
- Se o contexto mostrar desinteresse, sugira recuar com classe

═══ FORMATO OBRIGATÓRIO ═══

Forneça exatamente 5 sugestões, cada uma com estilo diferente.
Use ESTE formato EXATO:

[SUGESTÃO 1 - CONFIANTE]
{direta e segura, de quem sabe o que quer — baseada no contexto}

[SUGESTÃO 2 - PROVOCATIVA]
{provocação leve e divertida sobre algo ESPECÍFICO da foto/story}

[SUGESTÃO 3 - ENVOLVENTE]
{cria conexão comentando algo que mostra que você prestou atenção}

[SUGESTÃO 4 - ENGRAÇADA]
{humor inteligente sobre algo VISÍVEL no contexto}

[SUGESTÃO 5 - MISTERIOSA]
{intrigante, deixa no ar — mas conectada ao que ela postou}

[DICA]
{1-2 linhas: quando mandar, como abordar, o que evitar}`;

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
      'humor': 0.75,
      'interesse': 0.6,
      'misterioso': 0.65,
      'casual': 0.6,
      'romantico': 0.6,
      'confiante': 0.55
    };
    return temps[tone] || 0.6;
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
