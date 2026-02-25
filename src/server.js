const express = require("express");
const cors = require("cors");
const axios = require("axios");

// força carregar .env da raiz do projeto
require("dotenv").config({ path: "./.env" });
console.log("DEBUG VERIFY_TOKEN:", process.env.VERIFY_TOKEN);

const app = express();

app.use(express.json());
app.use(cors());

// LOGS INICIAIS PARA CONFERIR .env
console.log("VERIFY_TOKEN carregado:", process.env.VERIFY_TOKEN);
console.log("WHATSAPP_PHONE_NUMBER_ID:", process.env.WHATSAPP_PHONE_NUMBER_ID ? "OK" : "NÃO DEFINIDO");
console.log("WHATSAPP_TOKEN:", process.env.WHATSAPP_TOKEN ? "OK" : "NÃO DEFINIDO");

// ---------------- FUNÇÃO PARA ENVIAR MENSAGEM WHATSAPP ----------------
async function enviarMensagemWhatsApp(to, texto) {
  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Em ambiente de teste (sandbox), força envio para o número permitido na API
  const destinatario =
    process.env.WHATSAPP_TEST_RECIPIENT && process.env.WHATSAPP_TEST_RECIPIENT.trim() !== ""
      ? process.env.WHATSAPP_TEST_RECIPIENT.trim()
      : to;

  console.log("Enviando mensagem para:", destinatario);

  try {
    const resposta = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: destinatario,
        text: { body: texto }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Mensagem enviada:", resposta.data);
    return resposta.data;
  } catch (erro) {
    console.error("Erro ao enviar mensagem:", erro.response?.data || erro);
    return null;
  }
}
// ---------------- CATÁLOGO E PEDIDOS EM MEMÓRIA ----------------
const produtos = [
  { id: 1, nome: "Heineken 350ml", preco: 7.5, categoria: "cerveja" },
  { id: 2, nome: "Spaten 350ml", preco: 6.9, categoria: "cerveja" },
  { id: 3, nome: "Budweiser 350ml", preco: 6.5, categoria: "cerveja" },
  { id: 4, nome: "Coca-Cola 2L", preco: 9.0, categoria: "refrigerante" },
  { id: 5, nome: "Guaraná 2L", preco: 8.0, categoria: "refrigerante" },
  { id: 6, nome: "Energético Red Bull 250ml", preco: 11.0, categoria: "energetico" },
  { id: 7, nome: "Pacote de gelo 5kg", preco: 12.0, categoria: "gelo" },
];

const pedidos = [];

// ---------------- LÓGICA DE RESPOSTA DO BOT (MENU) ----------------
async function tratarMensagemWhatsApp(from, texto = "") {
  const msg = texto.trim().toLowerCase();

  if (
    msg === "oi" ||
    msg === "olá" ||
    msg === "ola" ||
    msg === "menu" ||
    msg === "bom dia" ||
    msg === "boa tarde" ||
    msg === "boa noite"
  ) {
    const menu =
      "🍻 *Geladão Delivery*\n" +
      "Escolha uma opção:\n\n" +
      "1️⃣ Ver cardápio\n" +
      "2️⃣ Fazer pedido rápido\n" +
      "3️⃣ Falar com atendente";

    await enviarMensagemWhatsApp(from, menu);
    return;
  }

  if (msg === "1") {
    const cervejas = produtos.filter((p) => p.categoria === "cerveja");
    const refrigerantes = produtos.filter((p) => p.categoria === "refrigerante");
    const energeticos = produtos.filter((p) => p.categoria === "energetico");
    const gelo = produtos.filter((p) => p.categoria === "gelo");

    let textoCardapio = "📋 *Cardápio Geladão*\n\n";

    if (cervejas.length) {
      textoCardapio += "🍺 *Cervejas*\n";
      cervejas.forEach((p) => {
        textoCardapio += `• (${p.id}) ${p.nome} - R$ ${p.preco.toFixed(2)}\n`;
      });
      textoCardapio += "\n";
    }

    if (refrigerantes.length) {
      textoCardapio += "🥤 *Refrigerantes*\n";
      refrigerantes.forEach((p) => {
        textoCardapio += `• (${p.id}) ${p.nome} - R$ ${p.preco.toFixed(2)}\n`;
      });
      textoCardapio += "\n";
    }

    if (energeticos.length) {
      textoCardapio += "⚡ *Energéticos*\n";
      energeticos.forEach((p) => {
        textoCardapio += `• (${p.id}) ${p.nome} - R$ ${p.preco.toFixed(2)}\n`;
      });
      textoCardapio += "\n";
    }

    if (gelo.length) {
      textoCardapio += "❄️ *Gelo*\n";
      gelo.forEach((p) => {
        textoCardapio += `• (${p.id}) ${p.nome} - R$ ${p.preco.toFixed(2)}\n`;
      });
      textoCardapio += "\n";
    }

    textoCardapio +=
      "Para fazer o pedido, envie assim:\n" +
      "_Quero 6x (1) Heineken 350ml e 1x (7) Pacote de gelo 5kg_";

    await enviarMensagemWhatsApp(from, textoCardapio);
    return;
  }

  if (msg === "2") {
    const textoPedido =
      "🛒 *Pedido rápido*\n\n" +
      "Me envie as informações neste formato:\n\n" +
      "• Nome:\n" +
      "• Endereço (rua, número, bairro):\n" +
      "• Forma de pagamento (PIX, cartão, dinheiro):\n" +
      "• Itens desejados (ex: 6x Heineken 350ml, 1x gelo 5kg)\n\n" +
      "Depois eu vou te mandar o resumo do pedido. 😉";

    await enviarMensagemWhatsApp(from, textoPedido);
    return;
  }

  if (msg === "3") {
    const textoAtendente =
      "👨‍💼 Vou te passar para o atendente humano.\n" +
      "Aguarde um instante, por favor.";

    await enviarMensagemWhatsApp(from, textoAtendente);
    return;
  }

  // Qualquer outra mensagem → reenvia o menu
  await enviarMensagemWhatsApp(
    from,
    "Não entendi sua mensagem. Digite *menu* para ver as opções. 🍻"
  );
}

