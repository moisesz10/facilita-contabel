import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "database.json");

// Default initial database state
const DEFAULT_DB = {
  companies: [],
  // Store contador password as bcrypt hash; empty by default (must be set via env)
  // Users should set CONTADOR_PASSWORD_HASH env var before first start.
  // The admin can later update via settings endpoint.

  invoices: [],
  settings: {
    alterdataDir: "",
    autoSyncIntervalMinutes: 15,
    isSefazSimulation: true,
    lastAutoSync: null,
    enableFolderSync: true,
    enableCloudSync: false,
    nfStockEmail: "",
    nfStockToken: "",
    enableCofreDigitalCloud: false,
    awsBucketName: "",
    awsRegion: "",
    awsAccessKey: "",
    awsSecretKey: "",
    // Contador password must be stored as bcrypt hash.
    // Set via CONTADOR_PASSWORD_HASH env var before start.
    contadorPasswordHash: "",

  },
  logs: [],
  tasks: [],
  dp_requests: [],
  tickets: [],
};

const ALGORITHM = "aes-256-cbc";
// ENCRYPTION_KEY must be provided via env variable; abort if missing
if (!process.env.ENCRYPTION_KEY) {
  console.error("❌ ENCRYPTION_KEY environment variable is not set. Exiting.");
  process.exit(1);
}
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY,
  "salt-key-salgada",
  32,
);

function encrypt(text) {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
// Helper to remove potentially sensitive data from log messages
function sanitizeLog(msg) {
  if (!msg) return msg;
  // Remove CNPJ patterns (14 digits) and JWT-like strings (three base64 parts)
  return msg
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2}\b/g, "[CNPJ]")
    .replace(/([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+/g, "[TOKEN]");
}

  if (!text) return "";
  if (!text.includes(":")) return text;
  try {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Erro ao descriptografar token:", err);
    return text;
  }
}

