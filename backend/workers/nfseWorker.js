import puppeteer from 'puppeteer';
import { dbService } from '../db.js';

// Simulador de Robô de Captura de NFS-e
// Este arquivo é uma arquitetura base para criar scrapers específicos por prefeitura.
export async function scrapeNfse(company) {
  if (!company || !company.activeSync) return [];

  // Em um ambiente real, identificaríamos a prefeitura pelo município do CNPJ
  const municipio = company.municipio || "São Paulo";
  
  dbService.addLog("info", `[Robô NFS-e] Iniciando captura para ${company.razaoSocial} na prefeitura de ${municipio}...`, company.cnpj);

  try {
    // Configura o Puppeteer (headless para rodar invisível no backend)
    // sandbox: false é comum para evitar problemas em ambientes Docker/Cloud
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Simula navegação até o portal da prefeitura
    // await page.goto('https://nfe.prefeitura.sp.gov.br/login.aspx');
    // await page.type('#login', company.cnpj);
    // await page.type('#senha', 'senhaSegura123');
    // await page.click('#btnEntrar');
    // await page.waitForNavigation();

    // Como não temos acesso real a uma prefeitura neste ambiente,
    // simulamos a leitura (Scraping) das notas na página.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simula tempo de rede e scraping

    const simulatedNfse = [];
    
    // Vamos simular que o robô achou 1 ou 0 notas de serviço nessa varredura
    const foundNotes = Math.random() > 0.5 ? 1 : 0;
    
    if (foundNotes > 0) {
      const numeroNfse = Math.floor(Math.random() * 90000) + 10000;
      const chaveFalsa = `NFSE${company.cnpj.replace(/\D/g, '')}${numeroNfse}`;
      
      const xmlFake = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>${numeroNfse}</Numero>
      <CodigoVerificacao>ABC123XYZ</CodigoVerificacao>
      <DataEmissao>${new Date().toISOString()}</DataEmissao>
      <Valores>
        <ValorServicos>${(Math.random() * 1000 + 100).toFixed(2)}</ValorServicos>
      </Valores>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <Cnpj>${company.cnpj.replace(/\D/g, '')}</Cnpj>
        </IdentificacaoPrestador>
        <RazaoSocial>${company.razaoSocial}</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <Cnpj>12345678000199</Cnpj>
        </IdentificacaoTomador>
        <RazaoSocial>Tomador de Serviços Ltda</RazaoSocial>
      </TomadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

      simulatedNfse.push({
        chave: chaveFalsa,
        companyCnpj: company.cnpj,
        date: new Date().toISOString(),
        type: "saida", // NFS-e emitida pela empresa
        value: Number((Math.random() * 1000 + 100).toFixed(2)),
        issuerName: company.razaoSocial,
        issuerCnpj: company.cnpj,
        recipientName: "Tomador de Serviços Ltda",
        recipientCnpj: "12.345.678/0001-99",
        xmlContent: xmlFake,
        syncStatus: "pending"
      });
    }

    await browser.close();

    if (simulatedNfse.length > 0) {
      dbService.addLog("success", `[Robô NFS-e] ${simulatedNfse.length} notas de serviço capturadas com sucesso via Web Scraping.`, company.cnpj);
    } else {
      // dbService.addLog("info", `[Robô NFS-e] Nenhuma nova NFS-e encontrada nesta varredura.`, company.cnpj);
    }

    return simulatedNfse;

  } catch (error) {
    dbService.addLog("error", `[Robô NFS-e] Falha crítica na automação de navegação: ${error.message}`, company.cnpj);
    return [];
  }
}
