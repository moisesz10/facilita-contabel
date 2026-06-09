import React, { useState, useEffect } from 'react';
import { Save, FolderSync, Info, AlertCircle, HelpCircle, Trash, CloudLightning, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Configuracoes({ settings, onSaveSettings, onClearLogs }) {
  const [alterdataDir, setAlterdataDir] = useState('');
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(15);
  const [isSefazSimulation, setIsSefazSimulation] = useState(true);
  
  // Cloud integration states
  const [enableFolderSync, setEnableFolderSync] = useState(true);
  const [enableCloudSync, setEnableCloudSync] = useState(false);
  const [nfStockEmail, setNfStockEmail] = useState('');
  const [nfStockToken, setNfStockToken] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState(null);

  useEffect(() => {
    if (settings) {
      setAlterdataDir(settings.alterdataDir || '');
      setAutoSyncIntervalMinutes(settings.autoSyncIntervalMinutes || 15);
      setIsSefazSimulation(settings.isSefazSimulation ?? true);
      setEnableFolderSync(settings.enableFolderSync ?? true);
      setEnableCloudSync(settings.enableCloudSync ?? false);
      setNfStockEmail(settings.nfStockEmail || '');
      setNfStockToken(settings.nfStockToken || '');
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveSettings({
      alterdataDir,
      autoSyncIntervalMinutes: Number(autoSyncIntervalMinutes),
      isSefazSimulation,
      enableFolderSync,
      enableCloudSync,
      nfStockEmail,
      nfStockToken
    });
    setIsSaving(false);
  };

  const handleTestCloudConnection = async () => {
    if (!nfStockEmail || !nfStockToken) {
      alert('E-mail e Token de Integração são obrigatórios para realizar o teste.');
      return;
    }
    setIsTestingCloud(true);
    setCloudTestResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/settings/test-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nfStockEmail, token: nfStockToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCloudTestResult({ success: true, message: data.message });
      } else {
        setCloudTestResult({ success: false, message: data.error || 'Erro ao conectar com Alterdata.' });
      }
    } catch (err) {
      setCloudTestResult({ success: false, message: 'Falha de rede ao se comunicar com o backend local.' });
    } finally {
      setIsTestingCloud(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações do Sistema</h1>
          <p className="page-subtitle">Ajuste os parâmetros de importação, rotas físicas locais e a integração direta com a Nuvem Alterdata.</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Settings Form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FolderSync size={20} className="nav-icon" style={{ color: 'var(--accent-light)' }} />
            Parâmetros de Integração
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Toggle Folder Sync */}
            <div className="form-group" style={{ margin: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <label className="switch-label">
                <div>
                  <span className="form-label" style={{ margin: 0, fontWeight: 'bold' }}>1. Sincronização Local (Pasta Física)</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 'normal' }}>
                    Salva os XMLs e PDFs na rede local para a rotina automática clássica do Alterdata Fiscal.
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={enableFolderSync}
                    onChange={(e) => setEnableFolderSync(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </label>
            </div>

            {/* Folder sync dir input (conditional) */}
            {enableFolderSync && (
              <div className="form-group" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-light)', marginBottom: '0.5rem' }}>
                <label className="form-label">Diretório de Destino (Alterdata Sync)</label>
                <input
                  type="text"
                  placeholder="Ex: /home/moises/work/alterdata-sync"
                  className="form-input"
                  value={alterdataDir}
                  onChange={(e) => setAlterdataDir(e.target.value)}
                  required={enableFolderSync}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Caminho da pasta local compartilhada onde o Facilita Contábil estruturará os XMLs.
                </p>
              </div>
            )}

            {/* Toggle Cloud Sync */}
            <div className="form-group" style={{ margin: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <label className="switch-label">
                <div>
                  <span className="form-label" style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    2. Nuvem Alterdata (NF-Stock API)
                    <span style={{ fontSize: '0.65rem', background: 'var(--accent-glow)', color: 'var(--accent-light)', padding: '1px 5px', borderRadius: '4px' }}>DIFERENCIAL</span>
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 'normal' }}>
                    Envia diretamente à nuvem da Alterdata via API. Importa no Fiscal automaticamente de qualquer lugar.
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={enableCloudSync}
                    onChange={(e) => setEnableCloudSync(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </label>
            </div>

            {/* Cloud settings (conditional) */}
            {enableCloudSync && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--success-light)', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">E-mail Cadastrado no NF-Stock</label>
                  <input
                    type="email"
                    placeholder="Ex: escritorio@contabil.com.br"
                    className="form-input"
                    value={nfStockEmail}
                    onChange={(e) => setNfStockEmail(e.target.value)}
                    required={enableCloudSync}
                  />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Token de Integração API / NF-Stock</label>
                  <input
                    type="password"
                    placeholder="Chave secreta obtida no painel Alterdata"
                    className="form-input"
                    value={nfStockToken}
                    onChange={(e) => setNfStockToken(e.target.value)}
                    required={enableCloudSync}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className={`btn btn-secondary ${isTestingCloud ? 'loading' : ''}`}
                    onClick={handleTestCloudConnection}
                    disabled={isTestingCloud}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                  >
                    {isTestingCloud ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <CloudLightning size={14} style={{ color: 'var(--success-light)' }} />
                    )}
                    Testar Conexão Cloud
                  </button>
                </div>

                {cloudTestResult && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    background: cloudTestResult.success ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    borderLeft: `3px solid ${cloudTestResult.success ? 'var(--success)' : 'var(--danger)'}`,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {cloudTestResult.success ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--success-light)', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={16} style={{ color: 'var(--danger-light)', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <span style={{ color: cloudTestResult.success ? 'var(--success-light)' : 'var(--danger-light)' }}>
                      {cloudTestResult.message}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SEFAZ Simulation Toggle & Sync Interval */}
            <div className="form-row" style={{ marginTop: '0.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Intervalo de Busca na SEFAZ</label>
                <select
                  className="form-input"
                  value={autoSyncIntervalMinutes}
                  onChange={(e) => setAutoSyncIntervalMinutes(Number(e.target.value))}
                >
                  <option value={1}>A cada 1 minuto (Testes)</option>
                  <option value={5}>A cada 5 minutos</option>
                  <option value={15}>A cada 15 minutos</option>
                  <option value={30}>A cada 30 minutos</option>
                  <option value={60}>A cada 1 hora</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
                <label className="switch-label" style={{ width: '100%', padding: '0.6rem 0' }}>
                  <div>
                    <span className="form-label" style={{ margin: 0 }}>Simulador SEFAZ</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isSefazSimulation}
                      onChange={(e) => setIsSefazSimulation(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  if (confirm('Deseja limpar todos os logs de sincronização registrados no painel?')) {
                    onClearLogs();
                  }
                }}
                style={{ color: 'var(--danger-light)' }}
              >
                <Trash size={16} />
                Limpar Logs
              </button>
              
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>

        {/* Integration Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Cloud explanation */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-light)' }}>
              <Globe size={20} />
              Vantagens do NF-Stock Cloud Link
            </h3>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                A integração <strong>Alterdata NF-Stock</strong> conecta o Facilita Contábil diretamente à nuvem da Alterdata.
              </p>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Sem fios ou rede local:</strong> As notas de entrada e saída são despachadas via internet direto para o banco de dados Alterdata.</li>
                <li><strong>Multi-computador:</strong> Não importa de onde você acesse o Facilita Contábil, as notas caem direto no Fiscal dos computadores do escritório.</li>
                <li><strong>Segurança:</strong> Backup automático dos XMLs fiscais armazenados na nuvem oficial da Alterdata.</li>
              </ul>
              
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--success-glow)', borderLeft: '3px solid var(--success)', padding: '0.65rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                <Info size={16} style={{ flexShrink: 0, color: 'var(--success-light)', marginTop: '2px' }} />
                <span>
                  <strong>Como ativar:</strong> Obtenha o token de API no seu painel do Alterdata e-Contador / NF-Stock e cole-o nas configurações ao lado.
                </span>
              </div>
            </div>
          </div>

          {/* Folder explanation */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} className="nav-icon" style={{ color: 'var(--warning-light)' }} />
              Como configurar a Pasta Local?
            </h3>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                Se preferir manter a importação por diretório clássico:
              </p>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Abra o <strong>Alterdata Fiscal</strong> &gt; <strong>Área Trabalho</strong> &gt; <strong>Rotinas Automáticas</strong>.</li>
                <li>Defina uma rotina de <strong>Importação de XML</strong> apontando para o mesmo diretório local configurado ao lado.</li>
                <li>O Facilita Contábil se encarrega de organizar tudo nas subpastas e injetar o DANFE em HTML para conferência rápida pelo Windows Explorer.</li>
              </ol>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
