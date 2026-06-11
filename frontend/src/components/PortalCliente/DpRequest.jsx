import React, { useState, useEffect } from "react";
import { UserPlus, Calendar, Briefcase, FileText, CheckCircle } from "lucide-react";

export default function DpRequest({ companyCnpj }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formulário
  const [type, setType] = useState("admissao");
  const [employeeName, setEmployeeName] = useState("");
  const [details, setDetails] = useState("");

  const fetchRequests = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/dp/requests?companyCnpj=${companyCnpj}`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [companyCnpj]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/dp/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCnpj, type, employeeName, details })
      });
      if (res.ok) {
        setEmployeeName("");
        setDetails("");
        fetchRequests();
        alert("Solicitação enviada com sucesso para o contador!");
      }
    } catch (err) {
      alert("Erro ao enviar solicitação");
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Coluna 1: Formulário */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Briefcase className="text-accent" />
          Nova Solicitação de RH (DP)
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Tipo de Solicitação</label>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="admissao">Nova Admissão (Contratação)</option>
              <option value="ferias">Aviso de Férias</option>
              <option value="rescisao">Aviso de Rescisão (Desligamento)</option>
              <option value="afastamento">Afastamento / Atestado Médico</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nome do Funcionário</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: João da Silva" 
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detalhes Adicionais (Salário, Cargo, Data)</label>
            <textarea 
              className="form-input" 
              rows={4}
              placeholder="Ex: Salário R$ 2.000, Cargo: Vendedor. Contratação para dia 15/06."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
            <CheckCircle size={16} /> Enviar para a Contabilidade
          </button>
        </form>
      </div>

      {/* Coluna 2: Histórico */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <FileText className="text-success" />
          Minhas Solicitações em Andamento
        </h2>

        {loading ? (
          <p>Carregando...</p>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
            Nenhuma solicitação enviada ainda.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {requests.slice().reverse().map(req => (
              <div key={req.id} style={{ 
                background: "rgba(255,255,255,0.05)", 
                border: "1px solid var(--border)", 
                borderRadius: "8px", 
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "var(--accent-light)", textTransform: "uppercase", fontSize: "0.8rem" }}>{req.type}</strong>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    padding: "2px 8px", 
                    borderRadius: "12px",
                    background: req.status === 'pendente' ? 'rgba(234, 179, 8, 0.2)' : 
                               req.status === 'em_analise' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: req.status === 'pendente' ? '#facc15' : 
                           req.status === 'em_analise' ? '#60a5fa' : '#4ade80'
                  }}>
                    {req.status}
                  </span>
                </div>
                <div style={{ fontWeight: "bold" }}>{req.employeeName}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{req.details}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  Enviado em: {new Date(req.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
