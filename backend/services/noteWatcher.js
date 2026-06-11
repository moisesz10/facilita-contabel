// backend/services/noteWatcher.js

import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { dbService } from '../db.js';
import { syncInvoiceToAlterdata } from '../alterdataService.js';
import { saveToCofreDigital } from '../storageService.js';
import { sendNotification } from './notification.js';

// Folder to watch – can be overridden via env variable
const NOTES_EXPORT_FOLDER = process.env.NOTES_EXPORT_FOLDER || 'notas_exportadas';
const WATCH_PATH = path.resolve(process.cwd(), NOTES_EXPORT_FOLDER);

// Simple parser – assumes exported notes are JSON files with same schema as invoice data
async function parseNoteFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.promises.readFile(filePath, 'utf8');
  if (ext === '.json') {
    return JSON.parse(content);
  }
  // Placeholder for XML parsing if needed
  throw new Error(`Unsupported note file extension: ${ext}`);
}

export function startNoteWatcher() {
  if (!fs.existsSync(WATCH_PATH)) {
    console.warn(`[NoteWatcher] Folder ${WATCH_PATH} does not exist – will be created.`);
    fs.mkdirSync(WATCH_PATH, { recursive: true });
  }
  const watcher = chokidar.watch(WATCH_PATH, { persistent: true, ignoreInitial: true });

  watcher.on('add', async (filePath) => {
    console.log(`[NoteWatcher] New file detected: ${filePath}`);
    try {
      const noteData = await parseNoteFile(filePath);
      // Assume noteData contains at least: chave, companyCnpj, type, value, issuerName, recipientName, date, xmlContent
      const added = dbService.addInvoice({
        ...noteData,
        syncStatus: 'pending',
      });
      // Save to Cofre Digital
      await saveToCofreDigital(added);
      // Sync to Alterdata
      const success = await syncInvoiceToAlterdata(added);
      // Notification
      await sendNotification({
        to: process.env.NOTIFICATION_EMAIL,
        subject: `Nota processada: ${added.chave}`,
        text: `A nota ${added.chave} foi importada e ${success ? 'sincronizada' : 'falhou ao sincronizar'} com Alterdata.`,
      });
      // Cleanup file after processing
      await fs.promises.unlink(filePath);
    } catch (err) {
      console.error(`[NoteWatcher] Error processing ${filePath}:`, err);
      // Move problematic file to an error folder
      const errorDir = path.join(WATCH_PATH, 'error');
      if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir);
      const baseName = path.basename(filePath);
      await fs.promises.rename(filePath, path.join(errorDir, baseName));
    }
  });

  console.log(`[NoteWatcher] Watching folder: ${WATCH_PATH}`);
}
