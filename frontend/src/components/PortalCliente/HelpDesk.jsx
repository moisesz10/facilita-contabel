import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Clock, User, HeadphonesIcon } from "lucide-react";

export default function HelpDesk({ companyCnpj, isContador }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  
  // New ticket form
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("contabil");
  const [message, setMessage] = useState("");

  // Reply form
  const [replyMessage, setReplyMessage] = useState("");

  const messagesEndRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const url = isContador && !companyCnpj 
        ? "http://localhost:3001/api/tickets" 
        : `http://localhost:3001/api/tickets?companyCnpj=${companyCnpj}`;
        
      const res = await fetch(url);
      const data = await res.json();
      setTickets(data);
      if (activeTicket) {
        const updated = data.find(t => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [companyCnpj, activeTicket?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCnpj, subject, department, initialMessage: message })
      });
      if (res.ok) {
        const newTicket = await res.json();
        setSubject("");
        setMessage("");
        fetchTickets();
        setActiveTicket(newTicket);
      }
    } catch (err) {
      alert("Erro ao criar chamado");
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      const res = await fetch(`http://localhost:3001/api/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sender: isContador ? 'contador' : 'cliente', 
          text: replyMessage 
        })
      });
      if (res.ok) {
        setReplyMessage("");
        fetchTickets();
      }
    } catch (err) {
      alert("Erro ao enviar mensagem");
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`http://localhost:3001/api/tickets/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTickets();
      }
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 100px)" }}>
      {/* Lista de Chamados */}
      <div className="glass-panel" style={{ width: "350px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
            <HeadphonesIcon className="text-accent" />
            Meus Chamados
          </h2>
          {!isContador && (
            <button 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "1rem", fontSize: "0.85rem" }}
              onClick={() => setActiveTicket(null)}
            >
              + Novo Chamado
            </button>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>Carregando...</div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem", fontSize: "0.85rem" }}>
              Nenhum chamado aberto.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tickets.slice().reverse().map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setActiveTicket(t)}
                  style={{ 
                    padding: "1rem", 
                    borderRadius: "8px", 
                    background: activeTicket?.id === t.id ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.03)",
                    border: activeTicket?.id === t.id ? "1px solid var(--accent-color)" : "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "4px" }}>
                    {t.subject}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Depto: <span style={{ textTransform: "capitalize" }}>{t.department}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ 
                      fontSize: "0.7rem", 
                      padding: "2px 6px", 
                      borderRadius: "12px",
                      background: t.status === 'aberto' ? 'rgba(234, 179, 8, 0.2)' : 
                                 t.status === 'fechado' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: t.status === 'aberto' ? '#facc15' : 
                             t.status === 'fechado' ? '#4ade80' : '#60a5fa'
                    }}>
                      {t.status}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={10} /> {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de Visualização/Criação */}
      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeTicket ? (
          /* Formulário de Novo Chamado */
          <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
            <h3 style={{ marginBottom: "1.5rem", color: "var(--text-primary)" }}>Abrir Novo Chamado</h3>
            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Departamento</label>
                <select className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="contabil">Contábil (Impostos, Balanços)</option>
                  <option value="fiscal">Fiscal (Notas, Guias)</option>
                  <option value="societario">Societário (Alteração Contratual, Alvará)</option>
                  <option value="dp">Departamento Pessoal (Folha, Recibos)</option>
                  <option value="suporte">Suporte Técnico (Sistema)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Assunto</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Dúvida sobre guia do Simples" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mensagem</label>
                <textarea 
                  className="form-input" 
                  rows={6}
                  placeholder="Descreva sua dúvida ou solicitação..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "1rem" }}>
                <Send size={16} /> Enviar Chamado
              </button>
            </form>
          </div>
        ) : (
          /* Visualização e Chat do Chamado */
          <>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>{activeTicket.subject}</h3>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Departamento: <strong style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{activeTicket.department}</strong> | 
                  Empresa CNPJ: <strong>{activeTicket.companyCnpj}</strong>
                </div>
              </div>
              
              {isContador && activeTicket.status !== 'fechado' && (
                <button className="btn btn-danger" onClick={() => handleChangeStatus('fechado')} style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                  Encerrar Chamado
                </button>
              )}
            </div>

            {/* Mensagens */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", background: "rgba(0,0,0,0.2)" }}>
              {activeTicket.messages.map((msg, i) => {
                const isMine = (isContador && msg.sender === 'contador') || (!isContador && msg.sender === 'cliente');
                return (
                  <div key={i} style={{ 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start" 
                  }}>
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--text-muted)", 
                      marginBottom: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      {msg.sender === 'contador' ? <User size={12} color="var(--accent-light)"/> : <Building size={12} color="var(--success-light)"/>}
                      {msg.sender === 'contador' ? 'Contador' : 'Você (Cliente)'} • {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div style={{ 
                      background: isMine ? "var(--accent-color)" : "rgba(255,255,255,0.05)",
                      border: isMine ? "none" : "1px solid var(--border)",
                      color: isMine ? "#fff" : "var(--text-primary)",
                      padding: "1rem",
                      borderRadius: isMine ? "12px 12px 0 12px" : "12px 12px 12px 0",
                      maxWidth: "80%",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.95rem"
                    }}>
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            {activeTicket.status !== 'fechado' ? (
              <form onSubmit={handleReply} style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <textarea 
                    className="form-input" 
                    rows={2}
                    placeholder="Digite sua resposta..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(e);
                      }
                    }}
                    style={{ resize: "none", margin: 0 }}
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.8rem" }}>
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", background: "rgba(0,0,0,0.1)", fontStyle: "italic" }}>
                Este chamado foi encerrado.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
