import { useState } from "react";
import type { Address } from "viem";
import {
	useAccount,
	useChainId,
	usePublicClient,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
	useSwitchChain,
} from "wagmi";
import { moonbaseAlpha } from "wagmi/chains";
import { ERC20_ABI, ShariaSwapABI } from "../config/abis";
import deployedContracts from "../../../config/deployedContracts.json";
import { getTokenDecimals } from "../config/tokenDecimals";
import type { TransactionStatus } from "../types";
import { getFriendlyErrorMessage, isUserRejection } from "../utils/errorMessages";
import { REQUIRED_CHAIN_ID, REQUIRED_CHAIN_NAME } from "../config/wagmi";

const SHARIA_SWAP_ADDRESS = (
	deployedContracts as unknown as { main: { shariaSwap: string } }
).main.shariaSwap as Address;

/**
 * Refactored swap hook using Wagmi v2 + Viem with transaction tracking
 */
export function useShariaSwap() {
	const { address: userAddress, chainId: accountChainId } = useAccount();
	const chainId = useChainId();
	const publicClient = usePublicClient();
	const { switchChain } = useSwitchChain();
	const { 
		writeContract, 
		isPending: isWriting,
		data: txHash,
		error: writeError,
		reset: resetWrite,
	} = useWriteContract();

	// Validate network before any transaction and prompt to switch if needed
	// Use accountChainId if available (more reliable), fallback to chainId
	const validateNetwork = async () => {
		const currentChainId = accountChainId || chainId;
		if (!currentChainId || currentChainId !== REQUIRED_CHAIN_ID) {
			// Try to automatically switch to the correct network
			if (switchChain) {
				try {
					await switchChain({ chainId: moonbaseAlpha.id });
					// Wait a moment for the switch to complete
					await new Promise(resolve => setTimeout(resolve, 500));
					// Re-check after switch attempt
					const newChainId = accountChainId || chainId;
					if (newChainId !== REQUIRED_CHAIN_ID) {
						throw new Error(
							`Please switch to ${REQUIRED_CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}) in your wallet. If the network is not added, MetaMask will prompt you to add it.`
						);
					}
				} catch (error: any) {
					// If user rejects or switch fails, throw a helpful error
					if (error?.code === 4902 || error?.message?.includes('4902')) {
						// Chain not added - MetaMask should prompt to add it
						throw new Error(
							`Please add ${REQUIRED_CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}) to your wallet. MetaMask should prompt you to add it.`
						);
					} else if (error?.code === 4001 || error?.message?.includes('rejected')) {
						// User rejected the switch
						throw new Error(
							`Network switch was rejected. Please switch to ${REQUIRED_CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}) manually in your wallet.`
						);
					} else {
						throw new Error(
							`Please switch to ${REQUIRED_CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}) in your wallet. If the network is not added, MetaMask will prompt you to add it.`
						);
					}
				}
			} else {
				throw new Error(
					`Wrong network! You're connected to chain ID ${currentChainId || 'unknown'}, but this app requires ${REQUIRED_CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}). Please switch networks in your wallet.`
				);
			}
		}
	};

	// Wait for transaction confirmation
	const {
		isLoading: isConfirming,
		isSuccess: isConfirmed,
		isError: isConfirmError,
		error: confirmError,
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	// Calculate transaction status
	const getTransactionStatus = (): TransactionStatus => {
		if (isWriting || isConfirming) return "pending";
		if (isConfirmed) return "success";
		if (writeError || isConfirmError) return "error";
		return "idle";
	};

	// Estimate gas for transaction
	const estimateSwapGas = async (
		tokenIn: Address,
		tokenOut: Address,
		amountIn: bigint,
		minAmountOut: bigint
	): Promise<bigint | null> => {
		if (!publicClient || !userAddress) return null;

		try {
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 15);
			
			const gasEstimate = await publicClient.estimateContractGas({
				address: SHARIA_SWAP_ADDRESS,
				abi: ShariaSwapABI,
				functionName: "swapShariaCompliant",
				args: [tokenIn, tokenOut, amountIn, minAmountOut, deadline],
				account: userAddress,
			});

			return gasEstimate;
		} catch (err) {
			console.error("Failed to estimate gas:", err);
			return null;
		}
	};

	// Approve token spending
	const approveToken = async (tokenAddress: Address, amount: bigint) => {
		if (!userAddress) throw new Error("Wallet not connected");
		await validateNetwork(); // Check network before transaction (will prompt to switch if needed)

		return writeContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "approve",
			args: [SHARIA_SWAP_ADDRESS, amount],
		});
	};

	// Execute swap token for token
	const swapTokenForToken = async (
		tokenIn: Address,
		tokenOut: Address,
		amountIn: bigint,
		minAmountOut: bigint
	) => {
		await validateNetwork(); // Check network before transaction (will prompt to switch if needed)
		const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 15);

		return writeContract({
			address: SHARIA_SWAP_ADDRESS,
			abi: ShariaSwapABI,
			functionName: "swapShariaCompliant",
			args: [tokenIn, tokenOut, amountIn, minAmountOut, deadline],
		});
	};

	// Swap GLMR for token
	const swapGLMRForToken = async (
		tokenOut: Address,
		minAmountOut: bigint,
		amountIn: bigint
	) => {
		await validateNetwork(); // Check network before transaction (will prompt to switch if needed)
		const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 15);

		return writeContract({
			address: SHARIA_SWAP_ADDRESS,
			abi: ShariaSwapABI,
			functionName: "swapGLMRForToken",
			args: [tokenOut, minAmountOut, deadline],
			value: amountIn,
		});
	};

	// Get friendly error message
	const rawError = writeError || confirmError;
	const friendlyErrorMessage = rawError ? getFriendlyErrorMessage(rawError) : null;
	const isRejection = rawError ? isUserRejection(rawError) : false;

	return {
		approveToken,
		swapTokenForToken,
		swapGLMRForToken,
		estimateSwapGas,
		isApproving: isWriting,
		isSwapping: isWriting,
		isSwappingGLMR: isWriting,
		isConfirming,
		isConfirmed,
		txHash,
		transactionStatus: getTransactionStatus(),
		error: rawError,
		errorMessage: friendlyErrorMessage,
		isUserRejection: isRejection,
		reset: resetWrite,
		SHARIA_SWAP_ADDRESS,
	};
}

