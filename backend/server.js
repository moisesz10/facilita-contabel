import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";

import { dbService } from "./db.js";
import { fetchSefazInvoices, parseNFeXml, sendMdeEvent } from "./sefazService.js";
import {
  syncInvoiceToAlterdata,
  syncPendingInvoices,
} from "./alterdataService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Setup directories
const UPLOADS_DIR = path.join(__dirname, "uploads", "certificates");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Save as: CNPJ_certificateName.ext
    const cnpj = req.body.cnpj ? req.body.cnpj.replace(/\D/g, "") : "unknown";
    const ext = path.extname(file.originalname);
    cb(null, `${cnpj}_cert${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware
const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Background Scheduler instance
let schedulerIntervalId = null;

async function runAutoFetchJob() {
  const settings = dbService.getSettings();
  const companies = dbService.getCompanies().filter((c) => c.activeSync);

  if (companies.length === 0) {
    dbService.addLog(
      "info",
      "Varredura automática: Nenhuma empresa ativa com consulta habilitada.",
    );
    return;
  }

  dbService.addLog(
    "info",
    `Iniciando varredura automática para ${companies.length} empresas...`,
  );

  for (const company of companies) {
    try {
      const fetchedInvoices = await fetchSefazInvoices(company, 3);
      if (fetchedInvoices.length > 0) {
        let newCount = 0;
        for (const inv of fetchedInvoices) {
          const existing = dbService.getInvoiceByChave(inv.chave);
          if (!existing) {
            const added = dbService.addInvoice(inv);
            newCount++;
            // Auto sync to Alterdata immediately
            await syncInvoiceToAlterdata(added);
          }
        }
        if (newCount > 0) {
          dbService.addLog(
            "success",
            `Busca automática: ${newCount} novas notas encontradas e exportadas para ${company.razaoSocial}.`,
            company.cnpj,
          );
        }
      }

      // Auto-Retry para notas com erro dessa empresa
      const errorInvoices = dbService.getInvoices({ companyCnpj: company.cnpj, status: "error" });
      if (errorInvoices.length > 0) {
        dbService.addLog("info", `Auto-Retry: Tentando reenviar ${errorInvoices.length} notas com falha de ${company.razaoSocial}...`, company.cnpj);
        let retryCount = 0;
        for (const errInv of errorInvoices) {
          const success = await syncInvoiceToAlterdata(errInv);
          if (success) retryCount++;
        }
        if (retryCount > 0) {
          dbService.addLog("success", `Auto-Retry concluído: ${retryCount} notas de ${company.razaoSocial} exportadas com sucesso nesta tentativa.`, company.cnpj);
        }
      }

    } catch (err) {
      console.error(
        `Erro na busca automática para a empresa ${company.cnpj}:`,
        err,
      );
      dbService.addLog(
        "error",
        `Falha na busca automática: ${err.message}`,
        company.cnpj,
      );
    }
  }

  dbService.updateSettings({ lastAutoSync: new Date().toISOString() });
}

function startScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }
  const settings = dbService.getSettings();
  const intervalMs = settings.autoSyncIntervalMinutes * 60 * 1000;

  // Run once immediately on start
  setTimeout(runAutoFetchJob, 2000);

  schedulerIntervalId = setInterval(runAutoFetchJob, intervalMs);
}

// REST ENDPOINTS

// 1. Settings
app.get("/api/settings", (req, res) => {
  res.json(dbService.getSettings());
});

app.post("/api/settings", (req, res) => {
  const {
    alterdataDir,
    autoSyncIntervalMinutes,
    isSefazSimulation,
    enableFolderSync,
    enableCloudSync,
    nfStockEmail,
    nfStockToken,
  } = req.body;

  const updated = dbService.updateSettings({
    alterdataDir,
    autoSyncIntervalMinutes: Number(autoSyncIntervalMinutes),
    isSefazSimulation: !!isSefazSimulation,
    enableFolderSync: enableFolderSync ?? true,
    enableCloudSync: !!enableCloudSync,
    nfStockEmail: nfStockEmail || "",
    nfStockToken: nfStockToken || "",
  });

  // Restart scheduler with new interval
  startScheduler();
  dbService.addLog("info", "Configurações de sincronização atualizadas.");
  res.json(updated);
});

// Test Alterdata NF-Stock Cloud connection
app.post("/api/settings/test-cloud", async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({
      error: "E-mail e Token de Integração são obrigatórios para o teste.",
    });
  }

  const isEmailValid = email.includes("@") && email.includes(".");
  if (!isEmailValid) {
    let errorMsg = "E-mail cadastrado inválido.";
    dbService.addLog("error", `Teste de Conexão Cloud falhou: ${errorMsg}`);
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const endpoint = "https://ms-importacao-service-nfstock.alterdatasoftware.com.br/storage";
    // We send an empty POST just to check authentication, usually returns 400 Bad Request instead of 401 Unauthorized if valid
    const response = await axios.post(endpoint, {}, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Integration-Token": token,
        "X-User-Email": email
      },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 401 && response.status !== 403) {
      dbService.addLog(
        "success",
        `Teste de Conexão Cloud: Conectado com sucesso ao portal Alterdata NF-Stock para o e-mail ${email}.`,
      );
      return res.json({
        success: true,
        message: "Conectado com sucesso com a Nuvem Alterdata NF-Stock!",
      });
    } else {
      let errorMsg = "Chave de integração ou Token NF-Stock inválido.";
      dbService.addLog("error", `Teste de Conexão Cloud falhou: ${errorMsg}`);
      return res.status(401).json({ error: errorMsg });
    }
  } catch (err) {
    let errorMsg = "Erro de rede ao conectar à Nuvem Alterdata.";
    dbService.addLog("error", `Teste de Conexão Cloud falhou: ${errorMsg}`);
    return res.status(500).json({ error: errorMsg });
  }
});

// 2. Companies
app.get("/api/companies", (req, res) => {
  res.json(dbService.getCompanies());
});

app.post("/api/companies", upload.single("certificate"), (req, res) => {
  const {
    cnpj,
    razaoSocial,
    uf,
    password,
    activeSync,
    ie,
    im,
    naturezaJuridica,
    tributacao,
    regime,
    dataAbertura,
    logradouro,
    numero,
    bairro,
    municipio,
    cep,
  } = req.body;
  if (!cnpj || !razaoSocial) {
    return res
      .status(400)
      .json({ error: "CNPJ e Razão Social são obrigatórios." });
  }

  const existingCompany = dbService.getCompanyByCnpj(cnpj);

  let certName = existingCompany?.certName || "";
  let certExpiration = existingCompany?.certExpiration || null;
  let certValid = existingCompany?.certValid ?? false;

  if (req.file) {
    certName = req.file.originalname;
    // For simulation, we create a certificate expiring 1 year from now.
    // In production, we'd read req.file.path with node-forge or similar using the password
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    certExpiration = expDate.toISOString();
    certValid = true;
  } else if (password && existingCompany?.certName) {
    // Password re-entered for existing certificate
    certValid = true;
  }

  const companyData = {
    cnpj,
    razaoSocial,
    uf,
    ie: ie || '',
    im: im || '',
    naturezaJuridica: naturezaJuridica || '',
    tributacao: tributacao || '',
    regime: regime || '',
    dataAbertura: dataAbertura || '',
    logradouro: logradouro || '',
    numero: numero || '',
    bairro: bairro || '',
    municipio: municipio || '',
    cep: cep || '',
    certName,
    certExpiration,
    certValid,
    activeSync: activeSync === "true" || activeSync === true,
  };

  const saved = dbService.addCompany(companyData);
  dbService.addLog(
    "info",
    `Empresa ${razaoSocial} salva com sucesso. Certificado digital: ${certName ? "Carregado" : "Não cadastrado"}.`,
    cnpj,
  );

  res.json(saved);
});

app.delete("/api/companies/:cnpj", (req, res) => {
  const { cnpj } = req.params;
  const company = dbService.getCompanyByCnpj(cnpj);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada." });
  }

  // Delete certificate file if exists
  const cleanCnpj = cnpj.replace(/\D/g, "");
  const certPathPng = path.join(UPLOADS_DIR, `${cleanCnpj}_cert.pfx`);
  const certPathP12 = path.join(UPLOADS_DIR, `${cleanCnpj}_cert.p12`);
  if (fs.existsSync(certPathPng)) fs.unlinkSync(certPathPng);
  if (fs.existsSync(certPathP12)) fs.unlinkSync(certPathP12);

  dbService.deleteCompany(cnpj);
  dbService.addLog(
    "info",
    `Empresa ${company.razaoSocial} e todos os seus dados foram removidos.`,
  );
  res.json({ success: true });
});

// 3. Invoices
app.get("/api/invoices", (req, res) => {
  const { companyCnpj, type, status, startDate, endDate, search } = req.query;
  const invoices = dbService.getInvoices({
    companyCnpj,
    type,
    status,
    startDate,
    endDate,
    search,
  });
  res.json(invoices);
});

// Dashboard Analytics
app.get("/api/dashboard", (req, res) => {
  const { companyCnpj } = req.query;
  const invoices = dbService.getInvoices(companyCnpj ? { companyCnpj } : {});
  
  const totalEntrada = invoices.filter(i => i.type === 'entrada').reduce((sum, i) => sum + i.value, 0);
  const totalSaida = invoices.filter(i => i.type === 'saida').reduce((sum, i) => sum + i.value, 0);
  const notasSincronizadas = invoices.filter(i => i.syncStatus === 'synced').length;
  const notasComErro = invoices.filter(i => i.syncStatus === 'error').length;
  const notasPendentes = invoices.filter(i => i.syncStatus === 'pending').length;

  const parceiros = {};
  invoices.forEach(i => {
    const pName = i.type === 'entrada' ? i.issuerName : i.recipientName;
    const nomeLimpo = pName || "Desconhecido";
    if (!parceiros[nomeLimpo]) parceiros[nomeLimpo] = 0;
    parceiros[nomeLimpo] += i.value;
  });

  const topParceiros = Object.entries(parceiros)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  res.json({
    totalEntrada,
    totalSaida,
    notasSincronizadas,
    notasComErro,
    notasPendentes,
    totalInvoices: invoices.length,
    topParceiros
  });
});

app.post("/api/invoices/sync", async (req, res) => {
  const { chave, companyCnpj } = req.body;

  if (chave) {
    const invoice = dbService.getInvoiceByChave(chave);
    if (!invoice) {
      return res.status(404).json({ error: "Nota fiscal não encontrada." });
    }
    const success = await syncInvoiceToAlterdata(invoice);
    return res.json({ success, status: success ? "synced" : "error" });
  }

  // Sync all pending for a company or all
  const syncedCount = await syncPendingInvoices(companyCnpj);
  res.json({ success: true, syncedCount });
});

// MD-e (Manifestação do Destinatário)
app.post("/api/invoices/:chave/mde", async (req, res) => {
  const { chave } = req.params;
  const { tipoEvento } = req.body; // e.g. "210210" for Ciencia da Operacao

  const invoice = dbService.getInvoiceByChave(chave);
  if (!invoice) {
    return res.status(404).json({ error: "Nota fiscal não encontrada." });
  }

  const company = dbService.getCompanyByCnpj(invoice.companyCnpj);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada." });
  }

  try {
    const response = await sendMdeEvent(chave, company.cnpj, tipoEvento);
    
    // Log success
    dbService.addLog(
      "success",
      `[MD-e] Evento de Manifestação (${tipoEvento}) registrado com sucesso para a NF-e ${chave.slice(-6)}. Protocolo: ${response.protocolo}`,
      company.cnpj
    );

    res.json({ success: true, protocolo: response.protocolo });
  } catch (err) {
    dbService.addLog(
      "error",
      `[MD-e] Erro ao manifestar NF-e ${chave.slice(-6)}: ${err.message}`,
      company.cnpj
    );
    res.status(500).json({ error: err.message });
  }
});

// Manual import of XML files
app.post("/api/invoices/upload", upload.array("xmlFiles"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Nenhum arquivo XML enviado." });
  }

  const companies = dbService.getCompanies();
  if (companies.length === 0) {
    return res.status(400).json({
      error: "Cadastre pelo menos uma empresa antes de importar XMLs.",
    });
  }

  const results = {
    total: req.files.length,
    imported: 0,
    ignored: 0,
    errors: [],
  };

  for (const file of req.files) {
    try {
      const xmlText = fs.readFileSync(file.path, "utf8");

      // Parse metadata from XML
      const metadata = parseNFeXml(xmlText);

      // Determine which registered company this XML belongs to
      // CNPJ in XML could be Issuer (Saída) or Recipient (Entrada)
      const cleanIssuer = metadata.issuerCnpj.replace(/\D/g, "");
      const cleanRecipient = metadata.recipientCnpj.replace(/\D/g, "");

      // Check match with our registered companies
      const matchingCompany = companies.find((c) => {
        const cleanC = c.cnpj.replace(/\D/g, "");
        return cleanC === cleanIssuer || cleanC === cleanRecipient;
      });

      if (!matchingCompany) {
        results.ignored++;
        results.errors.push(
          `Arquivo ${file.originalname} ignorado: CNPJ do emitente (${metadata.issuerCnpj}) ou destinatário (${metadata.recipientCnpj}) não corresponde a nenhuma empresa cadastrada.`,
        );
        fs.unlinkSync(file.path); // delete temp file
        continue;
      }

      // Determine invoice type for this company
      const companyCleanCnpj = matchingCompany.cnpj.replace(/\D/g, "");
      const type = companyCleanCnpj === cleanIssuer ? "saida" : "entrada";

      const invoiceData = {
        chave: metadata.chave,
        companyCnpj: matchingCompany.cnpj,
        date: metadata.date,
        type,
        value: metadata.value,
        issuerName: metadata.issuerName,
        issuerCnpj: metadata.issuerCnpj,
        recipientName: metadata.recipientName,
        recipientCnpj: metadata.recipientCnpj,
        xmlContent: xmlText,
        syncStatus: "pending",
      };

      // Save to database
      const added = dbService.addInvoice(invoiceData);
      results.imported++;

      // Auto sync to Alterdata
      await syncInvoiceToAlterdata(added);

      // Clean up uploaded temp file
      fs.unlinkSync(file.path);
    } catch (err) {
      results.ignored++;
      results.errors.push(
        `Erro no arquivo ${file.originalname}: ${err.message}`,
      );
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  dbService.addLog(
    "info",
    `Importação manual: ${results.imported} de ${results.total} XMLs importados com sucesso. (Ignorados: ${results.ignored})`,
  );
  res.json(results);
});

// Trigger manual SEFAZ fetch
app.post("/api/sefaz/fetch/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  const company = dbService.getCompanyByCnpj(cnpj);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada." });
  }

  const settings = dbService.getSettings();
  if (!company.certValid && !settings.isSefazSimulation) {
    return res
      .status(400)
      .json({ error: "Certificado digital ausente ou inválido." });
  }

  try {
    dbService.addLog(
      "info",
      `Iniciando consulta manual na SEFAZ para ${company.razaoSocial}...`,
      cnpj,
    );
    const fetchedInvoices = await fetchSefazInvoices(company, 5);

    if (fetchedInvoices.length === 0) {
      dbService.addLog(
        "info",
        `Nenhum novo documento encontrado na SEFAZ para ${company.razaoSocial}.`,
        cnpj,
      );
      return res.json({ success: true, count: 0 });
    }

    let newCount = 0;
    for (const inv of fetchedInvoices) {
      const existing = dbService.getInvoiceByChave(inv.chave);
      if (!existing) {
        const added = dbService.addInvoice(inv);
        newCount++;
        await syncInvoiceToAlterdata(added);
      }
    }

    dbService.addLog(
      "success",
      `Busca manual concluída. ${newCount} novas notas obtidas da SEFAZ para ${company.razaoSocial}.`,
      cnpj,
    );
    res.json({ success: true, count: newCount });
  } catch (error) {
    console.error("Erro ao buscar notas na SEFAZ:", error);
    dbService.addLog(
      "error",
      `Falha ao buscar notas na SEFAZ: ${error.message}`,
      cnpj,
    );
    res.status(500).json({ error: error.message });
  }
});

// 4. Logs
app.get("/api/logs", (req, res) => {
  res.json(dbService.getLogs());
});

app.post("/api/logs/clear", (req, res) => {
  dbService.clearLogs();
  res.json({ success: true });
});

// 5. Tasks (eTarefas)
app.get("/api/tasks", (req, res) => {
  const { companyCnpj } = req.query;
  const tasks = dbService.getTasks(companyCnpj);
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { companyCnpj, title, dueDate } = req.body;
  if (!title) {
    return res
      .status(400)
      .json({ error: "Título da obrigação é obrigatório." });
  }
  const task = dbService.addTask({ companyCnpj, title, dueDate });
  res.json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { status, title, dueDate } = req.body;
  const updated = dbService.updateTask(id, { status, title, dueDate });
  if (!updated) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }
  res.json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const success = dbService.deleteTask(id);
  res.json({ success });
});

// Start application
app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[Facilita Contábil] Servidor rodando em http://127.0.0.1:${PORT}`,
  );
  dbService.addLog(
    "info",
    "Servidor inicializado e escutando localmente na porta " + PORT,
  );

  // Start background monitoring scheduler
  startScheduler();
});
