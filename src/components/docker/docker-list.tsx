/**
 * DockerList.jsx – Interactive Docker container list with actions (React island).
 */
import { useState, useEffect } from "react";
import ContainerCard from "./container-card";

interface DockerContainer {
	Id: string;
	Names?: string[];
	Image?: string;
	State?: string;
	Status?: string;
	Ports?: Array<{ PublicPort?: number; PrivatePort: number; Type?: string }>;
}

interface DockerImage {
	Id: string;
	RepoTags?: string[];
	Size?: number;
	Created?: number;
}

interface DockerVolume {
	Name: string;
	Driver: string;
	Mountpoint: string;
}

interface DockerNetwork {
	Name: string;
	Driver: string;
	Scope: string;
}

export default function DockerList() {
	const [tab, setTab] = useState("containers");
	const [containers, setContainers] = useState<DockerContainer[]>([]);
	const [images, setImages] = useState<DockerImage[]>([]);
	const [volumes, setVolumes] = useState<DockerVolume[]>([]);
	const [networks, setNetworks] = useState<DockerNetwork[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchAll();
	}, []);

	async function fetchAll() {
		setLoading(true);
		try {
			const [cRes, iRes, vRes, nRes] = await Promise.all([
				fetch("/api/docker/containers").then((r) => r.json()).catch(() => []),
				fetch("/api/docker/images").then((r) => r.json()).catch(() => []),
				fetch("/api/docker/volumes").then((r) => r.json()).catch(() => ({ Volumes: [] })),
				fetch("/api/docker/networks").then((r) => r.json()).catch(() => []),
			]);
			setContainers(Array.isArray(cRes) ? cRes : []);
			setImages(Array.isArray(iRes) ? iRes : []);
			setVolumes(Array.isArray(vRes?.Volumes) ? vRes.Volumes : []);
			setNetworks(Array.isArray(nRes) ? nRes : []);
			setError(null);
		} catch {
			setError("Failed to fetch Docker data. Is Docker running?");
		} finally {
			setLoading(false);
		}
	}

	const tabs = [
		{ id: "containers", label: "Containers", count: containers.length },
		{ id: "images", label: "Images", count: images.length },
		{ id: "volumes", label: "Volumes", count: volumes.length },
		{ id: "networks", label: "Networks", count: networks.length },
	];

	return (
		<div className="space-y-6">
			{/* Tabs */}
			<div className="flex gap-1 rounded-xl bg-white/5 p-1">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? "bg-accent/20 text-accent" : "text-gray-400 hover:text-gray-200"
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
								containers.map((c) => <ContainerCard key={c.Id} container={c} />)
							)}
						</div>
					)}

					{/* Images */}
					{tab === "images" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{images.length === 0 ? (
								<div className="glass-card col-span-full text-center">
									<p className="text-sm text-gray-500">No images found</p>
								</div>
							) : (
							images.map((img, i) => (
									<div key={i} className="glass-card">
										<h4 className="truncate text-sm font-semibold">
											{img.RepoTags?.[0] ?? img.Id?.slice(7, 19)}
										</h4>
										<p className="mt-1 text-xs text-gray-500">
											Size: {img.Size ? (img.Size / 1024 / 1024).toFixed(1) : "N/A"} MB
										</p>
										<p className="text-xs text-gray-500">
											Created: {img.Created ? new Date(img.Created * 1000).toLocaleDateString() : "N/A"}
										</p>
									</div>
								))
							)}
						</div>
					)}

					{/* Volumes */}
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
				</>
			)}
		</div>
	);
}