/**
 * Custom hook for reading swap quote (Wagmi v2)
 */
export function useSwapQuote(
	tokenIn: Address | `0x${string}` | undefined,
	tokenOut: Address | `0x${string}` | undefined,
	amountIn: bigint | undefined
) {
	const { data: quote, isLoading } = useReadContract({
		address: SHARIA_SWAP_ADDRESS,
		abi: ShariaSwapABI,
		functionName: "getSwapQuote",
		args:
			tokenIn && tokenOut && amountIn
				? [tokenIn as Address, tokenOut as Address, amountIn]
				: undefined,
		query: {
			enabled: !!(tokenIn && tokenOut && amountIn),
		},
	});

	return { quote: quote as bigint | undefined, isLoading };
}

/**
 * Manual quote fetching hook - Fixed version
 */
export function useManualSwapQuote() {
	const publicClient = usePublicClient();
	const [isLoading, setIsLoading] = useState(false);

	const fetchQuote = async (
		tokenIn: Address | `0x${string}`,
		tokenOut: Address | `0x${string}`,
		amountIn: bigint,
		tokenInSymbol?: string,
		tokenOutSymbol?: string
	): Promise<bigint | null> => {
		if (!publicClient) {
			console.error("❌ Public client not available");
			return null;
		}

		if (!tokenIn || !tokenOut || !amountIn || amountIn === 0n) {
			console.warn("⚠️ Invalid quote parameters", {
				tokenIn,
				tokenOut,
				amountIn: amountIn?.toString(),
			});
			return null;
		}

		// ✅ Validate addresses are proper format
		const isValidAddress = (addr: string): boolean => {
			return /^0x[0-9a-fA-F]{40}$/.test(addr);
		};

		if (!isValidAddress(tokenIn) || !isValidAddress(tokenOut)) {
			console.error("❌ Invalid token addresses", { tokenIn, tokenOut });
			return null;
		}

		// ✅ Check if tokenIn and tokenOut are the same
		if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
			console.error("❌ tokenIn and tokenOut cannot be the same");
			return null;
		}

		try {
			setIsLoading(true);

			// ✅ Log decimals if symbols are provided
			const decimalsIn = tokenInSymbol ? getTokenDecimals(tokenInSymbol) : 18;
			const decimalsOut = tokenOutSymbol
				? getTokenDecimals(tokenOutSymbol)
				: 18;

			console.log("📝 Fetching quote with params:", {
				contract: SHARIA_SWAP_ADDRESS,
				tokenIn,
				tokenOut,
				amountIn,
				tokenInSymbol,
				decimalsIn,
				tokenOutSymbol,
				decimalsOut,
			});

			// ✅ Direct contract read call
			const quote = (await publicClient.readContract({
				address: SHARIA_SWAP_ADDRESS,
				abi: ShariaSwapABI,
				functionName: "getSwapQuote",
				args: [tokenIn as Address, tokenOut as Address, amountIn],
			})) as bigint;

			console.log("✅ Quote fetched successfully:", quote.toString());
			return quote;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			console.error("❌ Quote fetch error:", {
				error: errorMsg,
				errorCode: err instanceof Error && "code" in err ? err.code : "unknown",
				details: err,
			});

			// ✅ More helpful error messages
			if (errorMsg.includes("QuoteAmountTooSmall")) {
				console.error(
					"💡 QuoteAmountTooSmall: No liquidity for this token pair. Try swapping through USDC instead."
				);
			} else if (errorMsg.includes("0xbb55fd27")) {
				console.error(
					"💡 Error 0xbb55fd27: Usually indicates insufficient liquidity or invalid token pair"
				);
			} else if (errorMsg.includes("reverted")) {
				console.error(
					"💡 Contract reverted. Check if tokens are listed and have liquidity pools"
				);
			}

			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return { isLoading, fetchQuote };
}
