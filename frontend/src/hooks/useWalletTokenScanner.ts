import { useMemo, useState, useCallback } from "react";
import { useAccount, useReadContracts, useBalance, useChainId } from "wagmi";
import { formatUnits, isAddress } from "viem";
import type { Address } from "viem";
import { ERC20_ABI, ShariaComplianceABI } from "../config/abis";
import { useShariaCompliance } from "./useShariaCompliance";
import deployedContracts from "../../../config/deployedContracts.json";
import { moonbaseAlpha } from "wagmi/chains";

const SHARIA_COMPLIANCE_ADDRESS = (
	deployedContracts as unknown as { main: { shariaCompliance: string } }
).main.shariaCompliance as Address;

export interface ScannedToken {
	address: string;
	symbol: string;
	name: string;
	balance: string;
	balanceRaw: bigint;
	decimals: number;
	status: "compliant" | "non-compliant" | "unknown";
	complianceReason?: string;
	verified?: boolean;
}

interface UseWalletTokenScannerReturn {
	scannedTokens: ScannedToken[];
	isScanning: boolean;
	error: Error | null;
	scanWallet: () => Promise<void>;
	summary: {
		compliant: number;
		nonCompliant: number;
		unknown: number;
		total: number;
	};
}

/**
 * Hook to scan user's wallet for tokens and check Sharia compliance status
 * @param scanAddress Optional address to scan. If not provided, uses connected wallet address
 */
