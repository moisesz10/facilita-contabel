import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "database.json");

// Default initial database state
const DEFAULT_DB = {
  companies: [],
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
  },
  logs: [],
  tasks: [],
};

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
    return parsed;
  } catch (error) {
    console.error("Erro ao ler banco de dados JSON:", error);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar banco de dados JSON:", error);
  }
}

// Memory cache of DB
let db = loadDb();

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
        certName: company.certName || "",
        certExpiration: company.certExpiration || null,
        certValid: company.certValid ?? false,
        activeSync: company.activeSync ?? true,
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
    list = list.map((i) => {
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
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getInvoiceByChave: (chave) => {
    const i = db.invoices.find((inv) => inv.chave === chave);
    if (!i) return null;
    return {
      ...i,
      localSyncStatus:
        i.localSyncStatus !== undefined
          ? i.localSyncStatus
          : i.syncStatus === "synced"
            ? "synced"
            : i.syncStatus === "error"
              ? "error"
              : "pending",
      cloudSyncStatus:
        i.cloudSyncStatus !== undefined ? i.cloudSyncStatus : "disabled",
    };
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
  addLog: (type, message, companyCnpj = null) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type, // 'info', 'warning', 'error', 'success'
      message,
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
};
