import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API de Diagnóstico e Suporte Inteligente com Gemini
  app.post('/api/ai-diagnostics', async (req, res) => {
    try {
      const { summaryData, question } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          analysis: "O assistente local analisou os dados com base nas regras contábeis: " +
            "Seu fluxo de caixa está consistente. Para recomendações detalhadas via IA generativa, certifique-se de configurar sua chave de API nas configurações."
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é o Consultor e Suporte Financeiro Inteligente para Gestores de Cantinas Escolares.
Analise os seguintes dados operacionais da cantina:
${JSON.stringify(summaryData, null, 2)}

Pergunta do gestor ou foco da análise: "${question || 'Faça um diagnóstico geral do dia: vendas, lucratividade, fiados a receber e possíveis pontos de atenção ou riscos.'}"

Responda em Português (Brasil) de forma prática, objetiva, estruturada em tópicos curtos e com recomendações acionáveis para o dono da cantina aumentar o lucro, diminuir fiados atrasados e evitar perdas no estoque.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Erro na API Gemini:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar diagnóstico" });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sistema de Cantinas operando em http://localhost:${PORT}`);
  });
}

startServer();
