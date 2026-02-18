/**
 * ContainerCard.jsx – Interactive Docker container card with resource management.
 */
import { useState } from "react";

interface Container {
	Id: string;
	Names?: string[];
	Image?: string;
	State?: string;
	Status?: string;
	Ports?: Array<{ PublicPort?: number; PrivatePort: number; Type?: string }>;
}

interface ContainerResources {
	limits?: { cpu?: string; memory?: string };
	stats?: string;
	error?: string;
}

interface Props {
	container: Container;
	onRefresh?: () => void;
}

export default function ContainerCard({ container, onRefresh }: Props) {
	const [loading, setLoading] = useState(false);
	const [confirm, setConfirm] = useState<string | null>(null);
	const [showLogs, setShowLogs] = useState(false);
	const [logs, setLogs] = useState("");
	const [showResources, setShowResources] = useState(false);
	const [resources, setResources] = useState<ContainerResources | null>(null);
	const [updatingResources, setUpdatingResources] = useState(false);

	const name = container.Names?.[0]?.replace(/^\//, "") ?? container.Id?.slice(0, 12);
	const image = container.Image ?? "unknown";
	const state = container.State ?? "unknown";
	const status = container.Status ?? "";

	const stateColors: Record<string, string> = {
		running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
		paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
		exited: "bg-red-500/20 text-red-400 border-red-500/30",
		dead: "bg-red-500/20 text-red-400 border-red-500/30",
	};
	const badgeClass = stateColors[state] || "bg-gray-500/20 text-gray-400 border-gray-500/30";

	async function doAction(action: string) {
		setLoading(true);
		setConfirm(null);
		try {
			const res = await fetch(`/api/docker/container/${container.Id}/action`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});
			if (res.ok && onRefresh) {
				onRefresh();
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	async function fetchLogs() {
		setShowLogs(!showLogs);
		if (!showLogs) {
			try {
				const res = await fetch(`/api/docker/container/${container.Id}/logs?lines=50`);
				const data = await res.json();
				setLogs(data.logs?.join("\n") ?? "No logs available");
			} catch {
				setLogs("Failed to fetch logs");
			}
		}
	}

	async function fetchResources() {
		setShowResources(!showResources);
		if (!showResources && !resources) {
			try {
				const res = await fetch(`/api/docker/container/${container.Id}/resources`);
				const data = await res.json();
				setResources(data);
			} catch {
				setResources({ error: "Failed to load resources" });
			}
		}
	}

	async function updateResources(e: <HTMLFormElement>) {
		e.preventDefault();
		setUpdatingResources(true);
		try {
			const formData = new FormData(e.currentTarget);
			const cpu = formData.get("cpu");
			const memory = formData.get("memory");

			const res = await fetch(`/api/docker/container/${container.Id}/resources`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					cpu: cpu ? parseFloat(cpu as string) : undefined,
					memory: memory ? parseInt(memory as string) : undefined,
				}),
			});

			if (res.ok) {
				alert("Resource limits updated successfully");
				fetchResources();
			} else {
				alert("Failed to update resources");
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			setUpdatingResources(false);
		}
	}

	return (
		<div className="glass-card flex flex-col gap-3 relative">
			{loading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
				</div>
			)}

			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="min-w-0">
					<h3 className="truncate text-sm font-semibold">{name}</h3>
					<p className="mt-0.5 truncate text-xs text-gray-500">{image}</p>
				</div>
				<span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${badgeClass}`}>
					{state}
				</span>
			</div>

			{/* Status info */}
			<p className="text-xs text-gray-400">{status}</p>

			{/* Ports */}
			{container.Ports && container.Ports.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{container.Ports.filter((p): p is NonNullable<typeof p> => !!p.PublicPort).map((p, i) => (
						<span key={i} className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
							{p.PublicPort}→{p.PrivatePort}/{p.Type}
						</span>
					))}
				</div>
			)}

			{/* Action buttons */}
			<div className="mt-1 flex flex-wrap gap-2">
				{state === "running" ? (
					<>
						<button
							onClick={() => setConfirm("stop")}
							className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
						>
							Stop
						</button>
						<button
							onClick={() => doAction("restart")}
							className="rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 transition hover:bg-yellow-500/20"
						>
							Restart
						</button>
					</>
				) : (
					<button
						onClick={() => doAction("start")}
						className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
					>
						Start
					</button>
				)}
				<button
					onClick={() => setConfirm("remove")}
					className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
				>
					Remove
				</button>
				<button
					onClick={fetchLogs}
					className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
				>
					{showLogs ? "Hide Logs" : "Logs"}
				</button>
				<button
					onClick={fetchResources}
					className="rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition hover:bg-purple-500/20"
				>
					{showResources ? "Hide Resources" : "Resources"}
				</button>
			</div>

			{/* Confirmation modal */}
			{confirm && (
				<div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
					<p className="text-xs text-red-300">
						Are you sure you want to <strong>{confirm}</strong> this container?
					</p>
					<div className="mt-2 flex gap-2">
						<button
							onClick={() => doAction(confirm)}
							className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600"
						>
							Confirm
						</button>
						<button
							onClick={() => setConfirm(null)}
							className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/20"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Logs panel */}
			{showLogs && (
				<div className="mt-2 max-h-48 overflow-auto rounded-xl bg-black/30 p-3">
					<pre className="whitespace-pre-wrap text-[10px] leading-relaxed text-gray-400 font-mono">
						{logs || "Loading..."}
					</pre>
				</div>
			)}

			{/* Resources panel */}
			{showResources && (
				<div className="mt-2 rounded-xl bg-purple-500/10 border border-purple-500/30 p-3">
					{resources?.error ? (
						<p className="text-xs text-red-400">{resources.error}</p>
					) : resources ? (
						<form onSubmit={updateResources} className="space-y-3">
							<div>
								<label className="block text-xs text-gray-400 mb-1">CPU Limit (cores)</label>
								<input
									type="number"
									name="cpu"
									step="0.1"
									defaultValue={resources.limits?.cpu || ""}
									placeholder="e.g., 1.5"
									className="w-full bg-surface border border-border-dim rounded px-2 py-1 text-xs"
								/>
							</div>
							<div>
								<label className="block text-xs text-gray-400 mb-1">Memory Limit (bytes)</label>
								<input
									type="number"
									name="memory"
									defaultValue={resources.limits?.memory || ""}
									placeholder="e.g., 536870912 (512MB)"
									className="w-full bg-surface border border-border-dim rounded px-2 py-1 text-xs"
								/>
							</div>
							{resources.stats && (
								<div className="text-xs text-gray-500">
									<p>Current Usage: {resources.stats}</p>
								</div>
							)}
							<button
								type="submit"
								disabled={updatingResources}
								className="w-full rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition hover:bg-purple-500/30 disabled:opacity-50"
							>
								{updatingResources ? "Updating..." : "Update Limits"}
							</button>
						</form>
					) : (
						<p className="text-xs text-gray-400">Loading...</p>
					)}
				</div>
			)}
		</div>
	);
}
