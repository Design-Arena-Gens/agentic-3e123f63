/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useMemo, useState } from "react";

type AgentResponse = {
  report: string;
  sources: { title: string; url: string }[];
  downloads: { url: string; filename: string }[];
  logs: string[];
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AgentResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (line: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const canSubmit = useMemo(() => prompt.trim().length > 5 && !loading, [prompt, loading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResp(null);
    setLogs([]);
    addLog("Starting agent...");
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Request failed: ${r.status} ${text}`);
      }
      const data = (await r.json()) as AgentResponse;
      setResp(data);
      addLog("Agent completed.");
      data.logs.forEach((l) => addLog(l));
    } catch (err: any) {
      addLog(`Error: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Agentic Researcher</h1>
        <p className="muted">
          Enter a research prompt. The agent will search the web, read sources, download documents, and produce a professional report.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card p-4 space-y-3">
        <textarea
          className="input h-28"
          placeholder="e.g., Produce a market analysis on small modular nuclear reactors (SMRs) with key players, regulations, and risks."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button className="btn" disabled={!canSubmit}>
            {loading ? "Running..." : "Run Agent"}
          </button>
          <span className="muted text-sm">No API keys required.</span>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 text-lg font-medium">Report</h2>
          {resp?.report ? (
            <article className="prose max-w-none whitespace-pre-wrap">
              {resp.report}
            </article>
          ) : (
            <p className="muted">No report yet.</p>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card p-4">
            <h3 className="mb-2 font-medium">Sources</h3>
            <ul className="list-disc pl-5 space-y-1">
              {resp?.sources?.length
                ? resp.sources.map((s, i) => (
                    <li key={i}>
                      <a className="text-sky-700 hover:underline" href={s.url} target="_blank">
                        {s.title || s.url}
                      </a>
                    </li>
                  ))
                : <li className="muted">None yet.</li>}
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="mb-2 font-medium">Downloads</h3>
            <ul className="list-disc pl-5 space-y-1">
              {resp?.downloads?.length
                ? resp.downloads.map((d, i) => (
                    <li key={i}>
                      <a className="text-sky-700 hover:underline" href={d.url}>
                        {d.filename}
                      </a>
                    </li>
                  ))
                : <li className="muted">None yet.</li>}
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="mb-2 font-medium">Logs</h3>
            <div className="h-48 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs">
              {logs.length ? logs.map((l, i) => <div key={i}>{l}</div>) : <div className="muted">Waiting...</div>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

