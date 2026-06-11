import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Key,
  UploadCloud,
  RefreshCw,
  FileWarning,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { formatCnpj, getDaysRemaining } from "../utils/format";


export default function Empresas({
  companies,
  onAddCompany,
  onDeleteCompany,
  onFetchSefazManual,
  isScanning,
}) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: "",
    razaoSocial: "",
    uf: "SP",
    password: "",
    activeSync: true,
    ie: "",
    im: "",
    naturezaJuridica: "",
    tributacao: "Simples Nacional",
    regime: "ME",
    dataAbertura: "",
    logradouro: "",
    numero: "",
    bairro: "",
    municipio: "",
    cep: "",
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format CNPJ as typing: 00.000.000/0000-00
  const handleCnpjChange = async (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue.length > 14) rawValue = rawValue.slice(0, 14);

    // Apply formatting
    let formattedValue = rawValue;
    if (rawValue.length > 12) {
      formattedValue = rawValue.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,
        "$1.$2.$3/$4-$5",
      );
    } else if (rawValue.length > 8) {
      formattedValue = rawValue.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})/,
        "$1.$2.$3/$4",
      );
    } else if (rawValue.length > 5) {
      formattedValue = rawValue.replace(/^(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
    } else if (rawValue.length > 2) {
      formattedValue = rawValue.replace(/^(\d{2})(\d{3})/, "$1.$2");
    }

    setFormData((prev) => ({ ...prev, cnpj: formattedValue }));

    if (rawValue.length === 14) {
      try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${rawValue}`,
        );
        if (response.ok) {
          const data = await response.json();
          setFormData((prev) => ({
            ...prev,
            razaoSocial:
              data.razao_social || data.nome_fantasia || prev.razaoSocial,
            uf: data.uf || prev.uf,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CNPJ na BrasilAPI:", err);
      }
    }
  };

  // Format CEP as typing: 00000-000
  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d{3})/, '$1-$2');
    }
    setFormData({ ...formData, cep: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCertificateFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cnpj || !formData.razaoSocial) {
      alert("CNPJ e Razão Social são obrigatórios!");
      return;
    }

    setIsSubmitting(true);

    const submitData = new FormData();
    submitData.append("cnpj", formData.cnpj.replace(/\D/g, ""));
    submitData.append("razaoSocial", formData.razaoSocial);
    submitData.append("uf", formData.uf);
    submitData.append("password", formData.password);
    submitData.append("activeSync", formData.activeSync);
    submitData.append("ie", formData.ie);
    submitData.append("im", formData.im);
    submitData.append("naturezaJuridica", formData.naturezaJuridica);
    submitData.append("tributacao", formData.tributacao);
    submitData.append("regime", formData.regime);
    submitData.append("dataAbertura", formData.dataAbertura);
    submitData.append("logradouro", formData.logradouro);
    submitData.append("numero", formData.numero);
    submitData.append("bairro", formData.bairro);
    submitData.append("municipio", formData.municipio);
    submitData.append("cep", formData.cep.replace(/\D/g, ""));
    if (certificateFile) {
      submitData.append("certificate", certificateFile);
    }

    const success = await onAddCompany(submitData);
    setIsSubmitting(false);

    if (success) {
      setShowModal(false);
      setFormData({
        cnpj: "",
        razaoSocial: "",
        uf: "SP",
        password: "",
        activeSync: true,
        ie: "",
        im: "",
        naturezaJuridica: "",
        tributacao: "Simples Nacional",
        regime: "ME",
        dataAbertura: "",
        logradouro: "",
        numero: "",
        bairro: "",
        municipio: "",
        cep: "",
      });
      setCertificateFile(null);
    }
  };


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerenciar Empresas</h1>
          <p className="page-subtitle">
            Cadastre e monitore os dados fiscais e certificados digitais dos
            clientes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Nova Empresa
        </button>
      </div>

      {/* Companies Panel */}
      <div className="glass-panel">
        {companies.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3.5rem 1.5rem",
              color: "var(--text-secondary)",
            }}
          >
            <Building2
              size={48}
              style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
            />
            <h3>Nenhuma empresa cadastrada</h3>
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Adicione sua primeira empresa clicando no botão "Nova Empresa" no
              canto superior.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Razão Social / CNPJ</th>
                  <th>UF</th>
                  <th>Certificado Digital A1</th>
                  <th>Validade Certificado</th>
                  <th>Consulta Auto.</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((comp) => {
                  const daysLeft = getDaysRemaining(comp.certExpiration);

                  return (
                    <tr key={comp.cnpj}>
                      <td>
                        <div style={{ fontWeight: "600" }}>
                          {comp.razaoSocial}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {formatCnpj(comp.cnpj)}
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge badge-secondary"
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            color: "white",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {comp.uf}
                        </span>
                      </td>
                      <td>
                        {comp.certName ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              color: "var(--success-light)",
                              fontSize: "0.9rem",
                            }}
                          >
                            <ShieldCheck size={16} />
                            <span>
                              {comp.certName.substring(0, 25)}
                              {comp.certName.length > 25 ? "..." : ""}
                            </span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              color: "var(--text-muted)",
                              fontSize: "0.9rem",
                            }}
                          >
                            <EyeOff size={16} />
                            <span>Não Cadastrado</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {daysLeft !== null ? (
                          daysLeft > 30 ? (
                            <span className="badge badge-success">
                              Ativo ({daysLeft} dias)
                            </span>
                          ) : daysLeft > 0 ? (
                            <span
                              className="badge badge-warning"
                              style={{
                                display: "inline-flex",
                                gap: "0.25rem",
                                alignItems: "center",
                              }}
                            >
                              <FileWarning size={12} />
                              Expira em {daysLeft}d
                            </span>
                          ) : (
                            <span className="badge badge-danger">Expirado</span>
                          )
                        ) : (
                          <span
                            className="badge badge-danger"
                            style={{
                              background: "rgba(220, 38, 38, 0.08)",
                              color: "var(--danger-light)",
                            }}
                          >
                            Pendente
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${comp.activeSync ? "badge-success" : "badge-warning"}`}
                        >
                          {comp.activeSync ? "Ativa" : "Pausada"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            title="Buscar novas notas na SEFAZ"
                            className="btn btn-secondary btn-icon"
                            onClick={() => onFetchSefazManual(comp.cnpj)}
                            disabled={isScanning}
                            style={{ padding: "0.4rem" }}
                          >
                            <RefreshCw
                              size={15}
                              className={isScanning ? "spin" : ""}
                            />
                          </button>
                          <button
                            title="Excluir Empresa"
                            className="btn btn-danger btn-icon"
                            onClick={() => {
                              if (
                                confirm(
                                  `Deseja realmente excluir a empresa ${comp.razaoSocial}? Todos os XMLs de notas e logs vinculados serão deletados.`,
                                )
                              ) {
                                onDeleteCompany(comp.cnpj);
                              }
                            }}
                            style={{ padding: "0.4rem" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Key
                  size={20}
                  className="nav-icon"
                  style={{ color: "var(--accent-light)" }}
                />
                Cadastrar Nova Empresa
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">CNPJ da Empresa</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  className="form-input"
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Razão Social</label>
                <input
                  type="text"
                  placeholder="Nome da Empresa Contábil Ltda"
                  className="form-input"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  required
                />
              </div>

              {/* Registration Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    placeholder="Isento ou Nº"
                    className="form-input"
                    value={formData.ie}
                    onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Municipal (IM)</label>
                  <input
                    type="text"
                    placeholder="Nº de Registro IM"
                    className="form-input"
                    value={formData.im}
                    onChange={(e) => setFormData({ ...formData, im: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Regime Tributário</label>
                  <select
                    className="form-input"
                    value={formData.tributacao}
                    onChange={(e) => setFormData({ ...formData, tributacao: e.target.value })}
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Regime Especial / Porte</label>
                  <select
                    className="form-input"
                    value={formData.regime}
                    onChange={(e) => setFormData({ ...formData, regime: e.target.value })}
                  >
                    <option value="MEI">MEI</option>
                    <option value="ME">ME</option>
                    <option value="EPP">EPP</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Natureza Jurídica</label>
                  <input
                    type="text"
                    placeholder="Ex: 206-2 - Sociedade Limitada"
                    className="form-input"
                    value={formData.naturezaJuridica}
                    onChange={(e) => setFormData({ ...formData, naturezaJuridica: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Abertura</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dataAbertura}
                    onChange={(e) => setFormData({ ...formData, dataAbertura: e.target.value })}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0', paddingTop: '0.75rem' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Endereço da Empresa
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      className="form-input"
                      value={formData.cep}
                      onChange={handleCepChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Logradouro / Rua</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua Oscar Freire"
                      className="form-input"
                      value={formData.logradouro}
                      onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 123"
                      className="form-input"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Pinheiros"
                      className="form-input"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Cidade / Município</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      className="form-input"
                      value={formData.municipio}
                      onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">UF (Estado)</label>
                    <select
                      className="form-input"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    >
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0', paddingTop: '0.75rem' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Certificado Digital A1 (.pfx ou .p12)
                </h4>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    <div
                      className="dropzone"
                      style={{
                        padding: "1.5rem 1rem",
                        borderStyle: "dashed",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <UploadCloud className="dropzone-icon" size={32} />
                      <span style={{ fontSize: "0.85rem" }}>
                        {certificateFile
                          ? certificateFile.name
                          : "Selecionar Certificado Digital A1"}
                      </span>
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Senha do Certificado</label>
                  <input
                    type="password"
                    placeholder="Insira a senha do arquivo"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="switch-label">
                  <span className="form-label" style={{ margin: 0 }}>
                    Habilitar Consulta Automática na SEFAZ
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={formData.activeSync}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          activeSync: e.target.checked,
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "1.5rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : "Salvar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