// Check and load/create database
function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      saveDb(DEFAULT_DB);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.tasks) parsed.tasks = [];

    // Ensure all default settings are present
    parsed.settings = { ...DEFAULT_DB.settings, ...parsed.settings };

    // Decrypt token on load
    if (parsed.settings) {
      if (parsed.settings.nfStockToken) {
        parsed.settings.nfStockToken = decrypt(parsed.settings.nfStockToken);
      }
      if (parsed.settings.awsSecretKey) {
        parsed.settings.awsSecretKey = decrypt(parsed.settings.awsSecretKey);
      }
    }

    return parsed;
  } catch (error) {
    console.error("Erro ao ler banco de dados JSON:", error);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb(data) {
  try {
    // Clone DB to prevent encrypting in-memory database object
    const clone = JSON.parse(JSON.stringify(data));
    if (clone.settings) {
      if (clone.settings.nfStockToken) {
        clone.settings.nfStockToken = encrypt(clone.settings.nfStockToken);
      }
      if (clone.settings.awsSecretKey) {
        clone.settings.awsSecretKey = encrypt(clone.settings.awsSecretKey);
      }
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(clone, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar banco de dados JSON:", error);
  }
}

// Memory cache of DB
let db = loadDb();

function normalizeInvoice(i) {
  if (!i) return null;
  const hasLocalSync = i.localSyncStatus !== undefined;
  const hasCloudSync = i.cloudSyncStatus !== undefined;
  return {
    ...i,
    localSyncStatus: hasLocalSync
      ? i.localSyncStatus
      : i.syncStatus === "synced"
        ? "synced"
        : i.syncStatus === "error"
          ? "error"
          : "pending",
    cloudSyncStatus: hasCloudSync ? i.cloudSyncStatus : "disabled",
  };
}

export const dbService = {

  // Companies
  getCompanies: () => db.companies,
  getCompanyByCnpj: (cnpj) => db.companies.find((c) => c.cnpj === cnpj),
  addCompany: (company) => {
    // Check if company already exists
    const index = db.companies.findIndex((c) => c.cnpj === company.cnpj);
    if (index !== -1) {
      db.companies[index] = { ...db.companies[index], ...company };
    } else {
      db.companies.push({
        cnpj: company.cnpj,
        razaoSocial: company.razaoSocial,
        uf: company.uf || "SP",
        ie: company.ie || "",
        im: company.im || "",
        naturezaJuridica: company.naturezaJuridica || "",
        tributacao: company.tributacao || "",
        regime: company.regime || "",
        dataAbertura: company.dataAbertura || "",
        logradouro: company.logradouro || "",
        numero: company.numero || "",
        bairro: company.bairro || "",
        municipio: company.municipio || "",
        cep: company.cep || "",
        certName: company.certName || "",
        certExpiration: company.certExpiration || null,
        certValid: company.certValid ?? false,
        activeSync: company.activeSync ?? true,
        portalAccess: company.portalAccess ?? true,
        portalPassword: company.portalPassword || "123456", // Senha inicial padrão
        createdAt: new Date().toISOString(),
      });
    }
    saveDb(db);
    return dbService.getCompanyByCnpj(company.cnpj);
  },
  updateCompany: (cnpj, updates) => {
    const index = db.companies.findIndex((c) => c.cnpj === cnpj);
    if (index !== -1) {
      db.companies[index] = { ...db.companies[index], ...updates };
      saveDb(db);
      return db.companies[index];
    }
    return null;
  },
  deleteCompany: (cnpj) => {
    db.companies = db.companies.filter((c) => c.cnpj !== cnpj);
    // Also clear invoices and logs associated? Maybe keep them or remove them
    db.invoices = db.invoices.filter((i) => i.companyCnpj !== cnpj);
    db.logs = db.logs.filter((l) => l.companyCnpj !== cnpj);
    saveDb(db);
    return true;
  },

  // Invoices (Notas Fiscais)
  getInvoices: (filters = {}) => {
    let list = [...db.invoices];
    if (filters.companyCnpj) {
      list = list.filter((i) => i.companyCnpj === filters.companyCnpj);
    }
    if (filters.type) {
      list = list.filter((i) => i.type === filters.type);
    }
    if (filters.status) {
      list = list.filter((i) => i.syncStatus === filters.status);
    }
    if (filters.startDate) {
      list = list.filter((i) => i.date >= filters.startDate);
    }
    if (filters.endDate) {
      list = list.filter((i) => i.date <= filters.endDate);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.chave.includes(searchLower) ||
          (i.issuerName && i.issuerName.toLowerCase().includes(searchLower)) ||
          (i.recipientName &&
            i.recipientName.toLowerCase().includes(searchLower)) ||
          (i.issuerCnpj && i.issuerCnpj.includes(searchLower)) ||
          (i.recipientCnpj && i.recipientCnpj.includes(searchLower)),
      );
    }

    // Inject localSyncStatus and cloudSyncStatus for backwards compatibility
    list = list.map(normalizeInvoice);

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getInvoiceByChave: (chave) => {
    const i = db.invoices.find((inv) => inv.chave === chave);
    return normalizeInvoice(i);
  },
  addInvoice: (invoice) => {
    const existing = db.invoices.find((i) => i.chave === invoice.chave);
    if (existing) {
      // Just update it if status changed
      Object.assign(existing, invoice);
      saveDb(db);
      return existing;
    }
    const settings = db.settings || {};
    const newInvoice = {
      chave: invoice.chave,
      companyCnpj: invoice.companyCnpj,
      date: invoice.date,
      type: invoice.type, // 'entrada' or 'saida'
      value: Number(invoice.value),
      issuerName: invoice.issuerName,
      issuerCnpj: invoice.issuerCnpj,
      recipientName: invoice.recipientName,
      recipientCnpj: invoice.recipientCnpj,
      xmlContent: invoice.xmlContent,
      syncStatus: invoice.syncStatus || "pending", // 'pending', 'synced', 'error'
      localSyncStatus:
        invoice.localSyncStatus ||
        (settings.enableFolderSync ? "pending" : "disabled"),
      cloudSyncStatus:
        invoice.cloudSyncStatus ||
        (settings.enableCloudSync ? "pending" : "disabled"),
      syncedAt: invoice.syncedAt || null,
      createdAt: new Date().toISOString(),
    };
    db.invoices.push(newInvoice);
    saveDb(db);
    return newInvoice;
  },
  updateInvoiceStatus: (chave, status, details = {}) => {
    const index = db.invoices.findIndex((i) => i.chave === chave);
    if (index !== -1) {
      db.invoices[index].syncStatus = status;
      if (status === "synced") {
        db.invoices[index].syncedAt = new Date().toISOString();
      }
      if (details.error) {
        db.invoices[index].syncError = details.error;
      }
      saveDb(db);
      return db.invoices[index];
    }
    return null;
  },
  updateInvoiceSyncStatuses: (
    chave,
    { localSyncStatus, cloudSyncStatus, syncStatus, error },
  ) => {
    const index = db.invoices.findIndex((i) => i.chave === chave);
    if (index !== -1) {
      if (localSyncStatus) db.invoices[index].localSyncStatus = localSyncStatus;
      if (cloudSyncStatus) db.invoices[index].cloudSyncStatus = cloudSyncStatus;
      if (syncStatus) db.invoices[index].syncStatus = syncStatus;
      if (syncStatus === "synced") {
        db.invoices[index].syncedAt = new Date().toISOString();
      }
      if (error !== undefined) {
        db.invoices[index].syncError = error;
      }
      saveDb(db);
      return db.invoices[index];
    }
    return null;
  },

  // Settings
  getSettings: () => db.settings,
  updateSettings: (updates) => {
    db.settings = { ...db.settings, ...updates };
    saveDb(db);
    return db.settings;
  },

  // Logs
  getLogs: (limit = 100) => {
    return db.logs.slice(-limit).reverse();
  },
  // Helper to remove potentially sensitive data from log messages
  sanitizeLog(msg) {
    if (!msg) return msg;
    // Remove CNPJ patterns (14 digits) and JWT-like strings (three base64 parts)
    return msg
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2}\b/g, "[CNPJ]")
      .replace(/([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+/g, "[TOKEN]");
  },
  addLog: (type, message, companyCnpj = null) => {
    const sanitized = sanitizeLog(message);
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type, // 'info', 'warning', 'error', 'success'
      message: sanitized,
      companyCnpj,
    };
    db.logs.push(newLog);
    // Keep logs size reasonable
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(-500);
    }
    saveDb(db);
    return newLog;
  },
  clearLogs: () => {
    db.logs = [];
    saveDb(db);
    return true;
  },

  // Tasks
  getTasks: (companyCnpj = null) => {
    if (!db.tasks) db.tasks = [];
    if (companyCnpj) {
      return db.tasks.filter((t) => t.companyCnpj === companyCnpj);
    }
    return db.tasks;
  },
  addTask: (task) => {
    if (!db.tasks) db.tasks = [];
    const newTask = {
      id: Math.random().toString(36).substring(2, 9),
      companyCnpj: task.companyCnpj,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status || "pending", // 'pending' or 'completed'
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    saveDb(db);
    return newTask;
  },
  updateTask: (id, updates) => {
    if (!db.tasks) db.tasks = [];
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      db.tasks[index] = { ...db.tasks[index], ...updates };
      saveDb(db);
      return db.tasks[index];
    }
    return null;
  },
  deleteTask: (id) => {
    if (!db.tasks) db.tasks = [];
    db.tasks = db.tasks.filter((t) => t.id !== id);
    saveDb(db);
    return true;
  },

  // DP Requests
  getDpRequests: (companyCnpj = null) => {
    if (!db.dp_requests) db.dp_requests = [];
    if (companyCnpj) {
      return db.dp_requests.filter((r) => r.companyCnpj === companyCnpj);
    }
    return db.dp_requests;
  },
  addDpRequest: (req) => {
    if (!db.dp_requests) db.dp_requests = [];
    const newReq = {
      id: Math.random().toString(36).substring(2, 9),
      companyCnpj: req.companyCnpj,
      type: req.type, // 'admissao', 'ferias', 'rescisao', 'afastamento'
      employeeName: req.employeeName,
      details: req.details,
      status: req.status || "pendente", // 'pendente', 'em_analise', 'concluido'
      createdAt: new Date().toISOString(),
    };
    db.dp_requests.push(newReq);
    saveDb(db);
    return newReq;
  },
  updateDpRequest: (id, updates) => {
    if (!db.dp_requests) db.dp_requests = [];
    const index = db.dp_requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      db.dp_requests[index] = { ...db.dp_requests[index], ...updates };
      saveDb(db);
      return db.dp_requests[index];
    }
    return null;
  },

  // Tickets (Help Desk)
  getTickets: (companyCnpj = null) => {
    if (!db.tickets) db.tickets = [];
    if (companyCnpj) {
      return db.tickets.filter((t) => t.companyCnpj === companyCnpj);
    }
    return db.tickets;
  },
  addTicket: (ticket) => {
    if (!db.tickets) db.tickets = [];
    const newTicket = {
      id: Math.random().toString(36).substring(2, 9),
      companyCnpj: ticket.companyCnpj,
      subject: ticket.subject,
      department: ticket.department, // 'fiscal', 'contabil', 'societario'
      messages: ticket.messages || [], // array of { sender: 'cliente'|'contador', text: string, date: string }
      status: ticket.status || "aberto", // 'aberto', 'respondido', 'fechado'
      createdAt: new Date().toISOString(),
    };
    db.tickets.push(newTicket);
    saveDb(db);
    return newTicket;
  },
  addTicketMessage: (id, message) => {
    if (!db.tickets) db.tickets = [];
    const index = db.tickets.findIndex((t) => t.id === id);
    if (index !== -1) {
      db.tickets[index].messages.push({
        sender: message.sender,
        text: message.text,
        date: new Date().toISOString()
      });
      // se contador responde, muda status
      if (message.sender === 'contador') {
        db.tickets[index].status = 'respondido';
      }
      saveDb(db);
      return db.tickets[index];
    }
    return null;
  },
  updateTicketStatus: (id, status) => {
    if (!db.tickets) db.tickets = [];
    const index = db.tickets.findIndex((t) => t.id === id);
    if (index !== -1) {
      db.tickets[index].status = status;
      saveDb(db);
      return db.tickets[index];
    }
    return null;
  }
};
