import { useState } from 'react';

const queues = [
  { code: 'A014', name: 'Paciente aguardando chamada', reason: 'Consulta clínica', priority: 'Amarelo', room: 'Consultório 03', wait: '18 min' },
  { code: 'A015', name: 'Paciente aguardando chamada', reason: 'Retorno médico', priority: 'Verde', room: 'Consultório 03', wait: '11 min' },
  { code: 'A016', name: 'Paciente aguardando chamada', reason: 'Avaliação prioritária', priority: 'Laranja', room: 'Sala Vermelha', wait: '4 min' },
];

const priorityClass: Record<string, string> = {
  Vermelho: 'severity-vermelho', Laranja: 'severity-laranja', Amarelo: 'severity-amarelo', Verde: 'severity-verde', Azul: 'severity-azul',
};

export default function CareOperationsPage() {
  const [queue, setQueue] = useState(queues);
  const [called, setCalled] = useState<typeof queues[number] | null>(null);
  const [room, setRoom] = useState('Consultório 03');

  function callNext() {
    const next = queue.find((item) => item.room === room) || queue[0];
    if (!next) return;
    setCalled(next);
    setQueue((current) => current.filter((item) => item.code !== next.code));
  }

  return <div className="page-wrap care-page">
    <header className="page-header"><div><p className="eyebrow">Operação clínica</p><h2>Atendimento por sala</h2><p className="page-subtitle">Chame o próximo paciente conforme a sala e o profissional responsável.</p></div><span className="status-pill status-active"><i className="fas fa-circle" /> Unidade online</span></header>
    <section className="care-context"><div><span className="context-label">Unidade atual</span><strong>Hospital Central</strong><small>São Paulo - SP</small></div><label>Sua sala<select value={room} onChange={(event) => setRoom(event.target.value)}><option>Consultório 03</option><option>Consultório 05</option><option>Sala Vermelha</option></select></label><div><span className="context-label">Responsável</span><strong>Profissional autenticado</strong><small>Chamada vinculada ao seu perfil</small></div></section>
    <div className="care-grid"><section className="reference-card next-patient-card"><div className="section-heading"><div><p className="eyebrow">Próximo atendimento</p><h3>{called ? 'Paciente chamado' : 'Fila pronta para chamada'}</h3></div><span className="queue-counter">{queue.length} na fila</span></div>{called ? <div className="called-patient"><span className={`queue-code ${priorityClass[called.priority]}`}>{called.code}</span><div><strong>{called.name}</strong><span>{called.reason} · {called.priority}</span><small>Chamado para {called.room}</small></div><button type="button" className="secondary-button" onClick={() => setCalled(null)}>Finalizar</button></div> : <div className="call-empty"><i className="fas fa-bullhorn" /><strong>Pronto para chamar</strong><span>O próximo paciente da sala selecionada aparecerá aqui.</span></div>}<button type="button" className="primary-button call-button" onClick={callNext} disabled={!queue.length}><i className="fas fa-bullhorn" /> Chamar próximo paciente</button></section><section className="reference-card queue-list-card"><div className="section-heading"><h3><i className="fas fa-list-ol" /> Fila da sala</h3><button className="icon-button" type="button" aria-label="Atualizar fila"><i className="fas fa-rotate" /></button></div>{queue.length ? queue.map((item) => <div className="care-queue-row" key={item.code}><span className={`queue-code ${priorityClass[item.priority]}`}>{item.code}</span><div><strong>{item.name}</strong><small>{item.reason} · aguardando {item.wait}</small></div><span className={`status-pill ${priorityClass[item.priority]}`}>{item.priority}</span></div>) : <div className="reference-empty compact"><i className="fas fa-check-circle" /><strong>Fila vazia</strong><span>Não há pacientes aguardando nesta sala.</span></div>}</section></div>
    <section className="room-summary"><div><i className="fas fa-door-open" /><div><strong>Salas sob sua operação</strong><span>Escolha uma sala para assumir a fila correspondente.</span></div></div><div className="room-chips"><button className={room === 'Consultório 03' ? 'room-chip selected' : 'room-chip'} onClick={() => setRoom('Consultório 03')}>Consultório 03 <small>Clínica médica</small></button><button className={room === 'Consultório 05' ? 'room-chip selected' : 'room-chip'} onClick={() => setRoom('Consultório 05')}>Consultório 05 <small>Dr. responsável</small></button><button className="room-chip red-room" onClick={() => setRoom('Sala Vermelha')}>Sala Vermelha <small>Emergência</small></button></div></section>
  </div>;
}
