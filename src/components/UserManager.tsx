/**
 * UserManager.tsx - User management component
 */
import { useState, useEffect } from "react";

interface User {
	username: string;
	role: "admin" | "operator" | "viewer";
	createdAt: string;
	lastLogin?: string;
}

export default function UserManager() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newRole, setNewRole] = useState<User["role"]>("viewer");

	useEffect(() => {
		fetchUsers();
	}, []);

	async function fetchUsers() {
		try {
			const res = await fetch("/api/modules/security/users", { credentials: "same-origin" });
			const data = await res.json();
			setUsers(data.users || []);
		} catch (err) {
			setError("Failed to load users");
		} finally {
			setLoading(false);
		}
	}

	async function createUser(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		try {
			const res = await fetch("/api/modules/security/users", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: newUsername,
					password: newPassword,
					role: newRole,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to create user");
			}

			setShowCreateModal(false);
			setNewUsername("");
			setNewPassword("");
			setNewRole("viewer");
			await fetchUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create user");
		}
	}

	async function deleteUser(username: string) {
		if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
			return;
		}

		setActionLoading(username);
		try {
			const res = await fetch(`/api/modules/security/users/${username}`, {
				method: "DELETE",
				credentials: "same-origin",
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to delete user");
			}

			await fetchUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete user");
		} finally {
			setActionLoading(null);
		}
	}

	async function changeRole(username: string, role: User["role"]) {
		setActionLoading(username);
		try {
			const res = await fetch(`/api/modules/security/users/${username}`, {
				method: "PUT",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to change role");
			}

			await fetchUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to change role");
		} finally {
			setActionLoading(null);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center p-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{error && (
				<div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			<div className="flex justify-between items-center">
				<h2 className="text-lg font-semibold text-white">Users</h2>
				<button
					onClick={() => setShowCreateModal(true)}
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
				>
					+ Add User
				</button>
			</div>

			<div className="glass-card">
				<div className="space-y-3">
					{users.map((user) => (
						<div
							key={user.username}
							className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border-dim"
						>
							<div>
								<div className="flex items-center gap-2">
									<span className="font-medium text-white">{user.username}</span>
									<span
										className={`text-xs px-2 py-0.5 rounded ${
											user.role === "admin"
												? "bg-red-500/20 text-red-400"
												: user.role === "operator"
												? "bg-blue-500/20 text-blue-400"
												: "bg-gray-500/20 text-gray-400"
										}`}
									>
											{user.role}
										</span>
								</div>
								<p className="text-xs text-gray-500 mt-1">
									Created: {new Date(user.createdAt).toLocaleDateString()}
									{user.lastLogin && ` • Last login: ${new Date(user.lastLogin).toLocaleString()}`}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<select
									value={user.role}
									onChange={(e) => changeRole(user.username, e.target.value as User["role"])}
									disabled={actionLoading === user.username}
									className="bg-surface border border-border-dim rounded px-2 py-1 text-sm"
								>
									<option value="viewer">Viewer</option>
									<option value="operator">Operator</option>
									<option value="admin">Admin</option>
								</select>
								<button
									onClick={() => deleteUser(user.username)}
									disabled={actionLoading === user.username}
									className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
								>
									{actionLoading === user.username ? "..." : "Delete"}
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Create User Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="glass-card w-full max-w-md">
						<h2 className="text-lg font-semibold text-white mb-4">Create New User</h2>
						<form onSubmit={createUser} className="space-y-4">
							<div>
								<label className="block text-sm text-gray-400 mb-1">Username</label>
								<input
									type="text"
									value={newUsername}
									onChange={(e) => setNewUsername(e.target.value)}
									required
									className="w-full bg-surface border border-border-dim rounded-lg px-4 py-2"
								/>
							</div>
							<div>
								<label className="block text-sm text-gray-400 mb-1">Password</label>
								<input
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									className="w-full bg-surface border border-border-dim rounded-lg px-4 py-2"
								/>
							</div>
							<div>
								<label className="block text-sm text-gray-400 mb-1">Role</label>
								<select
									value={newRole}
									onChange={(e) => setNewRole(e.target.value as User["role"])}
									className="w-full bg-surface border border-border-dim rounded-lg px-4 py-2"
								>
									<option value="viewer">Viewer - Read only</option>
									<option value="operator">Operator - Can manage services</option>
									<option value="admin">Admin - Full access</option>
								</select>
							</div>
							<div className="flex gap-2 pt-2">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
								>
									Create User
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
