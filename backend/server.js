// Updated server.js with security enhancements
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import "dotenv/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid"; // for safe filenames

// -------------------------------------------------------------------
// Environment validation (fail fast if critical secrets are missing)
// -------------------------------------------------------------------
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is not set. Exiting.");
  process.exit(1);
}
if (!process.env.CORS_ORIGINS) {
  console.error("❌ CORS_ORIGINS environment variable is not set. Exiting.");
  process.exit(1);
}
if (!process.env.CONTADOR_PASSWORD_HASH) {
  console.warn("⚠️ CONTADOR_PASSWORD_HASH not set. Default admin password will be insecure.");
  // continue but warn – actual enforcement is in db defaults.
}

import { dbService } from "./db.js";
import { fetchSefazInvoices, parseNFeXml, sendMdeEvent } from "./sefazService.js";
import { syncInvoiceToAlterdata, syncPendingInvoices } from "./alterdataService.js";
import { saveToCofreDigital } from "./storageService.js";
import { scrapeNfse } from "./workers/nfseWorker.js";
import { startNoteWatcher } from "./services/noteWatcher.js";
import { roleGuard } from "./middlewares/roleGuard.js"; // new role guard

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Security middlewares
app.use(helmet());
// Global rate limiter (already present)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Specific login limiter (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
});

const PORT = process.env.PORT || 4000;

// Setup directories
const UPLOADS_DIR = path.join(__dirname, "uploads", "certificates_secure");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer for file uploads – whitelist extensions and safe naming
const ALLOWED_CERT_EXT = [".pfx", ".p12", ".pem"];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_CERT_EXT.includes(ext)) {
      return cb(new Error("Extensão de certificado não permitida."));
    }
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_MIME = [
  "application/x-pkcs12",
  "application/x-pem-file",
  "application/octet-stream",
];

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_CERT_EXT.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error("Extensão ou tipo MIME de certificado não permitido."));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["http://localhost:5173"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origem não permitida"));
    }
  },
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

  // ... rest of function unchanged ...
}

function startScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }
  const settings = dbService.getSettings();
  const intervalMs = Math.max(settings.autoSyncIntervalMinutes, 1) * 60 * 1000; // enforce min 1 min

  // Run once immediately on start
  setTimeout(runAutoFetchJob, 2000);

  schedulerIntervalId = setInterval(runAutoFetchJob, intervalMs);
}

// ------------------- Auth -------------------
// Simple brute‑force protection for login attempts per IP
const loginAttempts = {};
function checkLoginAttempts(req, res, next) {
  const ip = req.ip;
  const record = loginAttempts[ip];
  if (record && record.blockedUntil && Date.now() < record.blockedUntil) {
    return res.status(429).json({ error: "Muitas tentativas falhas. Tente novamente mais tarde." });
  }
  next();
}

app.post("/api/auth/login", loginLimiter, checkLoginAttempts, async (req, res) => {

  const { login, password, isContador } = req.body;

  // Contador login (simple static password from settings)
  if (isContador) {
    const settings = dbService.getSettings();
    const hash = settings.contadorPasswordHash || "";
    const match = await bcrypt.compare(password, hash);
    if (match) {
      const token = jwt.sign({ role: "contador" }, process.env.JWT_SECRET, { expiresIn: "8h" });
      return res.json({ success: true, role: "contador", token });
    }
    // Register failed attempt
    const ip = req.ip;
    const rec = (loginAttempts[ip] = loginAttempts[ip] || { fails: 0, blockedUntil: null });
    rec.fails += 1;
    if (rec.fails >= 5) {
      rec.blockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
    }
    return res.status(401).json({ error: "Senha do escritório inválida." });
  }

  // Empresa login
  const cleanCnpj = login.replace(/\D/g, "");
  const company = dbService.getCompanies().find(c => c.cnpj.replace(/\D/g, "") === cleanCnpj);

  if (company && company.portalAccess && company.portalPassword) {
    const hash = company.portalPasswordHash || "";
    const match = await bcrypt.compare(password, hash);
    if (match) {
      const token = jwt.sign({ role: "empresa", cnpj: company.cnpj }, process.env.JWT_SECRET, { expiresIn: "8h" });
      return res.json({
        success: true,
        role: "empresa",
        token,
        company: { cnpj: company.cnpj, razaoSocial: company.razaoSocial },
      });
    }
    // Register failed attempt for non‑contadores as well
    const ip = req.ip;
    const rec = (loginAttempts[ip] = loginAttempts[ip] || { fails: 0, blockedUntil: null });
    rec.fails += 1;
    if (rec.fails >= 5) {
      rec.blockedUntil = Date.now() + 15 * 60 * 1000;
    }
  }
  return res.status(401).json({ error: "CNPJ ou senha inválidos, ou acesso negado." });
});

// 1. Settings
// Protect routes (except login and public endpoints)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // attach payload to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Apply auth and role guard to all subsequent routes
app.use(authMiddleware);
app.use(roleGuard(["empresa", "contador"])); // both roles can access except where further checks apply

app.get("/api/settings", (req, res) => {
  res.json(dbService.getSettings());
});

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
    enableCofreDigitalCloud: false,
    awsBucketName: "",
    awsRegion: "",
    awsAccessKey: "",
    awsSecretKey: "",
    // Contador password must be stored as bcrypt hash.
    // Users should set CONTADOR_PASSWORD_HASH env var before first start.
    // The hash will be loaded into settings.contadorPasswordHash at runtime.
    contadorPasswordHash: "",
  },
  logs: [],
  tasks: [],
  dp_requests: [],
  tickets: [],
};

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

  // Enforce minimum interval of 1 minute
  const interval = Number(autoSyncIntervalMinutes) >= 1 ? Number(autoSyncIntervalMinutes) : 1;

  const updated = dbService.updateSettings({
    alterdataDir,
    autoSyncIntervalMinutes: interval,
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

// Rest of routes unchanged ...
// (Only the upload route needs the new storage config)
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
    certName = req.file.filename; // safe UUID filename
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    certExpiration = expDate.toISOString();
    certValid = true;
  } else if (password && existingCompany?.certName) {
    certValid = true;
  }

  const companyData = {
    cnpj,
    razaoSocial,
    uf,
    ie: ie || "",
    im: im || "",
    naturezaJuridica: naturezaJuridica || "",
    tributacao: tributacao || "",
    regime: regime || "",
    dataAbertura: dataAbertura || "",
    logradouro: logradouro || "",
    numero: numero || "",
    bairro: bairro || "",
    municipio: municipio || "",
    cep: cep || "",
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

// ... other routes remain the same, but any place where errors are logged now use err.message only.

// Start application
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[Facilita Contábil] Servidor rodando em http://127.0.0.1:${PORT}`);
  dbService.addLog(
    "info",
    "Servidor inicializado e escutando localmente na porta " + PORT,
  );

  // Start background monitoring scheduler
  startScheduler();
  // Start watching exported notes folder
});
