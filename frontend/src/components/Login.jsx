import React, { useState } from "react";
import { Lock, User, Building, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login({ onLogin }) {
  const [isContador, setIsContador] = useState(true);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          password,
          isContador,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data);
      } else {
        setError(data.error || "Credenciais inválidas");
      }
    } catch (err) {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-color)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "60vw",
          height: "60vw",
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          opacity: 0.5,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, transparent 70%)",
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2.5rem",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, var(--accent-light), var(--accent-color))",
              boxShadow: "0 10px 20px rgba(99, 102, 241, 0.3)",
              marginBottom: "1rem",
            }}
          >
            <ShieldCheck size={32} color="#ffffff" />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              margin: 0,
              background: "linear-gradient(to right, #ffffff, var(--text-muted))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Facilita Contábil
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Plataforma de Relacionamento e Automação
          </p>
        </div>

        {/* Toggle Perfis */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "4px",
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsContador(true);
              setError("");
              setLogin("");
              setPassword("");
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.6rem",
              borderRadius: "6px",
              border: "none",
              background: isContador ? "var(--bg-light)" : "transparent",
              color: isContador ? "var(--accent-light)" : "var(--text-muted)",
              fontWeight: isContador ? "bold" : "normal",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: isContador ? "0 2px 5px rgba(0,0,0,0.2)" : "none",
            }}
          >
            <User size={16} />
            Escritório
          </button>
          <button
            type="button"
            onClick={() => {
              setIsContador(false);
              setError("");
              setLogin("");
              setPassword("");
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.6rem",
              borderRadius: "6px",
              border: "none",
              background: !isContador ? "var(--bg-light)" : "transparent",
              color: !isContador ? "var(--success-light)" : "var(--text-muted)",
              fontWeight: !isContador ? "bold" : "normal",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: !isContador ? "0 2px 5px rgba(0,0,0,0.2)" : "none",
            }}
          >
            <Building size={16} />
            Cliente (Empresa)
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {!isContador && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ color: "var(--text-primary)" }}>
                CNPJ da Empresa
              </label>
              <input
                type="text"
                placeholder="Ex: 12.345.678/0001-99"
                className="form-input"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required={!isContador}
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ color: "var(--text-primary)" }}>
              {isContador ? "Senha de Acesso (Escritório)" : "Senha do Portal"}
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="password"
                placeholder="Sua senha..."
                className="form-input"
                style={{ paddingLeft: "36px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                color: "var(--danger-light)",
                background: "rgba(220, 38, 38, 0.1)",
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center",
                border: "1px solid rgba(220, 38, 38, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: "0.85rem",
              marginTop: "0.5rem",
              display: "flex",
              justifyContent: "center",
              background: isContador
                ? "linear-gradient(to right, var(--accent-color), var(--accent-light))"
                : "linear-gradient(to right, var(--success), var(--success-light))",
            }}
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
            {!loading && <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-0.5rem" }}>
          {isContador
            ? "Acesso restrito à equipe do escritório contábil."
            : "Acesso restrito a clientes cadastrados pelo contador."}
        </div>
      </div>
    </div>
  );
}
