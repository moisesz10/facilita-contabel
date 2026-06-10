import fs from "fs";
import path from "path";
import crypto from "crypto";

// Helper to generate a random 44-digit SEFAZ access key (Chave de Acesso)
// Format: UF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + numero(9) + tpEmis(1) + cNF(8) + cDV(1)
function generateChaveAcesso(cnpj, type, dateStr) {
  const uf = "35"; // SP
  const date = new Date(dateStr);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const cleanCnpj = cnpj.replace(/\D/g, "").padStart(14, "0");
  const mod = "55"; // NF-e
  const serie = "001";
  const numero = String(Math.floor(Math.random() * 999999) + 1).padStart(
    9,
    "0",
  );
  const tpEmis = "1"; // Normal
  const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, "0");

  const keyWithoutDv = `${uf}${yy}${mm}${cleanCnpj}${mod}${serie}${numero}${tpEmis}${cNF}`;

  // Calculate modulo 11 check digit (DV)
  let sum = 0;
  let weight = 2;
  for (let i = keyWithoutDv.length - 1; i >= 0; i--) {
    sum += Number(keyWithoutDv[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const dv = remainder < 2 ? 0 : 11 - remainder;

  return `${keyWithoutDv}${dv}`;
}

// Generate realistic XML content for an NF-e
function generateNFeXml(data) {
  const {
    chave,
    nNF,
    dhEmi,
    emitCnpj,
    emitName,
    emitIE,
    destCnpj,
    destName,
    destIE,
    vProd,
    vNF,
    vICMS,
    items = [],
  } = data;

  const itemsXml = items
    .map(
      (item, index) => `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${String(item.code || 100 + index).padStart(5, "0")}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${item.name}</xProd>
        <NCM>${item.ncm || "21069090"}</NCM>
        <CFOP>${item.cfop || "5102"}</CFOP>
        <uCom>UN</uCom>
        <qCom>${item.qty.toFixed(4)}</qCom>
        <vUnCom>${item.price.toFixed(10)}</vUnCom>
        <vProd>${item.total.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>${item.qty.toFixed(4)}</qTrib>
        <vUnTrib>${item.price.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${(item.total * 0.1345).toFixed(2)}</vTotTrib>
        <ICMS>
          <ICMS00>
            <orig>0</orig>
            <CST>00</CST>
            <modBC>3</modBC>
            <vBC>${item.total.toFixed(2)}</vBC>
            <pICMS>18.00</pICMS>
            <vICMS>${(item.total * 0.18).toFixed(2)}</vICMS>
          </ICMS00>
        </ICMS>
        <PIS>
          <PISAliq>
            <CST>01</CST>
            <vBC>${item.total.toFixed(2)}</vBC>
            <pPIS>1.65</pPIS>
            <vPIS>${(item.total * 0.0165).toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>01</CST>
            <vBC>${item.total.toFixed(2)}</vBC>
            <pCOFINS>7.60</pCOFINS>
            <vCOFINS>${(item.total * 0.076).toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>
  `,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${chave.slice(-9, -1)}</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${nNF}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.slice(-1)}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>FacilitaContabil_v1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${emitCnpj.replace(/\D/g, "")}</CNPJ>
        <xNome>${emitName}</xNome>
        <enderEmit>
          <xLgr>Avenida Paulista</xLgr>
          <n>1000</n>
          <xBairro>Bela Vista</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>${emitIE || "111222333444"}</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${destCnpj.replace(/\D/g, "")}</CNPJ>
        <xNome>${destName}</xNome>
        <enderDest>
          <xLgr>Rua Oscar Freire</xLgr>
          <n>500</n>
          <xBairro>Pinheiros</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>05409010</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
        <IE>${destIE || ""}</IE>
      </dest>
      ${itemsXml}
      <total>
        <ICMSTot>
          <vBC>${vProd.toFixed(2)}</vBC>
          <vICMS>${vICMS.toFixed(2)}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${vProd.toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>${(vProd * 0.0165).toFixed(2)}</vPIS>
          <vCOFINS>${(vProd * 0.076).toFixed(2)}</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${vNF.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <indPag>0</indPag>
          <tPag>01</tPag>
          <vPag>${vNF.toFixed(2)}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>Simulado pelo Facilita Contabil. Sem valor fiscal.</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SP_PL_009_V4</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>135200000000001</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`.trim();
}

// Simulated data pools for dynamic invoice generation
const MOCK_PARTNERS = [
  {
    cnpj: "08.238.072/0001-90",
    name: "Distribuidora de Alimentos Vale Verde Ltda",
    ie: "111444777111",
  },
  {
    cnpj: "43.208.571/0001-32",
    name: "Supermercados Pão e Leite S/A",
    ie: "222555888222",
  },
  {
    cnpj: "59.102.392/0001-09",
    name: "Fornecedor de Bebidas Nacional S.A.",
    ie: "333666999333",
  },
  {
    cnpj: "10.590.284/0001-44",
    name: "Embalagens São Paulo Eireli",
    ie: "444777000444",
  },
  {
    cnpj: "02.408.591/0002-88",
    name: "Panificadora Central e Doceria EPP",
    ie: "555888111555",
  },
  {
    cnpj: "18.490.201/0001-50",
    name: "Restaurante Sabor das Laranjas",
    ie: "666999222666",
  },
  {
    cnpj: "22.339.408/0001-12",
    name: "Hortifruti da Terra S.A.",
    ie: "777000333777",
  },
  {
    cnpj: "05.908.102/0001-77",
    name: "Logística Rápida Brasil Ltda",
    ie: "888111444888",
  },
];

const MOCK_PRODUCTS = [
  {
    name: "Refrigerante Cola 2L Fardo c/ 6",
    price: 42.9,
    ncm: "22021000",
    cfop_inside: "5405",
    cfop_outside: "6405",
  },
  {
    name: "Arroz Agulha Tipo 1 5kg pct",
    price: 29.9,
    ncm: "10063011",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Feijão Carioca Extra 1kg",
    price: 8.5,
    ncm: "07133319",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Óleo de Soja Pet 900ml",
    price: 6.8,
    ncm: "15079011",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Açúcar Refinado Especial 5kg",
    price: 18.9,
    ncm: "17019900",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Leite UHT Integral Caixeta 1L",
    price: 4.89,
    ncm: "04012010",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Café Torrado e Moído Vácuo 500g",
    price: 19.5,
    ncm: "09012100",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Detergente Líquido Neutro 500ml",
    price: 2.3,
    ncm: "34022000",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Sabão em Pó Multiação 1.6kg",
    price: 17.8,
    ncm: "34022000",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
  {
    name: "Papel Higiênico Folha Dupla pct c/ 12",
    price: 15.9,
    ncm: "48181000",
    cfop_inside: "5102",
    cfop_outside: "6102",
  },
];

// Generate an XML and return metadata for a simulated invoice
export function generateMockInvoice(
  companyCnpj,
  companyName,
  type = "entrada",
) {
  const partner =
    MOCK_PARTNERS[Math.floor(Math.random() * MOCK_PARTNERS.length)];
  const date = new Date(
    Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000),
  ); // Last 10 days
  const dhEmi = date.toISOString().split(".")[0] + "-03:00";

  const chave = generateChaveAcesso(companyCnpj, type, date);
  const nNF = String(Math.floor(Math.random() * 99999) + 1);

  // Generate 1-4 random products
  const numItems = Math.floor(Math.random() * 4) + 1;
  const items = [];
  let vProd = 0;
  for (let i = 0; i < numItems; i++) {
    const prodRef =
      MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
    const qty = Math.floor(Math.random() * 10) + 1;
    const price = prodRef.price * (0.9 + Math.random() * 0.2); // Add variation
    const total = qty * price;
    vProd += total;
    items.push({
      name: prodRef.name,
      code: String(i + 1),
      qty,
      price,
      total,
      ncm: prodRef.ncm,
      cfop: type === "entrada" ? "1102" : prodRef.cfop_inside,
    });
  }

  const vICMS = vProd * 0.18;
  const vNF = vProd;

  const emitCnpj = type === "entrada" ? partner.cnpj : companyCnpj;
  const emitName = type === "entrada" ? partner.name : companyName;
  const emitIE = type === "entrada" ? partner.ie : "110222333444";

  const destCnpj = type === "entrada" ? companyCnpj : partner.cnpj;
  const destName = type === "entrada" ? companyName : partner.name;
  const destIE = type === "entrada" ? "110222333444" : partner.ie;

  const data = {
    chave,
    nNF,
    dhEmi,
    emitCnpj,
    emitName,
    emitIE,
    destCnpj,
    destName,
    destIE,
    vProd,
    vNF,
    vICMS,
    items,
  };

  const xmlContent = generateNFeXml(data);

  return {
    chave,
    companyCnpj,
    date: dhEmi.substring(0, 10),
    type,
    value: vNF,
    issuerName: emitName,
    issuerCnpj: emitCnpj,
    recipientName: destName,
    recipientCnpj: destCnpj,
    xmlContent,
    syncStatus: "pending",
  };
}

const getTagVal = (tag, text) => {
  const regex = new RegExp(
    `<(\\w+:)?${tag}(\\s+[^>]*)?>([^<]+)<\\/(\\w+:)?${tag}>`,
    "i",
  );
  const match = text.match(regex);
  return match ? match[3].trim() : "";
};

const getInnerTag = (tag, text) => {
  const regex = new RegExp(
    `<(\\w+:)?${tag}(\\s+[^>]*)?>([\\s\\S]*?)<\\/(\\w+:)?${tag}>`,
    "i",
  );
  const match = text.match(regex);
  return match ? match[3] : "";
};

// Read XML file contents and extract fields via Regex (extremely fast and doesn't crash on slightly malformed inputs)
export function parseNFeXml(xmlText) {
  try {
    const isNfse =
      xmlText.includes("<Nfse") ||
      xmlText.includes("<tcNfse") ||
      xmlText.includes("<Valores>") ||
      xmlText.includes("<Prestador") ||
      xmlText.includes("<CompNfse");

    if (isNfse) {
      // It's a Service Invoice (NFS-e)
      const numero =
        getTagVal("Numero", xmlText) ||
        getTagVal("nDFS", xmlText) ||
        Math.floor(Math.random() * 99999);

      const prestadorText =
        getInnerTag("PrestadorServico", xmlText) ||
        getInnerTag("Prestador", xmlText) ||
        xmlText;
      const issuerCnpj =
        getTagVal("CNPJ", prestadorText) ||
        getTagVal("Cnpj", prestadorText) ||
        getTagVal("CNPJPrestador", xmlText);
      const issuerName =
        getTagVal("RazaoSocial", prestadorText) ||
        getTagVal("xNome", prestadorText) ||
        getTagVal("xNomePrestador", xmlText);

      const tomadorText =
        getInnerTag("TomadorServico", xmlText) ||
        getInnerTag("Tomador", xmlText) ||
        xmlText;
      const recipientCnpj =
        getTagVal("CNPJ", tomadorText) ||
        getTagVal("Cnpj", tomadorText) ||
        getTagVal("CNPJTomador", xmlText);
      const recipientName =
        getTagVal("RazaoSocial", tomadorText) ||
        getTagVal("xNome", tomadorText) ||
        getTagVal("xNomeTomador", xmlText);

      const vServVal =
        getTagVal("ValorServicos", xmlText) ||
        getTagVal("vServ", xmlText) ||
        getTagVal("vNF", xmlText);
      const value = vServVal ? parseFloat(vServVal) : 0;

      const dhEmiRaw =
        getTagVal("DataEmissao", xmlText) ||
        getTagVal("dhEmi", xmlText) ||
        getTagVal("dEmi", xmlText);
      const date = dhEmiRaw
        ? dhEmiRaw.substring(0, 10)
        : new Date().toISOString().substring(0, 10);

      // Unique identifier for NFS-e
      const cleanIssuerCnpj = issuerCnpj
        ? issuerCnpj.replace(/\D/g, "")
        : "00000000000000";
      const chave =
        `NFSE${cleanIssuerCnpj.padStart(14, "0")}${String(numero).padStart(9, "0")}`.padEnd(
          44,
          "0",
        );

      return {
        chave,
        date,
        issuerCnpj: formatCnpjCpf(issuerCnpj),
        issuerName: issuerName || "Prestador de Serviço",
        recipientCnpj: formatCnpjCpf(recipientCnpj),
        recipientName: recipientName || "Tomador de Serviço",
        value,
        xmlContent: xmlText,
      };
    }

    // Extract Chave de Acesso from Id="NFe352..." or infProt/chNFe
    let chave = "";
    const chMatch =
      xmlText.match(/<(\w+:)?chNFe>([^<]+)<\/(\w+:)?chNFe>/i) ||
      xmlText.match(/<(\w+:)?infNFe\s+[^>]*Id="NFe(\d{44})"/i);
    if (chMatch) {
      chave = chMatch[2];
    } else {
      const fallbackMatch =
        xmlText.match(/chNFe>(\d{44})</i) || xmlText.match(/Id="NFe(\d{44})"/i);
      if (fallbackMatch) {
        chave = fallbackMatch[1];
      }
    }

    if (!chave) {
      throw new Error("Chave de Acesso não encontrada no XML");
    }

    const nNF = getTagVal("nNF", xmlText);
    const dhEmiRaw = getTagVal("dhEmi", xmlText) || getTagVal("dEmi", xmlText);
    const date = dhEmiRaw
      ? dhEmiRaw.substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    // Extract Emitente
    const emitText = getInnerTag("emit", xmlText);
    const issuerCnpj =
      getTagVal("CNPJ", emitText) || getTagVal("CPF", emitText);
    const issuerName = getTagVal("xNome", emitText);

    // Extract Destinatário
    const destText = getInnerTag("dest", xmlText);
    const recipientCnpj =
      getTagVal("CNPJ", destText) || getTagVal("CPF", destText);
    const recipientName = getTagVal("xNome", destText);

    // Total Value
    const vNFVal = getTagVal("vNF", xmlText);
    const value = vNFVal ? parseFloat(vNFVal) : 0;

    return {
      chave,
      date,
      issuerCnpj: formatCnpjCpf(issuerCnpj),
      issuerName,
      recipientCnpj: formatCnpjCpf(recipientCnpj),
      recipientName,
      value,
      xmlContent: xmlText,
    };
  } catch (error) {
    console.error("Erro ao fazer parse do XML:", error);
    throw new Error("Formato XML de Nota Fiscal inválido: " + error.message);
  }
}

function formatCnpjCpf(value = "") {
  const clean = value.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
}

// Fetch automatic DFe from SEFAZ simulation or actual SOAP (mocked logic stub)
export async function fetchSefazInvoices(company, limit = 5) {
  // If simulation is enabled, we just generate mock invoices
  // In a real production setup, we would load the PFX file from `uploads/certificates/<CNPJ>.pfx`,
  // authenticate with password, connect to the national SEFAZ endpoint using soap-client or https agent,
  // query for new NSUs, and parse the resulting Gzipped XML documents.

  const fetched = [];

  // Randomly decide number of new notes to pull (0 to limit)
  const count = Math.floor(Math.random() * (limit + 1));

  for (let i = 0; i < count; i++) {
    // Generate both entry and exit notes
    const type = Math.random() > 0.4 ? "entrada" : "saida";
    const invoice = generateMockInvoice(
      company.cnpj,
      company.razaoSocial,
      type,
    );
    fetched.push(invoice);
  }

  return fetched;
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export function generateDanfeHtml(invoice) {

  const cleanKey = invoice.chave.replace(/(.{4})/g, "$1 ");

  // Parse items from XML
  const items = [];
  const itemRegex = /<det nItem="(\d+)">([\s\S]*?)<\/det>/g;
  let match;
  while ((match = itemRegex.exec(invoice.xmlContent)) !== null) {
    const itemText = match[2];
    const nameMatch = itemText.match(/<xProd>([^<]+)<\/xProd>/);
    const qtyMatch = itemText.match(/<qCom>([^<]+)<\/qCom>/);
    const priceMatch = itemText.match(/<vUnCom>([^<]+)<\/vUnCom>/);
    const totalMatch = itemText.match(/<vProd>([^<]+)<\/vProd>/);
    const ncmMatch = itemText.match(/<NCM>([^<]+)<\/NCM>/);
    const cfopMatch = itemText.match(/<CFOP>([^<]+)<\/CFOP>/);

    items.push({
      nItem: match[1],
      name: nameMatch ? nameMatch[1] : "Produto Desconhecido",
      qty: qtyMatch ? parseFloat(qtyMatch[1]) : 0,
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      total: totalMatch ? parseFloat(totalMatch[1]) : 0,
      ncm: ncmMatch ? ncmMatch[1] : "",
      cfop: cfopMatch ? cfopMatch[1] : "",
    });
  }

  const itemsRows = items
    .map(
      (item) => `
    <tr>
      <td style="border: 1px solid #000; text-align: center; padding: 4px;">${item.nItem}</td>
      <td style="border: 1px solid #000; padding: 4px;">${100 + parseInt(item.nItem)}</td>
      <td style="border: 1px solid #000; padding: 4px;">${item.name}</td>
      <td style="border: 1px solid #000; text-align: center; padding: 4px;">${item.ncm}</td>
      <td style="border: 1px solid #000; text-align: center; padding: 4px;">${item.cfop}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px;">${item.qty}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px;">${formatCurrency(item.price)}</td>
      <td style="border: 1px solid #000; text-align: right; padding: 4px; font-weight: bold;">${formatCurrency(item.total)}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - Nota Fiscal Eletrônica</title>
  <style>
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: black; background: white; padding: 20px; max-width: 800px; margin: 0 auto; }
    .title { font-size: 14px; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 15px; }
    .box { border: 1px solid #000; margin-bottom: 8px; padding: 6px; }
    .row { display: flex; border-bottom: 1px solid #ddd; padding: 4px 0; }
    .row:last-child { border-bottom: none; }
    .col { flex: 1; padding: 0 4px; }
    .label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #444; display: block; }
    .value { font-size: 11px; margin-top: 2px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th { border: 1px solid #000; font-size: 10px; padding: 4px; background-color: #f0f0f0; text-transform: uppercase; text-align: left; }
  </style>
</head>
<body>
  <div class="title">DANFE - Documento Auxiliar da Nota Fiscal Eletrônica</div>
  
  <div class="box">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 10px;">
          <span class="label">Emitente</span>
          <div class="value" style="font-weight: bold; font-size: 12px;">${invoice.issuerName}</div>
          <div class="value">CNPJ: ${invoice.issuerCnpj}</div>
          <div class="value">Endereço: Avenida Paulista, 1000 - Bela Vista - São Paulo - SP</div>
        </td>
        <td style="width: 50%; vertical-align: top; border-left: 1px solid #000; padding-left: 10px;">
          <span class="label">Controle do Fisco - Chave de Acesso</span>
          <div class="value" style="font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">${cleanKey}</div>
          <div style="margin-top: 8px; display: flex; justify-content: space-between;">
            <div>
              <span class="label">Série</span>
              <div class="value">1</div>
            </div>
            <div>
              <span class="label">Número</span>
              <div class="value">${invoice.chave.slice(-9, -1)}</div>
            </div>
            <div>
              <span class="label">Data Emissão</span>
              <div class="value">${formatDate(invoice.date)}</div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="box">
    <span class="label">Destinatário / Remetente</span>
    <div class="row">
      <div class="col" style="flex: 2;">
        <span class="label">Nome / Razão Social</span>
        <div class="value">${invoice.recipientName}</div>
      </div>
      <div class="col">
        <span class="label">CNPJ / CPF</span>
        <div class="value">${invoice.recipientCnpj}</div>
      </div>
    </div>
    <div class="row">
      <div class="col" style="flex: 2;">
        <span class="label">Endereço</span>
        <div class="value">Rua Oscar Freire, 500 - Pinheiros - São Paulo - SP</div>
      </div>
      <div class="col">
        <span class="label">CEP</span>
        <div class="value">05409-010</div>
      </div>
    </div>
  </div>

  <div class="box">
    <span class="label">Cálculo do Imposto</span>
    <div style="display: flex;">
      <div style="flex: 1; border-right: 1px solid #ddd; padding: 4px;">
        <span class="label">Base de Cálculo ICMS</span>
        <div class="value">${formatCurrency(invoice.value)}</div>
      </div>
      <div style="flex: 1; border-right: 1px solid #ddd; padding: 4px;">
        <span class="label">Valor do ICMS</span>
        <div class="value">${formatCurrency(invoice.value * 0.18)}</div>
      </div>
      <div style="flex: 1; border-right: 1px solid #ddd; padding: 4px;">
        <span class="label">Valor do PIS</span>
        <div class="value">${formatCurrency(invoice.value * 0.0165)}</div>
      </div>
      <div style="flex: 1; border-right: 1px solid #ddd; padding: 4px;">
        <span class="label">Valor COFINS</span>
        <div class="value">${formatCurrency(invoice.value * 0.076)}</div>
      </div>
      <div style="flex: 1; padding: 4px;">
        <span class="label">Valor Total da Nota</span>
        <div class="value" style="font-weight: bold;">${formatCurrency(invoice.value)}</div>
      </div>
    </div>
  </div>

  <span class="label" style="margin-top: 15px;">Dados dos Produtos / Serviços</span>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 5%;">Item</th>
        <th style="width: 10%;">Cód. Prod</th>
        <th style="width: 45%;">Descrição do Produto</th>
        <th style="width: 10%;">NCM</th>
        <th style="width: 8%;">CFOP</th>
        <th style="width: 6%;">Qtd</th>
        <th style="width: 8%;">Valor Unit</th>
        <th style="width: 8%;">Valor Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div style="margin-top: 25px; border-top: 1px dashed #000; padding-top: 8px; font-size: 9px; color: #555; text-align: center;">
    Documento gerado automaticamente pelo Facilita Contábil. Integrado com Alterdata Fiscal.
  </div>
</body>
</html>`;
}
