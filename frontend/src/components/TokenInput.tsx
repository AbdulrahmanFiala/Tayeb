import type { Token } from "../types";
import { TokenSelector } from "./TokenSelector";

interface TokenInputProps {
	label: string;
	value: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	token: Token | null;
	placeholder?: string;
	tokens?: Token[];
	onTokenChange?: (token: Token) => void;
	balance?: string;
}

export function TokenInput({
	label,
	value,
	onChange,
	readOnly = false,
	token,
	placeholder = "0",
	tokens = [],
	onTokenChange,
	balance,
}: TokenInputProps) {
	const displayBalance = balance !== undefined ? parseFloat(balance).toFixed(6) : "0.000000";
	
	return (
		<div className='bg-[#23483c] rounded-lg p-4 my-2'>
			{/* Label and Balance */}
			<div className='flex justify-between items-center mb-2'>
				<p className='text-white/80 text-sm font-medium leading-normal'>
					{label}
				</p>
				<p className='text-white/60 text-sm font-medium leading-normal'>
					Balance: {displayBalance} {token?.symbol || ""}
				</p>
			</div>

			{/* Input and Token Selector */}
			<div className='flex items-center gap-4'>
				<input
					type='text'
					inputMode='decimal'
					value={value}
					onChange={(e) => {
						let newValue = e.target.value;
						
						// Remove any characters that aren't digits or decimal point
						newValue = newValue.replace(/[^\d.]/g, '');
						
						// Ensure only one decimal point
						const parts = newValue.split('.');
						if (parts.length > 2) {
							// More than one dot, keep only the first two parts
							newValue = parts[0] + '.' + parts.slice(1).join('');
						}
						
						onChange?.(newValue);
					}}
					readOnly={readOnly}
					className='flex-1 w-full bg-transparent text-white text-3xl font-medium placeholder:text-white/40 focus:outline-none ring-0 border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
					placeholder={placeholder}
				/>

				{/* Token Select Dropdown */}
				{onTokenChange && (
					<TokenSelector
						selectedToken={token}
						tokens={tokens}
						onTokenChange={onTokenChange}
					/>
				)}
			</div>
		</div>
	);
}
