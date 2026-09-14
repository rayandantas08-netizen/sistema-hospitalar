import { useEffect, useState } from 'react';

const initialQueue = [
  { senha: 'A001', nome: 'Paciente em atendimento', prioridade: 'Amarelo', sala: 'Consultório 3', tempo: '60 min' },
  { senha: 'A002', nome: 'Próximo atendimento', prioridade: 'Laranja', sala: 'Sala de Emergência', tempo: '10 min' },
  { senha: 'A003', nome: 'Aguardando chamada', prioridade: 'Vermelho', sala: 'Sala de Emergência', tempo: 'Imediato' },
  { senha: 'A004', nome: 'Aguardando chamada', prioridade: 'Verde', sala: 'Consultório 1', tempo: '120 min' },
  { senha: 'A005', nome: 'Aguardando chamada', prioridade: 'Azul', sala: 'Consultório 2', tempo: '240 min' },
];

const priorityClass: Record<string, string> = {
  Vermelho: 'tv-red', Laranja: 'tv-orange', Amarelo: 'tv-yellow', Verde: 'tv-green', Azul: 'tv-blue',
};

export default function TvPanelPage() {
  const [queue, setQueue] = useState(initialQueue);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const rotate = window.setInterval(() => setQueue((current) => [...current.slice(1), current[0]]), 8000);
    return () => { window.clearInterval(clock); window.clearInterval(rotate); };
  }, []);

  const current = queue[0];

  return (
    <main className="tv-panel-page">
      <header className="tv-header">
        <div className="tv-brand"><i className="fas fa-hospital" /><div><h1>Hospital Central - SP</h1><p>Painel de chamadas</p></div></div>
        <div className="tv-clock"><strong>{now.toLocaleTimeString('pt-BR')}</strong><span>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
      </header>
      <div className="tv-content">
        <section className="called-card"><p className="called-label"><i className="fas fa-bullhorn" /> Chamando agora</p><div className="called-content"><div><strong className="called-code">{current.senha}</strong><p className="called-name">{current.nome}</p><p className="called-room">{current.sala}</p></div><span className={`tv-badge ${priorityClass[current.prioridade]}`}>{current.prioridade}</span></div></section>
        <section className="queue-card"><p className="queue-label"><i className="fas fa-list" /> Próximos</p>{queue.slice(1).map((item) => <div className={`queue-item ${priorityClass[item.prioridade]}`} key={item.senha}><div><strong>{item.senha}</strong><span>{item.nome}</span></div><div><b>{item.sala}</b><small>{item.tempo}</small></div></div>)}</section>
      </div>
      <footer className="tv-footer">Aguarde ser chamado. Mantenha seu celular no silencioso.</footer>
    </main>
  );
}
