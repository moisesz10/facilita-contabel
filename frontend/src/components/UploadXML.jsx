import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ListRestart,
} from "lucide-react";

export default function UploadXML({ companies, onUploadXmls }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const addFiles = (fileList) => {
    const xmlFiles = Array.from(fileList).filter((file) => {
      const isXml =
        file.name.endsWith(".xml") ||
        file.type === "text/xml" ||
        file.type === "application/xml";
      if (!isXml) {
        alert(`O arquivo ${file.name} foi recusado pois não é um arquivo XML.`);
      }
      return isXml;
    });

    // Merge without duplicates based on name
    setSelectedFiles((prev) => {
      const merged = [...prev];
      xmlFiles.forEach((file) => {
        if (!merged.some((f) => f.name === file.name)) {
          merged.push(file);
        }
      });
      return merged;
    });
  };

  const removeFile = (name) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadResults(null);
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadResults(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("xmlFiles", file);
    });

    const results = await onUploadXmls(formData);
    setIsUploading(false);

    if (results) {
      setUploadResults(results);
      if (results.imported > 0) {
        setSelectedFiles([]); // clear files only on successful import
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Importação Manual de XMLs</h1>
          <p className="page-subtitle">
            Importe notas emitidas ou recebidas externamente arrastando os
            arquivos XML diretamente aqui.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Side: Upload Zone */}
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            Carregar Arquivos XML
          </h3>

          <div
            className={`dropzone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud className="dropzone-icon" />
            <div>
              <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                Arraste os arquivos XML aqui
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                ou clique para navegar no seu computador
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".xml"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Arquivos Selecionados ({selectedFiles.length})
                </h4>
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={clearAllFiles}
                  title="Limpar Lista"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div
                className="file-list"
                style={{ maxHeight: "250px", overflowY: "auto" }}
              >
                {selectedFiles.map((file) => (
                  <div key={file.name} className="file-item">
                    <div className="file-info">
                      <FileCode
                        size={18}
                        style={{ color: "var(--accent-light)" }}
                      />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      className="btn-icon"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                      }}
                      onClick={() => removeFile(file.name)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: "1.5rem",
                  justifyContent: "center",
                }}
                onClick={handleUploadSubmit}
                disabled={isUploading}
              >
                {isUploading
                  ? "Processando XMLs..."
                  : "Processar e Enviar ao Alterdata"}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Upload Results Details */}
        <div className="glass-panel">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.1rem",
              marginBottom: "1.5rem",
            }}
          >
            Resultado da Importação
          </h3>

          {uploadResults ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div style={{ display: "flex", gap: "1rem" }}>
                <div
                  style={{
                    flex: "1",
                    padding: "1rem",
                    background: "var(--success-glow)",
                    border: "1px solid rgba(52, 211, 153, 0.2)",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "var(--success-light)",
                    }}
                  >
                    {uploadResults.imported}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.25rem",
                    }}
                  >
                    XMLs Importados
                  </div>
                </div>
                <div
                  style={{
                    flex: "1",
                    padding: "1rem",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    {uploadResults.ignored}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.25rem",
                    }}
                  >
                    XMLs Rejeitados
                  </div>
                </div>
              </div>

              {uploadResults.errors.length > 0 && (
                <div>
                  <h4
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <AlertCircle
                      size={14}
                      style={{ color: "var(--danger-light)" }}
                    />
                    Erros / Avisos Detalhados
                  </h4>
                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      paddingRight: "0.5rem",
                    }}
                  >
                    {uploadResults.errors.map((err, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.75rem",
                          background: "rgba(220, 38, 38, 0.05)",
                          borderLeft: "3px solid var(--danger)",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadResults.imported > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    color: "var(--success-light)",
                    fontSize: "0.85rem",
                    background: "var(--success-glow)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    As notas importadas foram enviadas e organizadas na pasta do
                    Alterdata automaticamente!
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "220px",
                color: "var(--text-secondary)",
                textAlign: "center",
              }}
            >
              <ListRestart
                size={32}
                style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }}
              />
              <p style={{ fontSize: "0.9rem" }}>
                Nenhum lote de importação manual processado recentemente.
              </p>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                  maxWidth: "300px",
                }}
              >
                Os XMLs importados manualmente são validados em tempo real
                contra as empresas contábeis cadastradas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
