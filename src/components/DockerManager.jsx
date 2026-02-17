/**
 * DockerManager.jsx - Enhanced Docker management with all enhancement features
 */
import { useState, useEffect } from "react";
import ContainerCard from "./ContainerCard.jsx";

export default function DockerManager() {
	const [tab, setTab] = useState("containers");
	const [containers, setContainers] = useState([]);
	const [images, setImages] = useState([]);
	const [volumes, setVolumes] = useState([]);
	const [networks, setNetworks] = useState([]);
	const [composeProjects, setComposeProjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [scanningImage, setScanningImage] = useState(null);
	const [scanResult, setScanResult] = useState(null);
	const [backingUpVolume, setBackingUpVolume] = useState(null);

	useEffect(() => {
		fetchAll();
	}, []);

	async function fetchAll() {
		setLoading(true);
		try {
			const [cRes, iRes, vRes, nRes, composeRes] = await Promise.all([
				fetch("/api/docker/containers").then((r) => r.json()).catch(() => []),
				fetch("/api/docker/images").then((r) => r.json()).catch(() => []),
				fetch("/api/docker/volumes").then((r) => r.json()).catch(() => ({ Volumes: [] })),
				fetch("/api/docker/networks").then((r) => r.json()).catch(() => []),
				fetch("/api/docker/compose/projects").then((r) => r.json()).catch(() => ({ projects: [] })),
			]);
			setContainers(Array.isArray(cRes) ? cRes : []);
			setImages(Array.isArray(iRes) ? iRes : []);
			setVolumes(Array.isArray(vRes?.Volumes) ? vRes.Volumes : []);
			setNetworks(Array.isArray(nRes) ? nRes : []);
			setComposeProjects(composeRes.projects || []);
			setError(null);
		} catch {
			setError("Failed to fetch Docker data. Is Docker running?");
		} finally {
			setLoading(false);
		}
	}

	async function scanImage(imageId, imageTag) {
		setScanningImage(imageId);
		try {
			const res = await fetch(`/api/docker/images/${imageId}/scan`, {
				method: "POST",
				credentials: "same-origin",
			});
			const data = await res.json();
			setScanResult({ ...data, imageTag });
		} catch (err) {
			setScanResult({ error: "Scan failed", imageTag });
		} finally {
			setScanningImage(null);
		}
	}

	async function backupVolume(volumeName) {
		setBackingUpVolume(volumeName);
		try {
			const res = await fetch(`/api/docker/volumes/${volumeName}/backup`, {
				method: "POST",
				credentials: "same-origin",
			});
			const data = await res.json();
			if (data.ok) {
				alert(`Volume ${volumeName} backed up successfully to ${data.backupFile}`);
			} else {
				alert(`Backup failed: ${data.error}`);
			}
		} catch (err) {
			alert(`Backup failed: ${err.message}`);
		} finally {
			setBackingUpVolume(null);
		}
	}

	async function composeAction(project, action) {
		try {
			const res = await fetch(`/api/docker/compose/${project}/action`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});
			const data = await res.json();
			if (data.ok) {
				fetchAll();
			} else {
				alert(`Action failed: ${data.error}`);
			}
		} catch (err) {
			alert(`Action failed: ${err.message}`);
		}
	}

	const tabs = [
		{ id: "containers", label: "Containers", count: containers.length },
		{ id: "images", label: "Images", count: images.length },
		{ id: "volumes", label: "Volumes", count: volumes.length },
		{ id: "networks", label: "Networks", count: networks.length },
		{ id: "compose", label: "Compose", count: composeProjects.length },
	];

	return (
		<div className="space-y-6">
			{/* Tabs */}
			<div className="flex gap-1 rounded-xl bg-white/5 p-1 overflow-x-auto">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
							tab === t.id ? "bg-accent/20 text-accent" : "text-gray-400 hover:text-gray-200"
						}`}
					>
						{t.label}
						<span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{t.count}</span>
					</button>
				))}

				<button
					onClick={fetchAll}
					className="ml-auto rounded-lg px-3 py-2 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white"
				>
					↻ Refresh
				</button>
			</div>

			{error && (
				<div className="glass-card border-red-500/30 bg-red-500/10 text-center">
					<p className="text-sm text-red-400">{error}</p>
				</div>
			)}

			{/* Scan Result Modal */}
			{scanResult && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-auto">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">Vulnerability Scan: {scanResult.imageTag}</h2>
							<button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-white">
								<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						{scanResult.error ? (
							<p className="text-red-400">{scanResult.error}</p>
						) : (
							<div>
								<div className="flex gap-4 mb-4">
									<div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg">
										<span className="text-2xl font-bold">{scanResult.summary?.critical || 0}</span>
										<span className="text-sm ml-1">Critical</span>
									</div>
									<div className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg">
										<span className="text-2xl font-bold">{scanResult.summary?.high || 0}</span>
										<span className="text-sm ml-1">High</span>
									</div>
								</div>
								{scanResult.scan?.Results?.map((result, i) => (
									result.Vulnerabilities?.length > 0 && (
										<div key={i} className="mb-4">
											<h4 className="font-semibold mb-2">{result.Target}</h4>
											<div className="space-y-2">
												{result.Vulnerabilities.slice(0, 5).map((vuln, j) => (
													<div key={j} className={`p-2 rounded text-xs ${
														vuln.Severity === "CRITICAL" ? "bg-red-500/20 text-red-300" : "bg-orange-500/20 text-orange-300"
													}`}>
														<strong>{vuln.VulnerabilityID}</strong>: {vuln.Title}
													</div>
												))}
											</div>
										</div>
									)
									))}
							</div>
						)}
					</div>
				</div>
			)}

			{loading ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="glass-card animate-pulse">
							<div className="h-4 w-24 rounded bg-white/10 mb-2" />
							<div className="h-3 w-32 rounded bg-white/10 mb-3" />
							<div className="h-6 w-16 rounded bg-white/10" />
						</div>
					))}
				</div>
			) : (
				<>
					{/* Containers */}
					{tab === "containers" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{containers.length === 0 ? (
								<div className="glass-card col-span-full text-center">
									<p className="text-sm text-gray-500">No containers found</p>
								</div>
							) : (
								containers.map((c) => <ContainerCard key={c.Id} container={c} onRefresh={fetchAll} />)
							)}
						</div>
					)}

					{/* Images with Scanning */}
					{tab === "images" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{images.length === 0 ? (
								<div className="glass-card col-span-full text-center">
									<p className="text-sm text-gray-500">No images found</p>
								</div>
							) : (
								images.map((img, i) => (
									<div key={i} className="glass-card">
										<div className="flex items-start justify-between">
											<div className="min-w-0">
												<h4 className="truncate text-sm font-semibold">
													{img.RepoTags?.[0] ?? img.Id?.slice(7, 19)}
												</h4>
												<p className="mt-1 text-xs text-gray-500">
													Size: {(img.Size / 1024 / 1024).toFixed(1)} MB
												</p>
												<p className="text-xs text-gray-500">
													Created: {new Date(img.Created * 1000).toLocaleDateString()}
												</p>
											</div>
										</div>
										<button
											onClick={() => scanImage(img.Id, img.RepoTags?.[0] ?? img.Id?.slice(7, 19))}
											disabled={scanningImage === img.Id}
											className="mt-3 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/30 disabled:opacity-50"
										>
											{scanningImage === img.Id ? "Scanning..." : "🔒 Scan"}
										</button>
									</div>
								))
							)}
						</div>
					)}

					{/* Volumes with Backup */}
					{tab === "volumes" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{volumes.length === 0 ? (
								<div className="glass-card col-span-full text-center">
									<p className="text-sm text-gray-500">No volumes found</p>
								</div>
							) : (
								volumes.map((vol, i) => (
									<div key={i} className="glass-card">
										<h4 className="truncate text-sm font-semibold">{vol.Name}</h4>
										<p className="mt-1 text-xs text-gray-500">Driver: {vol.Driver}</p>
										<p className="truncate text-xs text-gray-500">Mount: {vol.Mountpoint}</p>
										<button
											onClick={() => backupVolume(vol.Name)}
											disabled={backingUpVolume === vol.Name}
											className="mt-3 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/30 disabled:opacity-50"
										>
											{backingUpVolume === vol.Name ? "Backing up..." : "💾 Backup"}
										</button>
									</div>
								))
							)}
						</div>
					)}

					{/* Networks */}
					{tab === "networks" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{networks.length === 0 ? (
								<div className="glass-card col-span-full text-center">
									<p className="text-sm text-gray-500">No networks found</p>
								</div>
							) : (
								networks.map((net, i) => (
									<div key={i} className="glass-card">
										<h4 className="truncate text-sm font-semibold">{net.Name}</h4>
										<p className="mt-1 text-xs text-gray-500">Driver: {net.Driver}</p>
										<p className="text-xs text-gray-500">Scope: {net.Scope}</p>
									</div>
								))
							)}
						</div>
					)}

					{/* Docker Compose */}
					{tab === "compose" && (
						<div className="space-y-4">
							{composeProjects.length === 0 ? (
								<div className="glass-card text-center">
									<p className="text-sm text-gray-500">No compose projects found</p>
									<p className="text-xs text-gray-600 mt-1">
										Projects are auto-discovered from running containers with compose labels
									</p>
								</div>
							) : (
								composeProjects.map((project, i) => (
									<div key={i} className="glass-card">
										<div className="flex items-center justify-between">
											<div>
												<h4 className="text-sm font-semibold">{project.Name}</h4>
												<p className="text-xs text-gray-500 mt-1">
													Status: <span className={project.Status === "running" ? "text-emerald-400" : "text-gray-400"}>{project.Status}</span>
												</p>
												{project.services?.length > 0 && (
													<p className="text-xs text-gray-500">
														Services: {project.services.join(", ")}
													</p>
												)}
											</div>
											<div className="flex gap-2">
												{project.Status === "running" ? (
													<>
														<button
															onClick={() => composeAction(project.Name, "restart")}
															className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-400 transition hover:bg-yellow-500/30"
														>
															Restart
														</button>
														<button
															onClick={() => composeAction(project.Name, "down")}
															className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30"
														>
															Stop
														</button>
													</>
												) : (
													<button
														onClick={() => composeAction(project.Name, "up")}
														className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/30"
													>
														Start
													</button>
												)}
												<button
													onClick={() => composeAction(project.Name, "pull")}
													className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/30"
												>
													Pull
												</button>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
