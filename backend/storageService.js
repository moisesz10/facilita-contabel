import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { dbService } from './db.js';

// Inicialização "Lazy" do Cliente S3, caso o usuário tenha preenchido as configurações
let s3Client = null;

const initS3Client = () => {
  const settings = dbService.getSettings();
  if (settings.awsAccessKey && settings.awsSecretKey && settings.awsRegion) {
    return new S3Client({
      region: settings.awsRegion,
      credentials: {
        accessKeyId: settings.awsAccessKey,
        secretAccessKey: settings.awsSecretKey,
      },
    });
  }
  return null;
};

// Salva XML no Cofre Digital (S3 ou Local)
export async function saveToCofreDigital(invoice) {
  const { chave, xmlContent, companyCnpj } = invoice;
  const fileName = `${chave}.xml`;
  const company = dbService.getCompanyByCnpj(companyCnpj);
  const settings = dbService.getSettings();
  
  // Tenta salvar na nuvem
  if (settings.enableCofreDigitalCloud) {
    if (!s3Client) {
      s3Client = initS3Client();
    }
    
    if (s3Client && settings.awsBucketName) {
      try {
        const command = new PutObjectCommand({
          Bucket: settings.awsBucketName,
          Key: `cofre-digital/${companyCnpj}/${fileName}`,
          Body: xmlContent,
          ContentType: 'application/xml',
          Metadata: {
            chave: chave,
            cnpj: companyCnpj
          }
        });

        await s3Client.send(command);
        
        dbService.addLog("info", `[Cofre Digital] XML ${chave.slice(-6)} arquivado no AWS S3 com sucesso.`, companyCnpj);
        
        // Atualiza a invoice indicando que o arquivo está no Cofre Cloud
        invoice.cofreStatus = "cloud";
        return;
      } catch (error) {
        dbService.addLog("error", `[Cofre Digital] Erro no upload para S3: ${error.message}. Fazendo fallback para armazenamento local.`, companyCnpj);
      }
    } else {
       dbService.addLog("warning", `[Cofre Digital] Credenciais AWS não configuradas. Fazendo fallback para armazenamento local.`, companyCnpj);
    }
  }

  // Fallback Local Storage
  try {
    const localPath = path.join(process.cwd(), 'uploads', 'cofre', companyCnpj);
    await fs.mkdir(localPath, { recursive: true });
    await fs.writeFile(path.join(localPath, fileName), xmlContent, 'utf-8');
    
    invoice.cofreStatus = "local";
  } catch (err) {
    console.error("Erro no Cofre Digital Local:", err);
    dbService.addLog("error", `[Cofre Digital Local] Falha ao arquivar XML: ${err.message}`, companyCnpj);
    invoice.cofreStatus = "error";
  }
}
