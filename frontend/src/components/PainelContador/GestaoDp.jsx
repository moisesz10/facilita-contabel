import React, { useState, useEffect } from "react";
import { Users, CheckCircle, Clock } from "lucide-react";

export default function GestaoDp() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/dp/requests");
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
    const interval = setInterval(fetchRequests, 10000); // Polling 10s
    return () => clearInterval(interval);
  }, []);

  const handleChangeStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/api/dp/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users className="text-accent" />
          Solicitações de RH (Clientes)
        </h2>
        <button className="btn btn-secondary" onClick={fetchRequests}>Atualizar</button>
      </div>

      {loading ? (
        <div>Carregando solicitações...</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Nenhuma solicitação de DP recebida até o momento.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Empresa (CNPJ)</th>
                <th>Tipo</th>
                <th>Funcionário</th>
                <th>Detalhes</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice().reverse().map((req) => (
                <tr key={req.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>{req.companyCnpj}</td>
                  <td style={{ textTransform: "uppercase", fontWeight: "bold", fontSize: "0.85rem" }}>{req.type}</td>
                  <td>{req.employeeName}</td>
                  <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.details}>
                    {req.details}
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {req.status === 'pendente' && (
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleChangeStatus(req.id, 'em_analise')}>
                          <Clock size={12} style={{ marginRight: "4px" }} /> Analisar
                        </button>
                      )}
                      {req.status !== 'concluido' && (
                        <button className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "var(--success)" }} onClick={() => handleChangeStatus(req.id, 'concluido')}>
                          <CheckCircle size={12} style={{ marginRight: "4px" }} /> Concluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
