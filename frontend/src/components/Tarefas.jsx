import React, { useState } from 'react';
import { Plus, CheckSquare, Square, Trash2, Calendar, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';

export default function Tarefas({ tasks, companies, onAddTask, onToggleTask, onDeleteTask }) {
  const [title, setTitle] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      alert('O título da obrigação é obrigatório!');
      return;
    }
    onAddTask({
      title,
      companyCnpj: companyCnpj || null,
      dueDate: dueDate || null
    });
    // Reset form
    setTitle('');
    setCompanyCnpj('');
    setDueDate('');
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesCompany = !filterCnpj || t.companyCnpj === filterCnpj;
    const matchesStatus = !filterStatus || t.status === filterStatus;
    return matchesCompany && matchesStatus;
  });

  const getCompanyName = (cnpj) => {
    if (!cnpj) return 'Geral (Sem empresa vinculada)';
    const comp = companies.find(c => c.cnpj === cnpj);
    return comp ? comp.razaoSocial : 'Empresa não cadastrada';
  };

  const getDaysRemaining = (dueDateStr) => {
    if (!dueDateStr) return null;
    const diff = new Date(dueDateStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sem data';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tarefas Fiscais (eTarefas)</h1>
          <p className="page-subtitle">Gerencie e acompanhe as obrigações e prazos tributários das empresas.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-icon-container blue">
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="metric-value">{totalTasks}</div>
            <div className="metric-label">Total de Tarefas</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-container red" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#f87171' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="metric-value">{pendingTasks}</div>
            <div className="metric-label">Obrigações Pendentes</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-container green" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#34d399' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{completedTasks}</div>
            <div className="metric-label">Obrigações Concluídas</div>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr', alignItems: 'flex-start' }}>
        {/* Left column: Add task form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Agendar Obrigação</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Título da Obrigação</label>
              <input
                type="text"
                placeholder="Ex: Apuração do Simples Nacional"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Empresa Vinculada</label>
              <select 
                className="form-input" 
                value={companyCnpj} 
                onChange={(e) => setCompanyCnpj(e.target.value)}
              >
                <option value="">Geral / Sem Empresa</option>
                {companies.map(c => (
                  <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data de Vencimento</label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
              <Plus size={16} />
              Criar Tarefa
            </button>
          </form>
        </div>

        {/* Right column: Checklist with filters */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Checklist de Obrigações</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Company filter dropdown */}
              <select 
                className="form-input" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '150px' }}
                value={filterCnpj} 
                onChange={(e) => setFilterCnpj(e.target.value)}
              >
                <option value="">Todas as Empresas</option>
                {companies.map(c => (
                  <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial}</option>
                ))}
              </select>

              {/* Status filter dropdown */}
              <select 
                className="form-input" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '110px' }}
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos Status</option>
                <option value="pending">Pendente</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                Nenhuma tarefa agendada para os filtros selecionados.
              </div>
            ) : (
              filteredTasks.map(task => {
                const daysLeft = getDaysRemaining(task.dueDate);
                const isOverdue = daysLeft !== null && daysLeft < 0 && task.status === 'pending';
                const isNear = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && task.status === 'pending';

                return (
                  <div 
                    key={task.id} 
                    className="file-item" 
                    style={{ 
                      opacity: task.status === 'completed' ? 0.65 : 1,
                      borderLeft: isOverdue 
                        ? '3px solid var(--danger)' 
                        : isNear 
                          ? '3px solid var(--warning)' 
                          : '1px solid var(--border)'
                    }}
                  >
                    <div className="file-info" style={{ gap: '0.75rem', flexGrow: 1 }}>
                      <button 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: task.status === 'completed' ? 'var(--success-light)' : 'var(--text-secondary)' }}
                        onClick={() => onToggleTask(task.id, task.status === 'pending' ? 'completed' : 'pending')}
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                      
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: '600', 
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          color: task.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)'
                        }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {getCompanyName(task.companyCnpj)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {task.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: isOverdue ? 'var(--danger-light)' : isNear ? 'var(--warning-light)' : 'var(--text-secondary)' }}>
                          <Calendar size={13} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      )}

                      <button 
                        className="btn-icon" 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => {
                          if (confirm('Excluir esta obrigação fiscal?')) {
                            onDeleteTask(task.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
