// ============================================================
// JAQUETA FILHO — BACKEND
// Ponte entre o app do celular e a API do Google Gemini (gratuita).
// O celular nunca vê a chave de API — ela fica só aqui no servidor.
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.1-flash-lite';
// No Render (e na maioria dos serviços de hospedagem), o HTTPS já é
// fornecido automaticamente pela plataforma. O certificado local só é
// necessário quando rodamos no próprio PC, para testar no celular via Wi-Fi.
const IS_HOSTED = !!process.env.RENDER || !!process.env.IS_HOSTED;

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY não definida. Configure antes de usar em produção.');
}

// ------------------------------------------------------------
// Definição das ferramentas que o Jaqueta Filho pode "executar".
// O TEXTO da definição vai para o Gemini (pra ele saber quando usar).
// A EXECUÇÃO de verdade acontece no celular (ex: abrir um link),
// então aqui o backend só avisa o celular qual tool foi escolhida.
// ------------------------------------------------------------
const TOOLS = [
  {
    name: 'que_horas_sao',
    description: 'Informa a hora atual para o usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'abrir_dashboard_arp',
    description: 'Abre o dashboard de gestão ARP (vendas, faturamento, recebimentos) no celular do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'abrir_arena_de_vendas',
    description: 'Abre o placar gamificado Arena de Vendas no celular do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];

const SYSTEM_PROMPT = `Você é o Jaqueta Filho, um assistente pessoal de voz no estilo do filme Homem de Ferro.
Responda sempre em português do Brasil, de forma direta, educada e levemente formal — como um mordomo
britânico eficiente. Respostas devem ser curtas (1-3 frases), porque serão lidas em voz alta no celular
do usuário. Quando uma ferramenta resolver o pedido do usuário, use-a. Não invente informações que
você não tem.`;

// ------------------------------------------------------------
// Rota principal: o app do celular manda { message: "..." }
// e recebe { reply: "...", tool_call: "nome_da_tool" | null }
// ------------------------------------------------------------
app.post('/jaqueta/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Campo "message" é obrigatório.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        tools: [
          { function_declarations: TOOLS }
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Erro da API do Gemini:', errText);

      // Erro 429 = limite de uso gratuito atingido (temporário, passa em segundos)
      if (geminiResponse.status === 429) {
        return res.json({
          reply: 'Calma um instante, estou no limite de uso gratuito agora. Tente de novo em alguns segundos.',
          tool_call: null
        });
      }

      return res.status(502).json({ error: 'Falha ao consultar a API do Gemini.' });
    }

    const data = await geminiResponse.json();

    // A resposta do Gemini vem em candidates[0].content.parts[],
    // que pode ter partes de texto e/ou de chamada de função (functionCall).
    let replyText = '';
    let toolCall = null;

    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        replyText += part.text;
      } else if (part.functionCall) {
        toolCall = part.functionCall.name;
      }
    }

    // Se o Gemini chamou uma tool mas não escreveu nada de texto,
    // geramos uma frase curta de confirmação como fallback.
    if (toolCall && !replyText) {
      const fallbackPhrases = {
        que_horas_sao: 'Verificando o horário.',
        abrir_dashboard_arp: 'Abrindo o dashboard ARP agora.',
        abrir_arena_de_vendas: 'Abrindo a Arena de Vendas.'
      };
      replyText = fallbackPhrases[toolCall] || 'Executando sua solicitação.';
    }

    res.json({
      reply: replyText || '(sem resposta)',
      tool_call: toolCall
    });

  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Healthcheck simples
app.get('/jaqueta/health', (req, res) => {
  res.json({ status: 'ok', model: MODEL });
});

// Iniciar servidor HTTP normal (é o que o Render usa em produção)
http.createServer(app).listen(PORT, () => {
  console.log(`Jaqueta Filho backend rodando na porta ${PORT} (HTTP)`);
});

// Servidor HTTPS local extra — só relevante quando rodando no seu PC
// (em produção no Render isso é ignorado, pois IS_HOSTED é verdadeiro
// e a plataforma já cuida do HTTPS automaticamente)
if (!IS_HOSTED && fs.existsSync('cert.pem') && fs.existsSync('key.pem')) {
  const sslOptions = {
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem')
  };
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`Jaqueta Filho backend rodando na porta ${HTTPS_PORT} (HTTPS)`);
    console.log(`Acesse do celular: https://192.168.0.122:${HTTPS_PORT}/jaqueta-filho.html`);
  });
} else if (!IS_HOSTED) {
  console.log('Dica: execute "node gerar-certificado.js" para habilitar HTTPS no celular.');
}