// ---------------- ROTAS HTTP (API) ----------------

// rota raiz só para teste rápido
app.get("/", (req, res) => {
  res.send("Geladão API rodando. Use /status para ver o status.");
});

// status
app.get("/status", (req, res) => {
  return res.json({
    ok: true,
    message: "API do Geladão funcionando ✅",
  });
});

// listar produtos
app.get("/produtos", (req, res) => {
  return res.json(produtos);
});

// criar pedido
app.post("/pedidos", (req, res) => {
  const { nomeCliente, endereco, formaPagamento, itens } = req.body;

  if (!nomeCliente || !endereco || !formaPagamento || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "Dados do pedido incompletos. Envie nomeCliente, endereco, formaPagamento e itens.",
    });
  }

  let total = 0;
  const itensDetalhados = itens.map((item) => {
    const produto = produtos.find((p) => p.id === item.idProduto);
    if (!produto) return null;

    const quantidade = item.quantidade || 1;
    const subtotal = produto.preco * quantidade;
    total += subtotal;

    return {
      idProduto: produto.id,
      nome: produto.nome,
      quantidade,
      precoUnitario: produto.preco,
      subtotal,
    };
  });

  if (itensDetalhados.includes(null)) {
    return res.status(400).json({
      ok: false,
      message: "Um ou mais produtos do pedido não existem no catálogo.",
    });
  }

  const novoPedido = {
    id: pedidos.length + 1,
    nomeCliente,
    endereco,
    formaPagamento,
    itens: itensDetalhados,
    total,
    status: "aguardando",
  };

  pedidos.push(novoPedido);

  return res.status(201).json({
    ok: true,
    message: "Pedido criado com sucesso ✅",
    pedido: novoPedido,
  });
});

// listar pedidos
app.get("/pedidos", (req, res) => {
  return res.json(pedidos);
});

// ---------------- ROTAS DO WEBHOOK DO WHATSAPP ----------------

// GET /webhook → verificação do Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // LOG para debug
  console.log("GET /webhook chamado com:", {
    mode,
    tokenRecebido: token,
    verifyTokenEnv: process.env.VERIFY_TOKEN,
  });

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!");
    return res.status(200).send(challenge);
  }

  console.log("Falha na verificação do webhook");
  return res.sendStatus(403);
});

// POST /webhook → recebe mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  console.log("📩 Webhook POST recebido:", JSON.stringify(req.body, null, 2));

  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (message && message.type === "text") {
    const from = message.from; // número do cliente
    const text = message.text?.body || "";

    console.log(`Mensagem recebida de ${from}: ${text}`);

    // chama a lógica de resposta
    await tratarMensagemWhatsApp(from, text);
  }

  // o WhatsApp exige resposta rápida 200
  return res.sendStatus(200);
});

// ---------------- INICIAR SERVIDOR ----------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});