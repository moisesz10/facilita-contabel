import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { dbService } from "./db.js";
import { generateDanfeHtml } from "./sefazService.js";

// Synchronize a single invoice to the Alterdata directory or cloud
export async function syncInvoiceToAlterdata(invoice) {
  const settings = dbService.getSettings();
  const enableFolderSync = settings.enableFolderSync ?? true;
  const enableCloudSync = settings.enableCloudSync ?? false;

  if (!enableFolderSync && !enableCloudSync) {
    dbService.updateInvoiceSyncStatuses(invoice.chave, {
      localSyncStatus: "disabled",
      cloudSyncStatus: "disabled",
      syncStatus: "error",
      error:
        "Nenhum método de sincronização (Pasta Local ou Nuvem) está habilitado",
    });
    dbService.addLog(
      "warning",
      `Falha ao sincronizar nota ${invoice.chave.slice(-6)}: Nenhum método de sincronização habilitado nas configurações.`,
      invoice.companyCnpj,
    );
    return false;
  }

  let folderSuccess = true;
  let folderError = null;
  let cloudSuccess = true;
  let cloudError = null;

  // 1. Physical local folder synchronization
  if (enableFolderSync) {
    const alterdataDir = settings.alterdataDir;
    if (!alterdataDir) {
      folderSuccess = false;
      folderError = "Diretório de destino do Alterdata não configurado";
      dbService.addLog(
        "warning",
        `Falha ao exportar nota ${invoice.chave.slice(-6)}: Diretório local não configurado.`,
        invoice.companyCnpj,
      );
    } else {
      try {
        await fs.promises.mkdir(alterdataDir, { recursive: true });

        const cleanCnpj = invoice.companyCnpj.replace(/\D/g, "");
        const dateObj = new Date(invoice.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const folderPeriod = `${year}-${month}`;

        let folderType = invoice.type === "entrada" ? "Entrada" : "Saida";
        if (invoice.chave.startsWith("NFSE")) {
          folderType =
            invoice.type === "entrada"
              ? "Servicos_Tomados"
              : "Servicos_Prestados";
        }

        const targetFolder = path.join(
          alterdataDir,
          cleanCnpj,
          folderPeriod,
          folderType,
        );
        await fs.promises.mkdir(targetFolder, { recursive: true });

        const fileName = `${invoice.chave}-nfe.xml`;
        const filePath = path.join(targetFolder, fileName);
        await fs.promises.writeFile(filePath, invoice.xmlContent, "utf8");

        const htmlContent = generateDanfeHtml(invoice);
        const htmlFileName = `${invoice.chave}-danfe.html`;
        const htmlFilePath = path.join(targetFolder, htmlFileName);
        await fs.promises.writeFile(htmlFilePath, htmlContent, "utf8");

        dbService.addLog(
          "success",
          `[Pasta Local] Nota ${invoice.type.toUpperCase()} nº ${invoice.chave.slice(-6)} exportada com sucesso.`,
          invoice.companyCnpj,
        );
      } catch (err) {
        folderSuccess = false;
        folderError = err.message;
        console.error(
          `Erro ao sincronizar nota ${invoice.chave} para o Alterdata físico:`,
          err,
        );
        dbService.addLog(
          "error",
          `[Pasta Local] Erro na exportação da nota ${invoice.chave.slice(-6)}: ${err.message}`,
          invoice.companyCnpj,
        );
      }
    }
  }

  // 2. Alterdata NF-Stock Cloud direct API integration
  if (enableCloudSync) {
    const token = settings.nfStockToken;
    const email = settings.nfStockEmail;

    if (!token || !email) {
      cloudSuccess = false;
      cloudError = "Credenciais da Nuvem NF-Stock não configuradas";
      dbService.addLog(
        "warning",
        `[Nuvem Alterdata] Falha ao sincronizar nota ${invoice.chave.slice(-6)}: Chave API ou E-mail ausentes.`,
        invoice.companyCnpj,
      );
    } else {
      try {
        dbService.addLog(
          "info",
          `[Nuvem Alterdata] Enviando XML da nota ${invoice.chave.slice(-6)} para a API NF-Stock...`,
          invoice.companyCnpj,
        );

        // Real API request to Alterdata NF-Stock
        const formData = new FormData();
        const xmlBuffer = Buffer.from(invoice.xmlContent, "utf8");
        formData.append("file", xmlBuffer, {
          filename: `${invoice.chave}-nfe.xml`,
          contentType: "application/xml",
        });

        const endpoint = "https://ms-importacao-service-nfstock.alterdatasoftware.com.br/storage";

        const response = await axios.post(endpoint, formData, {
          headers: {
            ...formData.getHeaders(),
            "Authorization": `Bearer ${token}`, // Padrão assumido
            "Integration-Token": token, // Algumas APIs usam Integration-Token
            "X-User-Email": email
          },
          timeout: 15000,
          validateStatus: (status) => status < 500 // Considerar <500 para logar erro direito
        });

        if (response.status >= 200 && response.status < 300) {
          const cleanCnpj = invoice.companyCnpj.replace(/\D/g, "");
          dbService.addLog(
            "success",
            `[Nuvem Alterdata] Nota ${invoice.chave.slice(-6)} integrada diretamente ao Alterdata Fiscal do cliente ${cleanCnpj}.`,
            invoice.companyCnpj,
          );
        } else {
          throw new Error(`API retornou status HTTP ${response.status}: ${JSON.stringify(response.data || 'Sem resposta')}`);
        }
      } catch (err) {
        cloudSuccess = false;
        cloudError = err.response ? `Erro da API: ${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message;
        console.error(
          `Erro na integração em nuvem da nota ${invoice.chave}:`,
          cloudError,
        );
        dbService.addLog(
          "error",
          `[Nuvem Alterdata] Falha ao enviar nota ${invoice.chave.slice(-6)}: ${cloudError}`,
          invoice.companyCnpj,
        );
      }
    }
  }

  // Consolidate status
  const localSyncStatus = enableFolderSync
    ? folderSuccess
      ? "synced"
      : "error"
    : "disabled";
  const cloudSyncStatus = enableCloudSync
    ? cloudSuccess
      ? "synced"
      : "error"
    : "disabled";

  let overallStatus = "pending";
  let overallError = null;

  if (localSyncStatus === "error" || cloudSyncStatus === "error") {
    overallStatus = "error";
    overallError = [folderError, cloudError].filter(Boolean).join(" | ");
  } else if (
    (localSyncStatus === "synced" || localSyncStatus === "disabled") &&
    (cloudSyncStatus === "synced" || cloudSyncStatus === "disabled")
  ) {
    overallStatus = "synced";
  }

  dbService.updateInvoiceSyncStatuses(invoice.chave, {
    localSyncStatus,
    cloudSyncStatus,
    syncStatus: overallStatus,
    error: overallError,
  });

  return overallStatus === "synced";
}

// Synchronize all pending invoices for a specific company or all companies
export async function syncPendingInvoices(companyCnpj = null) {
  const filters = { status: "pending" };
  if (companyCnpj) {
    filters.companyCnpj = companyCnpj;
  }

  const pendingInvoices = dbService.getInvoices(filters);
  if (pendingInvoices.length === 0) {
    return 0;
  }

  let successCount = 0;
  for (const invoice of pendingInvoices) {
    const success = await syncInvoiceToAlterdata(invoice);
    if (success) successCount++;
  }

  return successCount;
}
