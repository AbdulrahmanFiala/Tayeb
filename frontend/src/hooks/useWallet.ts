import {
	useAccount,
	useChainId,
	useConnect,
	useDisconnect,
	useSwitchChain,
	useConnectors,
} from "wagmi";
import { moonbaseAlpha } from "wagmi/chains";
import type { Connector } from "wagmi";

/**
 * Refactored wallet hook using Wagmi v2
 * Replaces the old ethers-based useWallet hook
 */
export function useWallet() {
	const { address, isConnected, chain } = useAccount();
	const chainId = useChainId();
	const { switchChain } = useSwitchChain();
	const { connect, error: connectError, isPending } = useConnect();
	const { disconnect } = useDisconnect();
	const availableConnectors = useConnectors();

	// Check if on Moonbase Alpha testnet
	const isOnMoonbaseAlpha = chainId === moonbaseAlpha.id;

	// Connect wallet with a specific connector
	const connectWallet = (connector?: Connector) => {
		if (connector) {
			connect({ connector });
		} else {
			// Fallback: try to use the first available injected connector (MetaMask)
			const injectedConnector = availableConnectors.find(
				(c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")
			);
			if (injectedConnector) {
				connect({ connector: injectedConnector });
			}
		}
	};

	// Switch to Moonbase Alpha if not already on it
	const switchToMoonbaseAlpha = () => {
		if (!isOnMoonbaseAlpha && switchChain) {
			switchChain({ chainId: moonbaseAlpha.id });
		}
	};

	// Disconnect wallet
	const disconnectWallet = () => {
		disconnect();
	};

	return {
		address,
		isConnected,
		chainId,
		chain,
		isOnMoonbaseAlpha,
		connectWallet,
		switchToMoonbaseAlpha,
		disconnectWallet,
		connectors: availableConnectors,
		connectError,
		isConnecting: isPending,
	};
}
