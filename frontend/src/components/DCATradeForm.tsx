import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import type { Address } from "viem";
import { usePublicClient, useAccount } from "wagmi";
import type { Token } from "../types";
import { TokenSelector } from "./TokenSelector";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { ERC20_ABI } from "../config/abis";
import deployedContracts from "../../../config/deployedContracts.json";

const SHARIA_DCA_ADDRESS = (
	deployedContracts as unknown as { main: { shariaDCA: string } }
).main.shariaDCA as Address;

interface DCATradeFormProps {
	tokens: Token[];
	isCreating?: boolean;
	isApproving?: boolean;
	approvalConfirmed?: number;
	onSchedule?: (data: {
		sourceToken: Token;
		targetToken: Token;
		amount: string;
		interval: "hour" | "day" | "week";
		duration: string;
	}) => void;
	onApprove?: (token: Token, amount: bigint) => void;
}

export function DCATradeForm({ 
	tokens, 
	isCreating = false, 
	isApproving = false,
	approvalConfirmed = 0,
	onSchedule,
	onApprove
}: DCATradeFormProps) {
	const { address } = useAccount();
	const publicClient = usePublicClient();
	
	const [sourceToken, setSourceToken] = useState<Token | null>(
		tokens.length > 0 ? tokens[0] : null
	);
	const [targetToken, setTargetToken] = useState<Token | null>(
		tokens.length > 1 ? tokens[1] : null
	);
	const [amount, setAmount] = useState<string>("");
	const [interval, setInterval] = useState<"hour" | "day" | "week">("day");
	const [duration, setDuration] = useState<string>("1");
	const [needsApproval, setNeedsApproval] = useState(false);
	const [checkingAllowance, setCheckingAllowance] = useState(false);
	const [isApprovingToken, setIsApprovingToken] = useState(false);
	const [waitingForApproval, setWaitingForApproval] = useState(false);
	
	// Fetch source token balance
	const { balance: sourceBalance } = useTokenBalance(sourceToken);
	
	// Check token allowance
	const checkAllowance = async () => {
		if (!sourceToken || !amount || !address || !publicClient) {
			setNeedsApproval(false);
			return;
		}

		// Don't check if amount is invalid
		const numericAmount = parseFloat(amount);
		if (isNaN(numericAmount) || numericAmount <= 0) {
			setNeedsApproval(false);
			return;
		}

		try {
			setCheckingAllowance(true);
			
			// Calculate total amount needed (amount per interval * total intervals)
			const amountPerInterval = parseUnits(amount, sourceToken.decimals);
			const totalIntervals = BigInt(duration || "1");
			const totalAmount = amountPerInterval * totalIntervals;
			
			const allowance = await publicClient.readContract({
				address: sourceToken.addresses.moonbase as `0x${string}`,
				abi: ERC20_ABI,
				functionName: "allowance",
				args: [address, SHARIA_DCA_ADDRESS],
			}) as bigint;

			console.log("🔍 DCA Allowance check:", {
				token: sourceToken.symbol,
				allowance: allowance.toString(),
				required: totalAmount.toString(),
				needsApproval: allowance < totalAmount,
			});

			setNeedsApproval(allowance < totalAmount);
		} catch (err) {
			console.error("Error checking allowance:", err);
			setNeedsApproval(true); // Assume needs approval on error
		} finally {
			setCheckingAllowance(false);
		}
	};

	// Check allowance whenever relevant dependencies change
	useEffect(() => {
		checkAllowance();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sourceToken, amount, duration, address, publicClient]);

	// Immediately re-check allowance when approval is confirmed
	useEffect(() => {
		if (approvalConfirmed > 0 && sourceToken && amount && duration && address && publicClient) {
			console.log("🔄 Approval confirmed - immediately re-checking allowance");
			// Check immediately
			checkAllowance();
			// Also check after a short delay to account for blockchain state propagation
			const timeout = setTimeout(() => {
				checkAllowance();
				setWaitingForApproval(false);
			}, 1500);
			return () => clearTimeout(timeout);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [approvalConfirmed, sourceToken, amount, duration, address, publicClient]);

	// Re-check allowance after approval transaction is sent (poll until confirmed)
	useEffect(() => {
		// Only poll when we're waiting for approval confirmation
		if (!waitingForApproval || isApprovingToken || !sourceToken || !amount || !duration || !address || !publicClient) {
			return;
		}

		// Poll allowance every 2 seconds after approval is sent
		const interval = setInterval(async () => {
			await checkAllowance();
		}, 2000);

		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [waitingForApproval, isApprovingToken, sourceToken, amount, duration, address, publicClient]);

	// Stop waiting when allowance is sufficient
	useEffect(() => {
		if (!needsApproval && waitingForApproval) {
			setWaitingForApproval(false);
			console.log("✅ Approval confirmed - allowance is sufficient");
		}
	}, [needsApproval, waitingForApproval]);

	// Reset waiting state when amount/token changes
	useEffect(() => {
		setWaitingForApproval(false);
	}, [sourceToken, amount, duration]);

	const isValid = () => {
		if (!sourceToken || !targetToken || !amount || !duration) return false;
		if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) return false;
		if (parseInt(duration) <= 0 || isNaN(parseInt(duration))) return false;
		if (sourceToken.addresses.moonbase === targetToken.addresses.moonbase) return false;
		return true;
	};

	const handleSchedule = () => {
		if (!isValid()) {
			alert("Please fill in all fields with valid values");
			return;
		}

		onSchedule?.({
			sourceToken: sourceToken!,
			targetToken: targetToken!,
			amount,
			interval,
			duration,
		});
	};

	const handleApproveToken = async () => {
		if (!sourceToken || !amount || !address) return;

		try {
			setIsApprovingToken(true);
			setWaitingForApproval(true);
			
			// Calculate total amount needed
			const amountPerInterval = parseUnits(amount, sourceToken.decimals);
			const totalIntervals = BigInt(duration || "1");
			const totalAmount = amountPerInterval * totalIntervals;
			
			// Approve maximum amount to avoid future approvals
			const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
			
			// Call the parent's approve handler
			onApprove?.(sourceToken, maxApproval);
			
			console.log("✅ Approval transaction sent");
			
			// Reset approving state - transaction is sent, now waiting for confirmation
			setIsApprovingToken(false);
		} catch (err) {
			console.error("Error approving token:", err);
			setIsApprovingToken(false);
			setWaitingForApproval(false);
		}
	};

	const handleSourceTokenChange = (token: Token) => {
		setSourceToken(token);
		// If target token is the same as new source, swap them
		if (targetToken?.addresses.moonbase === token.addresses.moonbase) {
			setTargetToken(sourceToken);
		}
	};

	const handleTargetTokenChange = (token: Token) => {
		setTargetToken(token);
		// If source token is the same as new target, swap them
		if (sourceToken?.addresses.moonbase === token.addresses.moonbase) {
			setSourceToken(targetToken);
		}
	};

	return (
		<div className="flex flex-col h-full">
			<h1 className="text-white tracking-light text-[32px] font-bold leading-tight text-center pb-6">
				Trade DCA
			</h1>

			<div className="bg-[#1a3a2f] p-4 sm:p-6 rounded-xl border border-solid border-[#23483c] shadow-lg flex-1 flex flex-col">
				{/* FOR TOTAL BUDGET Section */}
				<div className="mb-4">
					<p className="text-white/60 text-xs uppercase font-medium mb-3">
						FOR TOTAL BUDGET
					</p>
					<div className="bg-[#23483c] rounded-lg p-4">
						<div className="flex justify-between items-center mb-2">
							<p className="text-white/80 text-sm font-medium">
								Balance: {sourceBalance ? parseFloat(sourceBalance).toFixed(6) : "0.000000"}{" "}
								{sourceToken?.symbol || ""}
							</p>
						</div>
						<div className="flex items-center gap-4">
							<input
								type="text"
								inputMode="decimal"
								value={amount}
								onChange={(e) => {
									let newValue = e.target.value;
									newValue = newValue.replace(/[^\d.]/g, "");
									const parts = newValue.split(".");
									if (parts.length > 2) {
										newValue = parts[0] + "." + parts.slice(1).join("");
									}
									setAmount(newValue);
								}}
								className="flex-1 w-full bg-transparent text-white text-3xl font-medium placeholder:text-white/40 focus:outline-none ring-0 border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								placeholder="0"
							/>
							<TokenSelector
								selectedToken={sourceToken}
								tokens={tokens}
								onTokenChange={handleSourceTokenChange}
							/>
						</div>
					</div>
				</div>

				{/* Swap Direction Button */}
				<div className="flex justify-center items-center h-0 z-10 relative">
					<button
						type="button"
						onClick={() => {
							// Swap the tokens
							const tempToken = sourceToken;
							setSourceToken(targetToken);
							setTargetToken(tempToken);
						}}
						className="flex items-center justify-center size-12 bg-[#23483c] border-4 border-solid border-[#1a3a2f] rounded-full text-primary hover:bg-[#2c5a4b] transition-colors"
					>
						<span className="material-symbols-outlined">arrow_downward</span>
					</button>
				</div>

				{/* GET Section */}
				<div className="mb-4">
					<p className="text-white/60 text-xs uppercase font-medium mb-3">GET</p>
					<div className="bg-[#23483c] rounded-lg p-4">
						<div className="flex items-center justify-end">
							<TokenSelector
								selectedToken={targetToken}
								tokens={tokens}
								onTokenChange={handleTargetTokenChange}
							/>
						</div>
					</div>
				</div>

				{/* Over the period of Section */}
				<div className="mb-6">
					<p className="text-white/60 text-sm mb-3">Over the period of</p>
					<div className="flex items-center gap-4 mb-4">
						<input
							type="number"
							value={duration}
							onChange={(e) => setDuration(e.target.value)}
							min="1"
							className="flex-1 bg-[#23483c] text-white text-2xl font-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setInterval("hour")}
							className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
								interval === "hour"
									? "bg-primary text-background-dark"
									: "bg-[#23483c] text-white/70 hover:bg-[#2c5a4b]"
							}`}
						>
							HOUR
						</button>
						<button
							onClick={() => setInterval("day")}
							className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
								interval === "day"
									? "bg-primary text-background-dark"
									: "bg-[#23483c] text-white/70 hover:bg-[#2c5a4b]"
							}`}
						>
							DAY
						</button>
						<button
							onClick={() => setInterval("week")}
							className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
								interval === "week"
									? "bg-primary text-background-dark"
									: "bg-[#23483c] text-white/70 hover:bg-[#2c5a4b]"
							}`}
						>
							WEEK
						</button>
					</div>
				</div>

				{/* Schedule/Approve Button */}
				<div className="pt-4">
					{needsApproval ? (
						<button
							onClick={handleApproveToken}
							disabled={
								isApprovingToken ||
								isApproving ||
								isCreating ||
								checkingAllowance ||
								!amount ||
								!sourceToken ||
								!address
							}
							className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-background-dark font-bold text-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isApprovingToken || isApproving
								? "APPROVING..."
								: checkingAllowance
								? "CHECKING..."
								: `APPROVE ${sourceToken?.symbol || "TOKEN"}`}
						</button>
					) : (
						<button
							onClick={handleSchedule}
							disabled={
								isCreating ||
								checkingAllowance ||
								!amount ||
								!duration ||
								!sourceToken ||
								!targetToken ||
								parseFloat(amount) <= 0 ||
								isNaN(parseFloat(amount)) ||
								!address
							}
							className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-background-dark font-bold text-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isCreating ? "CREATING..." : checkingAllowance ? "CHECKING..." : "SCHEDULE DCA ORDERS"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

