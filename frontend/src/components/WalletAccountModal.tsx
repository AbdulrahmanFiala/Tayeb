import { useEffect, useState } from "react";
import { FaExternalLinkAlt, FaCopy, FaCheck, FaWallet } from "react-icons/fa";
import { useWallet } from "../hooks/useWallet";

interface WalletAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function WalletAccountModal({ isOpen, onClose }: WalletAccountModalProps) {
	const { address, disconnectWallet, chain } = useWallet();
	const [copied, setCopied] = useState(false);

	// Handle ESC key to close
	useEffect(() => {
		if (!isOpen) return;
		
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Reset copied state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setCopied(false);
		}
	}, [isOpen]);

	const handleCopyAddress = async () => {
		if (address) {
			try {
				await navigator.clipboard.writeText(address);
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			} catch (err) {
				console.error("Failed to copy address:", err);
			}
		}
	};

	const handleDisconnect = () => {
		disconnectWallet();
		onClose();
	};

	const handleViewOnExplorer = () => {
		if (address && chain) {
			// Moonbase Alpha explorer
			const explorerUrl = `https://moonbase.moonscan.io/address/${address}`;
			window.open(explorerUrl, "_blank", "noopener,noreferrer");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			onClick={onClose}
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
			
			{/* Modal */}
			<div
				className="relative bg-[#1a3a2f] border border-solid border-[#23483c] rounded-xl shadow-2xl max-w-md w-full p-4 z-10"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2">
						<FaWallet className="text-white/70" size={18} />
						<h3 className="text-white/70 text-base font-medium">
							Account
						</h3>
					</div>
					<button
						onClick={onClose}
						className="text-white/60 hover:text-white transition-colors p-1"
						aria-label="Close"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				{/* Connection Status */}
				<div className="flex items-center justify-between mb-3">
					<p className="text-white/70 text-sm">Connected with MetaMask</p>
					<button
						onClick={handleDisconnect}
						className="px-2.5 py-1 text-xs border border-primary/30 text-primary hover:bg-primary/10 rounded-lg transition-colors"
					>
						Disconnect
					</button>
				</div>

				{/* Wallet Address Display */}
				<div className="mb-3 p-3 bg-primary/20 rounded-lg border border-primary/30">
					<p className="text-white font-mono text-sm break-all">
						{address}
					</p>
				</div>

				{/* Network Info */}
				{chain && (
					<div className="mb-3 p-2.5 bg-[#23483c] rounded-lg border border-[#23483c]">
						<p className="text-white/60 text-xs mb-0.5">Network</p>
						<p className="text-white text-sm font-medium">{chain.name}</p>
					</div>
				)}

				{/* Address Actions */}
				<div className="flex items-center justify-between">
					<button
						onClick={handleViewOnExplorer}
						className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm"
					>
						<FaExternalLinkAlt className="text-primary" size={14} />
						View on explorer
					</button>
					<button
						onClick={handleCopyAddress}
						className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm"
					>
						{copied ? (
							<>
								<FaCheck className="text-primary" size={14} />
								Copied!
							</>
						) : (
							<>
								Copy Address
								<FaCopy className="text-primary" size={14} />
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

