import React, { useEffect, useState } from "react";
import {
  Building2,
  FileCheck2,
  AlertCircle,
  RefreshCw,
  FileCode,
  CheckCircle2,
  History,
  TrendingUp,
  ShieldCheck,
  ClipboardCheck,
  Cloud,
  Globe,
} from "lucide-react";

export default function Dashboard({
  companies,
  invoices,
  logs,
  tasks = [],
  settings = {},
  onFetchAll,
  isScanning,
  onScanAll,
}) {
  const [metrics, setMetrics] = useState({
    totalCompanies: 0,
    validCertificates: 0,
    syncedInvoices: 0,
    pendingTasks: 0,
  });

  const [taxIndicators, setTaxIndicators] = useState({
    faturamento: 0,
    pis: 0,
    cofins: 0,
    icms: 0,
    totalTaxes: 0,
  });

  useEffect(() => {
    const total = companies.length;
    const validCerts = companies.filter((c) => c.certValid).length;
    const synced = invoices.filter((i) => i.syncStatus === "synced").length;
    const pendingT = tasks.filter((t) => t.status === "pending").length;

    setMetrics({
      totalCompanies: total,
      validCertificates: validCerts,
      syncedInvoices: synced,
      pendingTasks: pendingT,
    });

    // Calculate tax indicators from saida invoices of the current month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
    const periodStr = `${currentYear}-${currentMonth}`;

    const monthlySaidas = invoices.filter(
      (inv) => inv.type === "saida" && inv.date.startsWith(periodStr),
    );

    const faturamentoVal = monthlySaidas.reduce(
      (sum, inv) => sum + inv.value,
      0,
    );
    const pisVal = faturamentoVal * 0.0165;
    const cofinsVal = faturamentoVal * 0.076;
    const icmsVal = faturamentoVal * 0.18;
    const totalTaxesVal = pisVal + cofinsVal + icmsVal;

    setTaxIndicators({
      faturamento: faturamentoVal,
      pis: pisVal,
      cofins: cofinsVal,
      icms: icmsVal,
      totalTaxes: totalTaxesVal,
    });
  }, [companies, invoices, tasks]);

  // Aggregate invoice data for last 7 days chart
  const getChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map((dateStr) => {
      const formattedDate = dateStr.split("-").reverse().slice(0, 2).join("/"); // "DD/MM"
      const dailyInvoices = invoices.filter((inv) => inv.date === dateStr);
      const entradaVal = dailyInvoices
        .filter((inv) => inv.type === "entrada")
        .reduce((sum, inv) => sum + inv.value, 0);
      const saidaVal = dailyInvoices
        .filter((inv) => inv.type === "saida")
        .reduce((sum, inv) => sum + inv.value, 0);

      return {
        date: formattedDate,
        rawDate: dateStr,
        entrada: entradaVal,
        saida: saidaVal,
        count: dailyInvoices.length,
      };
    });
  };

  const chartData = getChartData();
  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.entrada, d.saida)),
    1000,
  );

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Mock SEFAZ status for e-Radar widget
  const sefazStates = [
    { name: "SEFAZ Nacional (DFe)", status: "online" },
    { name: "SEFAZ São Paulo", status: "online" },
    { name: "SEFAZ Rio de Janeiro", status: "online" },
    { name: "SEFAZ Minas Gerais", status: "online" },
    { name: "SEFAZ Rio G. do Sul", status: "online" },
  ];

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(
    (t) => t.status === "completed",
  ).length;
  const taskProgressPercent =
    totalTasksCount > 0
      ? Math.round((completedTasksCount / totalTasksCount) * 100)
      : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-subtitle">
            Visão geral do faturamento, obrigações contábeis e status SEFAZ.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className={`btn btn-secondary ${isScanning ? "loading" : ""}`}
            onClick={onFetchAll}
            disabled={isScanning}
          >
            <RefreshCw className={`nav-icon ${isScanning ? "spin" : ""}`} />
            Atualizar Dados
          </button>
          <button
            className="btn btn-primary"
            onClick={onScanAll}
            disabled={isScanning || companies.length === 0}
          >
            <Building2 className="nav-icon" />
            Executar Varredura SEFAZ
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        <div className="metric-card">
          <div className="metric-icon-container blue">
            <Building2 size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.totalCompanies}</div>
            <div className="metric-label">Clientes Cadastrados</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-container green">
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.validCertificates}</div>
            <div className="metric-label">Certificados Ativos</div>
          </div>
        </div>

        <div className="metric-card">
          <div
            className="metric-icon-container green"
            style={{ background: "rgba(5, 150, 105, 0.15)", color: "#34d399" }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.syncedInvoices}</div>
            <div className="metric-label">Notas no Alterdata</div>
          </div>
        </div>

        <div className="metric-card">
          <div
            className="metric-icon-container red"
            style={{
              background:
                metrics.pendingTasks > 0
                  ? "rgba(220, 38, 38, 0.15)"
                  : "rgba(217, 119, 6, 0.1)",
              color: metrics.pendingTasks > 0 ? "#f87171" : "#fbbf24",
            }}
          >
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.pendingTasks}</div>
            <div className="metric-label">Obrigações Fiscais</div>
          </div>
        </div>
      </div>

      {/* eIndicadores & e-Radar Panel */}
      <div
        className="grid-2"
        style={{ gridTemplateColumns: "1.7fr 1.3fr", marginBottom: "2rem" }}
      >
        {/* eIndicadores (Tax estimates) */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <TrendingUp size={20} style={{ color: "var(--success-light)" }} />
            Indicadores do Mês Corrente (eIndicadores)
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.8fr",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "1.25rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <span
                className="metric-label"
                style={{ display: "block", marginBottom: "0.25rem" }}
              >
                Faturamento Mensal
              </span>
              <div
                className="metric-value"
                style={{ color: "white", fontSize: "1.5rem" }}
              >
                {formatCurrency(taxIndicators.faturamento)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  padding: "0.25rem 0",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  ICMS Estimado (18%):
                </span>
                <span style={{ fontWeight: "600" }}>
                  {formatCurrency(taxIndicators.icms)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  padding: "0.25rem 0",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  PIS Estimado (1.65%):
                </span>
                <span style={{ fontWeight: "600" }}>
                  {formatCurrency(taxIndicators.pis)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  padding: "0.25rem 0",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  COFINS Estimado (7.6%):
                </span>
                <span style={{ fontWeight: "600" }}>
                  {formatCurrency(taxIndicators.cofins)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>
                  Total Impostos Federais:
                </span>
                <span style={{ color: "var(--success-light)" }}>
                  {formatCurrency(taxIndicators.totalTaxes)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side widgets stack */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* e-Radar (SEFAZ Status) */}
          <div
            className="glass-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "1.25rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1rem",
              }}
            >
              <ShieldCheck size={18} style={{ color: "var(--accent-light)" }} />
              Monitor SEFAZ (e-Radar)
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {sefazStates.map((state, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.4rem 0.6rem",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem" }}>{state.name}</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.75rem",
                      color: "var(--success-light)",
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{ width: "5px", height: "5px", animation: "none" }}
                    />
                    <span>Estável</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NF-Stock Cloud Link Status */}
          <div
            className="glass-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "1.25rem",
              border: settings?.enableCloudSync
                ? "1px solid rgba(52, 211, 153, 0.15)"
                : "1px solid var(--border)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                color: settings?.enableCloudSync
                  ? "var(--success-light)"
                  : "var(--text-primary)",
              }}
            >
              <Globe size={18} />
              Nuvem Alterdata (NF-Stock)
            </h3>

            {settings?.enableCloudSync ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.4rem 0.6rem",
                    background: "rgba(5, 150, 105, 0.03)",
                    border: "1px solid rgba(5, 150, 105, 0.15)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Status da Conexão:
                  </span>
                  <span
                    style={{
                      color: "var(--success-light)",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: "var(--success-light)",
                        boxShadow: "0 0 6px var(--success-light)",
                      }}
                    />
                    Conectado
                  </span>
                </div>

                <div
                  style={{
                    padding: "0.4rem 0.6rem",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                  >
                    CONTA INTEGRADA
                  </div>
                  <div
                    style={{
                      color: "white",
                      fontWeight: "500",
                      wordBreak: "break-all",
                    }}
                  >
                    {settings.nfStockEmail}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div
                    style={{
                      flex: "1",
                      padding: "0.4rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      NA NUVEM
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        color: "var(--success-light)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {
                        invoices.filter((i) => i.cloudSyncStatus === "synced")
                          .length
                      }
                    </div>
                  </div>
                  <div
                    style={{
                      flex: "1",
                      padding: "0.4rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      FILA CLOUD
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        color: "var(--warning-light)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {
                        invoices.filter((i) => i.cloudSyncStatus === "pending")
                          .length
                      }
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "110px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  gap: "0.4rem",
                }}
              >
                <Cloud size={24} style={{ color: "var(--text-muted)" }} />
                <p style={{ fontSize: "0.75rem", lineHeight: "1.4" }}>
                  Sincronização em nuvem desativada. Ative nas Configurações.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts & Logs Grid */}
      <div className="grid-2">
        {/* Chart Card */}
        <div className="glass-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              Volume de Movimentação (Últimos 7 dias)
            </h3>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background:
                    "linear-gradient(to top, var(--success), var(--success-light))",
                }}
              ></span>
              <span style={{ color: "var(--text-secondary)" }}>
                Entrada (Compras)
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background:
                    "linear-gradient(to top, var(--accent), var(--accent-light))",
                }}
              ></span>
              <span style={{ color: "var(--text-secondary)" }}>
                Saída (Vendas)
              </span>
            </div>
          </div>

          <div className="bar-chart-container">
            {chartData.map((d, index) => {
              const entradaHeight = (d.entrada / maxVal) * 150;
              const saidaHeight = (d.saida / maxVal) * 150;

              return (
                <div key={index} className="bar-column">
                  <div className="chart-tooltip">
                    <div
                      style={{
                        fontWeight: "bold",
                        borderBottom: "1px solid var(--border)",
                        marginBottom: "4px",
                        paddingBottom: "2px",
                      }}
                    >
                      {d.date}
                    </div>
                    <div style={{ color: "var(--success-light)" }}>
                      E: {formatCurrency(d.entrada)}
                    </div>
                    <div style={{ color: "var(--accent-light)" }}>
                      S: {formatCurrency(d.saida)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      gap: "4px",
                      height: "150px",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      className="bar-fill entrada"
                      style={{ height: `${Math.max(entradaHeight, 4)}px` }}
                    />
                    <div
                      className="bar-fill saida"
                      style={{ height: `${Math.max(saidaHeight, 4)}px` }}
                    />
                  </div>
                  <div className="bar-label">{d.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs activity card */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <History size={20} className="nav-icon" />
              Atividade do Sistema
            </h3>

            {totalTasksCount > 0 && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  textAlign: "right",
                }}
              >
                Progresso Obrigações: <strong>{taskProgressPercent}%</strong>
                <div
                  style={{
                    width: "80px",
                    height: "4px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "2px",
                    marginTop: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${taskProgressPercent}%`,
                      height: "100%",
                      background: "var(--success-light)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="log-list" style={{ flexGrow: 1 }}>
            {logs.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Nenhum log registrado até o momento.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="log-item">
                  <div className={`log-type-dot ${log.type}`} />
                  <div className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="log-message">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
