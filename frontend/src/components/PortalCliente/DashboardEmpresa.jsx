import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";

export default function DashboardEmpresa({ companyCnpj }) {
  const [metrics, setMetrics] = useState({
    saidas: 0,
    entradas: 0,
    impostoEstimado: 0,
    topPartners: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/dashboard");
        const data = await res.json();
        
        // Filter the aggregated data for this specific company
        const myData = data.companies.find(c => c.cnpj === companyCnpj);
        if (myData) {
          setMetrics({
            saidas: myData.saidas,
            entradas: myData.entradas,
            impostoEstimado: myData.impostoEstimado,
            topPartners: myData.topPartners || []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [companyCnpj]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--text-muted)", textAlign: "center" }}>Carregando painel financeiro...</div>;
  }

  return (
    <div className="dashboard-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.2)", color: "#4ade80" }}>
          <TrendingUp size={24} />
        </div>
        <div className="stat-info">
          <div className="stat-label">Faturamento Mensal (Saídas)</div>
          <div className="stat-value">{formatCurrency(metrics.saidas)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>
          <TrendingDown size={24} />
        </div>
        <div className="stat-info">
          <div className="stat-label">Despesas NF-e (Entradas)</div>
          <div className="stat-value">{formatCurrency(metrics.entradas)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(234, 179, 8, 0.2)", color: "#facc15" }}>
          <DollarSign size={24} />
        </div>
        <div className="stat-info">
          <div className="stat-label">Previsão de Impostos (10%)</div>
          <div className="stat-value">{formatCurrency(metrics.impostoEstimado)}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Users className="text-accent" />
          Top 5 Parceiros Comerciais
        </h2>
        
        {metrics.topPartners.length === 0 ? (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "1rem" }}>
            Sem dados suficientes.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {metrics.topPartners.map((p, idx) => (
              <div key={idx} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "0.75rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border)"
              }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>{p.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.cnpj}</div>
                </div>
                <div style={{ fontWeight: "600", color: p.type === 'saida' ? 'var(--success-light)' : 'var(--danger-light)' }}>
                  {formatCurrency(p.totalValue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
