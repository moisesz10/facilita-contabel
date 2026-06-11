import React, { useState, useEffect } from "react";
import {
  Building2,
  FileText,
  UploadCloud,
  Settings,
  LayoutDashboard,
  Server,
  CloudLightning,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import Dashboard from "./components/Dashboard";
import Empresas from "./components/Empresas";
import NotasFiscais from "./components/NotasFiscais";
import UploadXML from "./components/UploadXML";
import Configuracoes from "./components/Configuracoes";
import Tarefas from "./components/Tarefas";
import Login from "./components/Login";

import GestaoDp from "./components/PainelContador/GestaoDp";
import DashboardEmpresa from "./components/PortalCliente/DashboardEmpresa";
import DpRequest from "./components/PortalCliente/DpRequest";
import HelpDesk from "./components/PortalCliente/HelpDesk";
import { HeadphonesIcon, Users } from "lucide-react";

const API_BASE = "http://localhost:3001/api";

export default function App() {
  const [auth, setAuth] = useState(null); // { role: 'contador' | 'empresa', company?: {...} }
  const [activeTab, setActiveTab] = useState("dashboard");
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAllData = async () => {
    try {
      setErrorMsg("");
      // Fetch companies first
      const compRes = await fetch(`${API_BASE}/companies`);
      if (!compRes.ok) throw new Error("Failed to fetch companies");
      const compData = await compRes.json();
      setCompanies(compData);

      // Set default company filter to first company if available
      const defaultCnpj = compData.length > 0 ? compData[0].cnpj : "";
      setFilterCompany(defaultCnpj);

      // Fetch invoices for default company
      const invoiceUrl = defaultCnpj
        ? `${API_BASE}/invoices?companyCnpj=${encodeURIComponent(defaultCnpj)}`
        : `${API_BASE}/invoices`;
      const invRes = await fetch(invoiceUrl);
      if (!invRes.ok) throw new Error("Failed to fetch invoices");
      const invData = await invRes.json();

      // Fetch other data in parallel
      const [logsRes, setRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/logs`),
        fetch(`${API_BASE}/settings`),
        fetch(`${API_BASE}/tasks`),
      ]);

      if (!logsRes.ok || !setRes.ok || !tasksRes.ok) {
        throw new Error("Failed to fetch auxiliary data");
      }

      const logsData = await logsRes.json();
      const setData = await setRes.json();
      const tasksData = await tasksRes.json();

      setInvoices(invData);
      setLogs(logsData);
      setSettings(setData);
      setTasks(tasksData);
      setIsConnected(true);
    } catch (err) {
      console.error(err);
      setIsConnected(false);
      setErrorMsg(
        "Não foi possível conectar ao servidor local. Certifique-se de que o backend está rodando na porta 3001.",
      );
    }
  };

  useEffect(() => {
    fetchAllData();
    // Poll logs, invoice and task updates every 5 seconds to keep dashboard live
    const pollInterval = setInterval(() => {
      if (isConnected) {
        fetch(`${API_BASE}/invoices`)
          .then((res) => res.json())
          .then(setInvoices)
          .catch(console.error);
        fetch(`${API_BASE}/logs`)
          .then((res) => res.json())
          .then(setLogs)
          .catch(console.error);
        fetch(`${API_BASE}/tasks`)
          .then((res) => res.json())
          .then(setTasks)
          .catch(console.error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isConnected]);

  const handleAddCompany = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: "POST",
        body: formData, // multipart/form-data
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      } else {
        const err = await res.json();
        alert(`Erro ao salvar empresa: ${err.error || "Erro desconhecido"}`);
        return false;
      }
    } catch (err) {
      alert("Erro de conexão ao salvar empresa.");
      return false;
    }
  };

  const handleDeleteCompany = async (cnpj) => {
    try {
      const res = await fetch(`${API_BASE}/companies/${cnpj}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        alert("Erro ao excluir empresa.");
      }
    } catch (err) {
      alert("Erro de conexão ao excluir empresa.");
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      alert("Erro de conexão ao salvar obrigação.");
    }
  };

  const handleToggleTask = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      alert("Erro de conexão ao atualizar tarefa.");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      alert("Erro de conexão ao remover tarefa.");
    }
  };

  const handleFetchSefazManual = async (cnpj) => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/sefaz/fetch/${cnpj}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAllData();
        if (data.count > 0) {
          alert(
            `Sucesso! Encontradas ${data.count} novas notas e enviadas ao Alterdata.`,
          );
        } else {
          alert("Consulta concluída. Nenhuma nova nota fiscal disponível.");
        }
      } else {
        const err = await res.json();
        alert(`Erro na busca SEFAZ: ${err.error || "Erro interno"}`);
      }
    } catch (err) {
      alert("Erro de conexão ao consultar SEFAZ.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    let totalCount = 0;
    try {
      for (const comp of companies.filter(
        (c) => c.activeSync && (c.certValid || settings?.isSefazSimulation),
      )) {
        const res = await fetch(`${API_BASE}/sefaz/fetch/${comp.cnpj}`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          totalCount += data.count;
        }
      }
      await fetchAllData();
      alert(
        `Varredura completa concluída! Total de novas notas importadas: ${totalCount}`,
      );
    } catch (err) {
      alert("Erro durante a varredura automática em lote.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncInvoice = async (chave) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAllData();
        if (data.success) {
          alert("Nota sincronizada e exportada para o Alterdata com sucesso!");
        } else {
          alert(
            "A exportação falhou. Verifique se o diretório do Alterdata está configurado corretamente.",
          );
        }
      }
    } catch (err) {
      alert("Erro de conexão ao sincronizar nota.");
    }
  };

  const handleUploadXmls = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const results = await res.json();
        await fetchAllData();
        return results;
      } else {
        const err = await res.json();
        alert(`Erro ao processar lote de XMLs: ${err.error || "Erro interno"}`);
        return null;
      }
    } catch (err) {
      alert("Erro de conexão ao enviar XMLs.");
      return null;
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        await fetchAllData();
        alert("Configurações salvas e aplicadas!");
      } else {
        alert("Erro ao salvar configurações.");
      }
    } catch (err) {
      alert("Erro de conexão ao salvar configurações.");
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs/clear`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <AlertTriangle
            size={64}
            style={{ color: "var(--warning-light)", marginBottom: "1.5rem" }}
          />
          <h2
            style={{ fontFamily: "var(--font-display)", marginBottom: "1rem" }}
          >
            Erro de Conexão com a API
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: "500px",
              lineHeight: "1.6",
              marginBottom: "2rem",
            }}
          >
            {errorMsg ||
              "Aguardando inicialização do servidor backend do Facilita Contábil..."}
          </p>
          <button className="btn btn-primary" onClick={fetchAllData}>
            <Server size={18} />
            Tentar Reconectar
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return auth.role === "contador" ? (
          <Dashboard
            companies={companies}
            invoices={invoices}
            logs={logs}
            tasks={tasks}
            settings={settings}
            onFetchAll={fetchAllData}
            isScanning={isScanning}
            onScanAll={handleScanAll}
          />
        ) : (
          <DashboardEmpresa companyCnpj={auth.company.cnpj} />
        );
      case "companies":
        return (
          <Empresas
            companies={companies}
            onAddCompany={handleAddCompany}
            onDeleteCompany={handleDeleteCompany}
            onFetchSefazManual={handleFetchSefazManual}
            isScanning={isScanning}
          />
        );
      case "invoices":
        return (
          <NotasFiscais
            invoices={invoices}
            companies={companies}
            onSyncInvoice={handleSyncInvoice}
          />
        );
      case "tasks":
        return (
          <Tarefas
            tasks={tasks}
            companies={companies}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case "upload":
        return (
          <UploadXML companies={companies} onUploadXmls={handleUploadXmls} />
        );
      case "settings":
        return (
          <Configuracoes
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearLogs={handleClearLogs}
          />
        );
      case "dp":
        return auth.role === "contador" ? <GestaoDp /> : <DpRequest companyCnpj={auth.company.cnpj} />;
      case "helpdesk":
        return <HelpDesk companyCnpj={auth.role === "empresa" ? auth.company.cnpj : null} isContador={auth.role === "contador"} />;
      default:
        return <div>Página não encontrada</div>;
    }
  };

  if (!auth) {
    return <Login onLogin={setAuth} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-container">
          <div className="brand-icon">
            <CloudLightning size={24} style={{ color: "white" }} />
          </div>
          <div>
            <div className="brand-title">Facilita</div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                fontWeight: "600",
                letterSpacing: "0.05em",
                marginTop: "-2px",
              }}
            >
              CONTÁBIL
            </div>
          </div>
        </div>

        <nav className="nav-menu">
          {auth.role === "contador" ? (
            <>
              <div
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard className="nav-icon" />
                <span>Dashboard</span>
              </div>

              <div
                className={`nav-item ${activeTab === "companies" ? "active" : ""}`}
                onClick={() => setActiveTab("companies")}
              >
                <Building2 className="nav-icon" />
                <span>Empresas</span>
              </div>

              <div
                className={`nav-item ${activeTab === "invoices" ? "active" : ""}`}
                onClick={() => setActiveTab("invoices")}
              >
                <FileText className="nav-icon" />
                <span>Notas Fiscais</span>
              </div>

              <div
                className={`nav-item ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => setActiveTab("upload")}
              >
                <UploadCloud className="nav-icon" />
                <span>Importar XML</span>
              </div>

              <div
                className={`nav-item ${activeTab === "tasks" ? "active" : ""}`}
                onClick={() => setActiveTab("tasks")}
              >
                <ClipboardList className="nav-icon" />
                <span>Gestão de Tarefas</span>
              </div>

              <div
                className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="nav-icon" />
                <span>Configurações</span>
              </div>

              <div className="nav-divider" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.5rem 0" }} />
              
              <div
                className={`nav-item ${activeTab === "dp" ? "active" : ""}`}
                onClick={() => setActiveTab("dp")}
              >
                <Users className="nav-icon" style={{ color: "var(--accent-light)" }} />
                <span>Gestão DP</span>
              </div>

              <div
                className={`nav-item ${activeTab === "helpdesk" ? "active" : ""}`}
                onClick={() => setActiveTab("helpdesk")}
              >
                <HeadphonesIcon className="nav-icon" style={{ color: "var(--success-light)" }} />
                <span>Chamados</span>
              </div>
            </>
          ) : (
            <>
              {/* Menu da Empresa (Portal do Cliente) */}
              <div
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard className="nav-icon" />
                <span>Meu Painel</span>
              </div>
              <div
                className={`nav-item ${activeTab === "invoices" ? "active" : ""}`}
                onClick={() => setActiveTab("invoices")}
              >
                <FileText className="nav-icon" />
                <span>Minhas Notas</span>
              </div>

              <div className="nav-divider" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.5rem 0" }} />
              
              <div
                className={`nav-item ${activeTab === "dp" ? "active" : ""}`}
                onClick={() => setActiveTab("dp")}
              >
                <Users className="nav-icon" />
                <span>RH / DP</span>
              </div>

              <div
                className={`nav-item ${activeTab === "helpdesk" ? "active" : ""}`}
                onClick={() => setActiveTab("helpdesk")}
              >
                <HeadphonesIcon className="nav-icon" />
                <span>Atendimento</span>
              </div>
            </>
          )}
        </nav>

        <div style={{ padding: "1rem", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Logado como:<br/>
          <strong style={{ color: "white" }}>
            {auth.role === "contador" ? "Escritório Contábil" : auth.company?.razaoSocial}
          </strong>
          <div style={{ marginTop: "0.5rem" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setAuth(null); }} style={{ color: "var(--danger-light)" }}>Sair</a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <AlertTriangle size={18} />
            {errorMsg}
          </div>
        )}
        {renderTab()}
      </main>
    </div>
  );
}