export function useWalletTokenScanner(scanAddress?: Address): UseWalletTokenScannerReturn {
	const { address: connectedAddress, isConnected } = useAccount();
	const chainId = useChainId();
	const { coins } = useShariaCompliance();
	const [scannedTokens, setScannedTokens] = useState<ScannedToken[]>([]);
	const [isScanning, setIsScanning] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Use custom address if provided, otherwise use connected address
	const addressToScan = scanAddress || connectedAddress;

	// Get native DEV balance
	const { data: nativeBalance } = useBalance({
		address: addressToScan,
		query: {
			enabled: Boolean(addressToScan),
		},
	});

	// Prepare contract read queries for all tokens
	const tokenAddresses = useMemo(
		() => coins.map((coin) => coin.tokenAddress as `0x${string}`),
		[coins]
	);

	// Batch read balances, decimals, names, and symbols for all tokens
	const balanceContracts = useMemo(
			() =>
			tokenAddresses.map((tokenAddress) => ({
				address: tokenAddress,
				abi: ERC20_ABI,
				functionName: "balanceOf" as const,
				args: addressToScan ? [addressToScan] : undefined,
			})),
		[tokenAddresses, addressToScan]
	);

	const decimalsContracts = useMemo(
		() =>
			tokenAddresses.map((tokenAddress) => ({
				address: tokenAddress,
				abi: ERC20_ABI,
				functionName: "decimals" as const,
			})),
		[tokenAddresses]
	);

	const nameContracts = useMemo(
		() =>
			tokenAddresses.map((tokenAddress) => ({
				address: tokenAddress,
				abi: ERC20_ABI,
				functionName: "name" as const,
			})),
		[tokenAddresses]
	);

	const symbolContracts = useMemo(
		() =>
			tokenAddresses.map((tokenAddress) => ({
				address: tokenAddress,
				abi: ERC20_ABI,
				functionName: "symbol" as const,
			})),
		[tokenAddresses]
	);

	const complianceContracts = useMemo(
		() =>
			tokenAddresses.map((tokenAddress) => ({
				address: SHARIA_COMPLIANCE_ADDRESS,
				abi: ShariaComplianceABI,
				functionName: "getCoinByAddress" as const,
				args: [tokenAddress] as const,
			})),
		[tokenAddresses]
	);

	// Track if we're ready to scan
	const [isReadyToScan, setIsReadyToScan] = useState(false);

	// Execute all reads
	const {
		data: balanceResults,
		isLoading: balancesLoading,
		refetch: refetchBalances,
	} = useReadContracts({
		contracts: balanceContracts,
		query: {
			enabled: Boolean(addressToScan && balanceContracts.length > 0 && isReadyToScan),
		},
	});

	const {
		data: decimalsResults,
		isLoading: decimalsLoading,
		refetch: refetchDecimals,
	} = useReadContracts({
		contracts: decimalsContracts,
		query: {
			enabled: Boolean(decimalsContracts.length > 0 && isReadyToScan),
		},
	});

	const {
		data: nameResults,
		isLoading: namesLoading,
		refetch: refetchNames,
	} = useReadContracts({
		contracts: nameContracts,
		query: {
			enabled: Boolean(nameContracts.length > 0 && isReadyToScan),
		},
	});

	const {
		data: symbolResults,
		isLoading: symbolsLoading,
		refetch: refetchSymbols,
	} = useReadContracts({
		contracts: symbolContracts,
		query: {
			enabled: Boolean(symbolContracts.length > 0 && isReadyToScan),
		},
	});

	const {
		data: complianceResults,
		isLoading: complianceLoading,
		refetch: refetchCompliance,
	} = useReadContracts({
		contracts: complianceContracts,
		query: {
			enabled: Boolean(complianceContracts.length > 0 && isReadyToScan),
		},
	});

	// Scan wallet function
	const scanWallet = useCallback(async () => {
		if (!addressToScan) {
			setError(new Error("No wallet address provided"));
			return;
		}

		// Validate address format
		if (!isAddress(addressToScan)) {
			setError(new Error("Invalid wallet address format"));
			return;
		}

		// Check if on Moonbase Alpha
		if (chainId !== moonbaseAlpha.id) {
			setError(new Error("Please switch to Moonbase Alpha network to scan"));
			return;
		}

		if (coins.length === 0) {
			setError(new Error("No tokens available to scan"));
			return;
		}

		setIsScanning(true);
		setError(null);
		setIsReadyToScan(true);

		try {
			// Trigger all refetches and wait for results
			const [
				balanceResponse,
				decimalsResponse,
				nameResponse,
				symbolResponse,
				complianceResponse,
			] = await Promise.all([
				refetchBalances(),
				refetchDecimals(),
				refetchNames(),
				refetchSymbols(),
				refetchCompliance(),
			]);

			// Use the refetched data directly
			const finalBalanceResults = balanceResponse.data || balanceResults;
			const finalDecimalsResults = decimalsResponse.data || decimalsResults;
			const finalNameResults = nameResponse.data || nameResults;
			const finalSymbolResults = symbolResponse.data || symbolResults;
			const finalComplianceResults = complianceResponse.data || complianceResults;

			// Ensure we have all results before processing
			if (
				!finalBalanceResults ||
				!finalDecimalsResults ||
				!finalNameResults ||
				!finalSymbolResults ||
				!finalComplianceResults
			) {
				throw new Error("Failed to fetch token data");
			}
			const tokens: ScannedToken[] = [];

			// Process each token
			for (let i = 0; i < tokenAddresses.length; i++) {
				const tokenAddress = tokenAddresses[i];
				const balanceResult = finalBalanceResults?.[i];
				const decimalsResult = finalDecimalsResults?.[i];
				const nameResult = finalNameResults?.[i];
				const symbolResult = finalSymbolResults?.[i];
				const complianceResult = finalComplianceResults?.[i];

				// Skip if balance read failed or no balance
				if (
					!balanceResult ||
					balanceResult.status !== "success" ||
					!balanceResult.result ||
					balanceResult.result === 0n
				) {
					continue;
				}

				const balanceRaw = balanceResult.result as bigint;

				// Get token metadata
				const decimals =
					decimalsResult?.status === "success" && decimalsResult.result
						? Number(decimalsResult.result)
						: 18;

				const name =
					nameResult?.status === "success" && nameResult.result
						? (nameResult.result as string)
						: coins[i]?.name || "Unknown Token";

				const symbol =
					symbolResult?.status === "success" && symbolResult.result
						? (symbolResult.result as string)
						: coins[i]?.symbol || "UNKNOWN";

				// Check compliance status
				let status: "compliant" | "non-compliant" | "unknown" = "unknown";
				let complianceReason: string | undefined;
				let verified: boolean | undefined;

				if (complianceResult?.status === "success" && complianceResult.result) {
					const coin = complianceResult.result as {
						exists: boolean;
						verified: boolean;
						complianceReason: string;
					};

					if (coin.exists) {
						status = coin.verified ? "compliant" : "non-compliant";
						complianceReason = coin.complianceReason;
						verified = coin.verified;
					}
				} else {
					// Fallback: check if token exists in coins array
					const coin = coins.find(
						(c) => c.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
					);
					if (coin) {
						status = coin.verified ? "compliant" : "non-compliant";
						complianceReason = coin.complianceReason;
						verified = coin.verified;
					}
				}

				const balance = formatUnits(balanceRaw, decimals);

				tokens.push({
					address: tokenAddress,
					symbol,
					name,
					balance,
					balanceRaw,
					decimals,
					status,
					complianceReason,
					verified,
				});
			}

			// Add native DEV if balance > 0
			if (nativeBalance && nativeBalance.value > 0n) {
				tokens.push({
					address: "0x0000000000000000000000000000000000000000",
					symbol: "DEV",
					name: "Moonbase DEV",
					balance: formatUnits(nativeBalance.value, 18),
					balanceRaw: nativeBalance.value,
					decimals: 18,
					status: "unknown", // Native token is not in compliance registry
					complianceReason: undefined,
					verified: undefined,
				});
			}

			// Sort: compliant first, then unknown, then non-compliant
			tokens.sort((a, b) => {
				const statusOrder = { compliant: 0, unknown: 1, "non-compliant": 2 };
				return statusOrder[a.status] - statusOrder[b.status];
			});

			setScannedTokens(tokens);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to scan wallet"));
			console.error("Error scanning wallet:", err);
		} finally {
			setIsScanning(false);
			setIsReadyToScan(false);
		}
	}, [
		addressToScan,
		chainId,
		tokenAddresses,
		balanceResults,
		decimalsResults,
		nameResults,
		symbolResults,
		complianceResults,
		coins,
		nativeBalance,
		balancesLoading,
		decimalsLoading,
		namesLoading,
		symbolsLoading,
		complianceLoading,
		refetchBalances,
		refetchDecimals,
		refetchNames,
		refetchSymbols,
		refetchCompliance,
	]);

	// Calculate summary
	const summary = useMemo(() => {
		const compliant = scannedTokens.filter((t) => t.status === "compliant").length;
		const nonCompliant = scannedTokens.filter((t) => t.status === "non-compliant").length;
		const unknown = scannedTokens.filter((t) => t.status === "unknown").length;

		return {
			compliant,
			nonCompliant,
			unknown,
			total: scannedTokens.length,
		};
	}, [scannedTokens]);

	return {
		scannedTokens,
		isScanning,
		error,
		scanWallet,
		summary,
	};
}

