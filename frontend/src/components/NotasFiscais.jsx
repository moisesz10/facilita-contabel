import React, { useState } from 'react';
import { Search, Eye, Download, Send, Filter, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, X, Copy, Check, Folder, Cloud } from 'lucide-react';

const renderChannelStatus = (status, type) => {
  const Icon = type === 'local' ? Folder : Cloud;
  const label = type === 'local' ? 'Pasta Local (e-Drive)' : 'Nuvem Alterdata (NF-Stock)';
  
  let color = 'var(--text-muted)';
  let title = `${label}: Desativado`;
  
  if (status === 'synced') {
    color = 'var(--success-light)';
    title = `${label}: Sincronizado`;
  } else if (status === 'pending') {
    color = 'var(--warning-light)';
    title = `${label}: Pendente`;
  } else if (status === 'error') {
    color = 'var(--danger-light)';
    title = `${label}: Erro na sincronização`;
  }
  
  return (
    <span 
      title={title} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '0.25rem',
        borderRadius: '4px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border)',
        color: color
      }}
    >
      <Icon size={13} />
    </span>
  );
};

export default function NotasFiscais({ invoices, companies, onSyncInvoice }) {
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Apply filters client-side
  const filteredInvoices = invoices.filter(inv => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      inv.chave.includes(searchLower) ||
      (inv.issuerName && inv.issuerName.toLowerCase().includes(searchLower)) ||
      (inv.recipientName && inv.recipientName.toLowerCase().includes(searchLower)) ||
      (inv.issuerCnpj && inv.issuerCnpj.includes(searchLower)) ||
      (inv.recipientCnpj && inv.recipientCnpj.includes(searchLower));

    // Company filter
    const matchesCompany = !filterCompany || inv.companyCnpj === filterCompany;

    // Type filter
    const matchesType = !filterType || inv.type === filterType;

    // Status filter
    const matchesStatus = !filterStatus || inv.syncStatus === filterStatus;

    // Date range filter
    const matchesStartDate = !startDate || inv.date >= startDate;
    const matchesEndDate = !endDate || inv.date <= endDate;

    return matchesSearch && matchesCompany && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadXml = (invoice) => {
    const element = document.createElement("a");
    const file = new Blob([invoice.xmlContent], { type: 'text/xml' });
    element.href = URL.createObjectURL(file);
    element.download = `${invoice.chave}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatCnpj = (value = '') => {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to get company name from CNPJ
  const getCompanyName = (cnpj) => {
    const comp = companies.find(c => c.cnpj === cnpj);
    return comp ? comp.razaoSocial : 'Empresa não cadastrada';
  };

  // Parse items from XML mock structure
  const getInvoiceItems = (xmlText) => {
    const items = [];
    const itemRegex = /<det nItem="(\d+)">([\s\S]*?)<\/det>/g;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemText = match[2];
      const nameMatch = itemText.match(/<xProd>([^<]+)<\/xProd>/);
      const qtyMatch = itemText.match(/<qCom>([^<]+)<\/qCom>/);
      const priceMatch = itemText.match(/<vUnCom>([^<]+)<\/vUnCom>/);
      const totalMatch = itemText.match(/<vProd>([^<]+)<\/vProd>/);
      const ncmMatch = itemText.match(/<NCM>([^<]+)<\/NCM>/);
      const cfopMatch = itemText.match(/<CFOP>([^<]+)<\/CFOP>/);

      items.push({
        nItem: match[1],
        name: nameMatch ? nameMatch[1] : 'Produto Desconhecido',
        qty: qtyMatch ? parseFloat(qtyMatch[1]) : 0,
        price: priceMatch ? parseFloat(priceMatch[1]) : 0,
        total: totalMatch ? parseFloat(totalMatch[1]) : 0,
        ncm: ncmMatch ? ncmMatch[1] : '',
        cfop: cfopMatch ? cfopMatch[1] : ''
      });
    }
    return items;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Explorador de Notas Fiscais</h1>
          <p className="page-subtitle">Consulte, baixe e force a sincronização manual de notas no Alterdata.</p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
          <Filter size={16} />
          <span>Filtros de Pesquisa</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search */}
          <div style={{ flex: '2', minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por Chave, Emitente, CNPJ..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
          </div>

          {/* Company dropdown */}
          <div style={{ flex: '1', minWidth: '150px' }}>
            <select className="form-input" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
              <option value="">Todas as Empresas</option>
              {companies.map(c => (
                <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial}</option>
              ))}
            </select>
          </div>

          {/* Type dropdown */}
          <div style={{ flex: '1', minWidth: '120px' }}>
            <select className="form-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos os Tipos</option>
              <option value="entrada">Entrada (Compras)</option>
              <option value="saida">Saída (Vendas)</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div style={{ flex: '1', minWidth: '120px' }}>
            <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos os Status</option>
              <option value="synced">Sincronizado</option>
              <option value="pending">Pendente</option>
              <option value="error">Erro</option>
            </select>
          </div>

          {/* Start Date */}
          <div style={{ flex: '1', minWidth: '130px' }}>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div style={{ flex: '1', minWidth: '130px' }}>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Invoice Table Panel */}
      <div className="glass-panel">
        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
            <h3>Nenhuma nota fiscal encontrada</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Tente alterar os filtros ou realize uma busca de novas notas na SEFAZ.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Chave / Data</th>
                  <th>Cliente Contábil</th>
                  <th>Emitente / Destinatário</th>
                  <th>Valor Total</th>
                  <th>Status Alterdata</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.chave}>
                    <td>
                      {inv.type === 'entrada' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success-light)', background: 'var(--success-glow)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <ArrowDownLeft size={14} />
                          <span>ENTRADA</span>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-light)', background: 'var(--accent-glow)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <ArrowUpRight size={14} />
                          <span>SAÍDA</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <span>...{inv.chave.slice(-10)}</span>
                        <button 
                          className="btn-icon" 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          onClick={() => copyToClipboard(inv.chave)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{formatDate(inv.date)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{getCompanyName(inv.companyCnpj)}</div>
                    </td>
                    <td>
                      {inv.type === 'entrada' ? (
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{inv.issuerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Emit: {formatCnpj(inv.issuerCnpj)}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{inv.recipientName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dest: {formatCnpj(inv.recipientCnpj)}</div>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(inv.value)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                        {inv.syncStatus === 'synced' ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            <CheckCircle2 size={10} />
                            Concluído
                          </span>
                        ) : inv.syncStatus === 'error' ? (
                          <span className="badge badge-danger" title={inv.syncError} style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            <AlertCircle size={10} />
                            Erro
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            <Send size={10} />
                            Pendente
                          </span>
                        )}
                        
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.1rem' }}>
                          {renderChannelStatus(inv.localSyncStatus, 'local')}
                          {renderChannelStatus(inv.cloudSyncStatus, 'cloud')}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          title="Visualizar DANFE Simplificada"
                          className="btn btn-secondary btn-icon"
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ padding: '0.4rem' }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="Exportar/Forçar Sincronização Alterdata"
                          className="btn btn-secondary btn-icon"
                          onClick={() => onSyncInvoice(inv.chave)}
                          style={{ padding: '0.4rem' }}
                        >
                          <Send size={15} />
                        </button>
                        <button
                          title="Baixar Arquivo XML"
                          className="btn btn-secondary btn-icon"
                          onClick={() => handleDownloadXml(inv)}
                          style={{ padding: '0.4rem' }}
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Copied Key Popup Notification */}
      {copiedKey && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#10b981', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', zIndex: 1000 }}>
          <Check size={16} />
          <span>Chave de acesso copiada!</span>
        </div>
      )}

      {/* DANFE Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                DANFE Simplificada (Documento Auxiliar da Nota Fiscal Eletrônica)
              </h2>
              <button className="modal-close" onClick={() => setSelectedInvoice(null)}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => handleDownloadXml(selectedInvoice)}>
                <Download size={16} />
                Baixar XML
              </button>
              <button className="btn btn-primary" onClick={() => { onSyncInvoice(selectedInvoice.chave); setSelectedInvoice(null); }}>
                <Send size={16} />
                Enviar para Alterdata
              </button>
            </div>

            <div className="danfe-container">
              <div className="danfe-title">Documento Auxiliar da Nota Fiscal Eletrônica</div>
              
              <div className="danfe-box">
                <table className="danfe-header-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', verticalAlign: 'top' }}>
                        <span className="danfe-label">Emitente</span>
                        <div className="danfe-value" style={{ fontWeight: 'bold' }}>{selectedInvoice.issuerName}</div>
                        <div className="danfe-value">CNPJ: {formatCnpj(selectedInvoice.issuerCnpj)}</div>
                        <div className="danfe-value">Av. Paulista, 1000 - Bela Vista - São Paulo - SP</div>
                      </td>
                      <td style={{ width: '50%', verticalAlign: 'top' }}>
                        <span className="danfe-label">Controle do Fisco - Chave de Acesso</span>
                        <div className="danfe-value" style={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>
                          {selectedInvoice.chave.replace(/(.{4})/g, '$1 ')}
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <span className="danfe-label">Série</span>
                            <div className="danfe-value">1</div>
                          </div>
                          <div>
                            <span className="danfe-label">Número</span>
                            <div className="danfe-value">{selectedInvoice.chave.slice(-9, -1)}</div>
                          </div>
                          <div>
                            <span className="danfe-label">Data Emissão</span>
                            <div className="danfe-value">{formatDate(selectedInvoice.date)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="danfe-box">
                <span className="danfe-label">Destinatário / Remetente</span>
                <div className="danfe-row">
                  <div className="danfe-col" style={{ flex: '2' }}>
                    <span className="danfe-label">Nome / Razão Social</span>
                    <div className="danfe-value">{selectedInvoice.recipientName}</div>
                  </div>
                  <div className="danfe-col">
                    <span className="danfe-label">CNPJ / CPF</span>
                    <div className="danfe-value">{formatCnpj(selectedInvoice.recipientCnpj)}</div>
                  </div>
                </div>
                <div className="danfe-row">
                  <div className="danfe-col" style={{ flex: '2' }}>
                    <span className="danfe-label">Endereço</span>
                    <div className="danfe-value">Rua Oscar Freire, 500 - Pinheiros - São Paulo - SP</div>
                  </div>
                  <div className="danfe-col">
                    <span className="danfe-label">CEP</span>
                    <div className="danfe-value">05409-010</div>
                  </div>
                </div>
              </div>

              <div className="danfe-box">
                <span className="danfe-label">Cálculo do Imposto</span>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', borderRight: '1px solid #eee', padding: '0.25rem' }}>
                    <span className="danfe-label">Base de Cálculo ICMS</span>
                    <div className="danfe-value">{formatCurrency(selectedInvoice.value)}</div>
                  </div>
                  <div style={{ flex: '1', borderRight: '1px solid #eee', padding: '0.25rem' }}>
                    <span className="danfe-label">Valor do ICMS</span>
                    <div className="danfe-value">{formatCurrency(selectedInvoice.value * 0.18)}</div>
                  </div>
                  <div style={{ flex: '1', borderRight: '1px solid #eee', padding: '0.25rem' }}>
                    <span className="danfe-label">Valor do PIS</span>
                    <div className="danfe-value">{formatCurrency(selectedInvoice.value * 0.0165)}</div>
                  </div>
                  <div style={{ flex: '1', borderRight: '1px solid #eee', padding: '0.25rem' }}>
                    <span className="danfe-label">Valor COFINS</span>
                    <div className="danfe-value">{formatCurrency(selectedInvoice.value * 0.076)}</div>
                  </div>
                  <div style={{ flex: '1', padding: '0.25rem' }}>
                    <span className="danfe-label">Valor Total da Nota</span>
                    <div className="danfe-value" style={{ fontWeight: 'bold' }}>{formatCurrency(selectedInvoice.value)}</div>
                  </div>
                </div>
              </div>

              <span className="danfe-label">Dados dos Produtos / Serviços</span>
              <table className="danfe-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cód. Prod</th>
                    <th>Descrição do Produto</th>
                    <th>NCM</th>
                    <th>CFOP</th>
                    <th>Qtd</th>
                    <th>Valor Unit</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {getInvoiceItems(selectedInvoice.xmlContent).map(item => (
                    <tr key={item.nItem}>
                      <td style={{ textAlign: 'center' }}>{item.nItem}</td>
                      <td>{String(100 + parseInt(item.nItem)).padStart(5, '0')}</td>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.ncm}</td>
                      <td style={{ textAlign: 'center' }}>{item.cfop}</td>
                      <td style={{ textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1rem', borderTop: '1px dashed #999', paddingTop: '0.5rem', fontSize: '0.7rem', color: '#666' }}>
                * Nota gerada de forma automática integrada ao sistema Alterdata. Protocolo de Autorização SEFAZ: 135200000000001
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
