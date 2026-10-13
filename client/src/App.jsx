import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Check, CheckCircle2, Circle, ClipboardList, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";

const API = "/api";
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");

  const loadTasks = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [health, response] = await Promise.all([fetch(`${API}/health`), fetch(`${API}/tasks`)]);
      setApiStatus(health.ok ? "online" : "offline");
      if (!response.ok) throw new Error("Could not load tasks. Check backend and database.");
      setTasks(await response.json());
    } catch (err) { setApiStatus("offline"); setError(err.message || "Could not connect to backend."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  const stats = useMemo(() => ({
    total: tasks.length, completed: tasks.filter(t => t.completed).length,
    open: tasks.filter(t => !t.completed).length
  }), [tasks]);
  const visible = tasks.filter(t => filter === "open" ? !t.completed : filter === "completed" ? t.completed : true);

  async function addTask(event) {
    event.preventDefault(); const clean = title.trim(); if (!clean) return;
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: clean }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not create task.");
      setTasks(curr => [data, ...curr]); setTitle("");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function toggleTask(task) {
    setError("");
    try {
      const r = await fetch(`${API}/tasks/${task._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !task.completed }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not update task.");
      setTasks(curr => curr.map(t => t._id === data._id ? data : t));
    } catch (err) { setError(err.message); }
  }
  async function deleteTask(task) {
    setError("");
    try {
      const r = await fetch(`${API}/tasks/${task._id}`, { method: "DELETE" });
      if (!r.ok) { const data = await r.json(); throw new Error(data.error || "Could not delete task."); }
      setTasks(curr => curr.filter(t => t._id !== task._id));
    } catch (err) { setError(err.message); }
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-icon"><ClipboardList size={20}/></span>shipshape<span className="dot">.</span></a>
      <div className={`api-pill ${apiStatus}`}><span className="status-dot"/>API {apiStatus}</div>
    </header>
    <section className="hero">
      <div className="eyebrow"><Activity size={14}/> YOUR WORKSPACE</div>
      <h1>Make room for<br/><span>great work.</span></h1>
      <p>A simple task board to plan your day, keep momentum, and get things done.</p>
    </section>
    <section className="stats">
      <article><span>All tasks</span><strong>{String(stats.total).padStart(2,"0")}</strong><small>Everything on your list</small></article>
      <article><span>In progress</span><strong>{String(stats.open).padStart(2,"0")}</strong><small>One step at a time</small></article>
      <article className="highlight"><span>Completed</span><strong>{String(stats.completed).padStart(2,"0")}</strong><small>Progress worth celebrating</small></article>
    </section>
    <section className="board">
      <div className="board-head"><div><span className="kicker">THE PLAN</span><h2>Today’s tasks</h2></div><button className="icon-btn" onClick={loadTasks} aria-label="Refresh tasks"><RefreshCw size={17}/></button></div>
      <form className="add-form" onSubmit={addTask}>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="What needs to get done?" aria-label="New task title"/>
        <button className="add-btn" disabled={saving || !title.trim()}>{saving ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>} Add task</button>
      </form>
      <div className="filters">{[["all","All tasks"],["open","In progress"],["completed","Completed"]].map(([v,label]) => <button key={v} className={filter===v?"active":""} onClick={() => setFilter(v)}>{label}</button>)}<small>{visible.length} shown</small></div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="task-list">{loading ? <div className="empty"><LoaderCircle className="spin" size={23}/><p>Loading tasks…</p></div> : visible.length===0 ? <div className="empty"><CheckCircle2 size={25}/><h3>{tasks.length===0?"A clean slate.":"Nothing in this view."}</h3><p>{tasks.length===0?"Add your first task above and build some momentum.":"Try another filter to see your tasks."}</p></div> : visible.map(task => <article className={`task ${task.completed?"complete":""}`} key={task._id}>
        <button className="check-btn" onClick={() => toggleTask(task)} aria-label={task.completed?"Mark in progress":"Mark completed"}>{task.completed?<Check size={16}/>:<Circle size={19}/>}</button>
        <div className="task-info"><span>{task.title}</span><small>{task.completed?"Completed":"In progress"}</small></div>
        <button className="delete-btn" onClick={() => deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash2 size={16}/></button>
      </article>)}</div>
      <footer className="board-foot"><span><i/> Saved through your API</span><span>Small steps, real progress.</span></footer>
    </section>
    <footer className="page-foot">Built for deployment practice <b>·</b> React <b>·</b> Express <b>·</b> MongoDB</footer>
  </main>;
}
