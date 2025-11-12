import { useNavigate } from "react-router";

export const DCAOrdersPage: React.FC = () => {
	const navigate = useNavigate();

	return (
		<main className='flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-16'>
			<section className='text-center mb-16'>
				<h1 className='text-4xl sm:text-5xl font-bold mb-4 tracking-tight'>
					Automate Your Crypto Investments
				</h1>
				<p className='text-lg text-white/70 max-w-2xl mx-auto mb-8'>
					Set up recurring token purchases with our Dollar Cost Averaging (DCA)
					tool. Invest consistently and grow your portfolio over time.
				</p>
				<button
					className='flex min-w-[84px] mx-auto cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-primary text-background-dark text-lg font-bold leading-normal tracking-wide hover:opacity-90 transition-opacity'
					onClick={() => navigate("/dca/new")}
				>
					<span className='truncate'>Create DCA Order</span>
				</button>
			</section>
			<section className='mb-16'>
				<h2 className='text-3xl font-bold mb-8'>Active Orders</h2>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					<div className='bg-surface rounded-xl p-6 border border-white/10 flex flex-col gap-5'>
						<div className='flex justify-between items-start'>
							<div className='flex items-center gap-3'>
								<span className='font-bold text-xl'>ETH → WBTC</span>
							</div>
							<span className='text-sm bg-background-dark/50 text-accent/80 px-2.5 py-1 rounded-full'>
								Weekly
							</span>
						</div>
						<div>
							<div className='flex justify-between text-sm text-white/70 mb-1'>
								<span>Progress</span>
								<span>8 / 24</span>
							</div>
							<div className='w-full bg-background-dark rounded-full h-2'>
								<div
									className='bg-accent h-2 rounded-full'
									style={{ width: "33%" }}
								></div>
							</div>
						</div>
						<div className='grid grid-cols-2 gap-4 text-sm'>
							<div>
								<p className='text-white/60 mb-1'>Total Invested</p>
								<p className='font-medium'>2.0 ETH</p>
							</div>
							<div>
								<p className='text-white/60 mb-1'>Next Execution</p>
								<p className='font-medium'>in 3d 14h 22m</p>
							</div>
						</div>
						<div className='flex gap-4 pt-2 border-t border-white/10'>
							<button className='flex-1 text-center py-2.5 rounded-lg bg-[#23483c] text-white font-bold rounded-lg hover:bg-[#2c5a4b] transition-colors'>
								View Details
							</button>
							<button className='flex-1 text-center py-2.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-semibold'>
								Cancel Order
							</button>
						</div>
					</div>
					<button
						className='bg-surface rounded-xl p-6 border  border-dashed focus:outline-none border-white/20 flex flex-col items-center justify-center bg-transparent text-white/50 hover:bg-white/5 hover:border-white/30 transition-all'
						onClick={() => navigate("/dca/new")}
					>
						<span
							className='material-symbols-outlined mb-2'
							style={{ fontSize: "32px" }}
						>
							add_circle
						</span>
						<span className='font-semibold'>Create New Order</span>
					</button>
				</div>
			</section>
			<section>
				<div className='flex flex-wrap items-center justify-between gap-4 mb-8'>
					<h2 className='text-3xl font-bold'>Order History</h2>
				</div>
				<div className='hidden lg:block bg-surface rounded-xl border border-white/10 overflow-hidden'>
					<table className='w-full text-left'>
						<thead className='bg-background-dark/50 text-xs text-white/60 uppercase tracking-wider'>
							<tr>
								<th className='p-4 font-medium'>Pair</th>
								<th className='p-4 font-medium'>Amount</th>
								<th className='p-4 font-medium'>Interval</th>
								<th className='p-4 font-medium'>Total Invested</th>
								<th className='p-4 font-medium'>Completed Date</th>
								<th className='p-4 font-medium'>Status</th>
							</tr>
						</thead>
						<tbody className='text-sm divide-y divide-white/10'>
							<tr>
								<td className='p-4 font-medium'>ETH → WBTC</td>
								<td className='p-4 text-white/80'>0.05 ETH</td>
								<td className='p-4 text-white/80'>Weekly</td>
								<td className='p-4 text-white/80'>1.2 ETH</td>
								<td className='p-4 text-white/80'>2023-11-20</td>
								<td className='p-4'>
									<span className='bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full'>
										Completed
									</span>
								</td>
							</tr>
							<tr>
								<td className='p-4 font-medium'>USDC → SHARIA</td>
								<td className='p-4 text-white/80'>100 USDC</td>
								<td className='p-4 text-white/80'>Bi-Weekly</td>
								<td className='p-4 text-white/80'>600 USDC</td>
								<td className='p-4 text-white/80'>2023-10-15</td>
								<td className='p-4'>
									<span className='bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full'>
										Completed
									</span>
								</td>
							</tr>
							<tr>
								<td className='p-4 font-medium'>ETH → USDC</td>
								<td className='p-4 text-white/80'>0.1 ETH</td>
								<td className='p-4 text-white/80'>Monthly</td>
								<td className='p-4 text-white/80'>0.5 ETH</td>
								<td className='p-4 text-white/80'>2023-09-01</td>
								<td className='p-4'>
									<span className='bg-red-500/20 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full'>
										Cancelled
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className='lg:hidden space-y-4'>
					<div className='bg-surface rounded-xl p-4 border border-white/10'>
						<div className='flex justify-between items-center mb-3'>
							<span className='font-bold'>ETH → WBTC</span>
							<span className='bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full'>
								Completed
							</span>
						</div>
						<div className='text-sm space-y-2 text-white/80'>
							<div className='flex justify-between'>
								<span className='text-white/60'>Amount:</span>
								<span>0.05 ETH</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Total Invested:</span>
								<span>1.2 ETH</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Completed:</span>
								<span>2023-11-20</span>
							</div>
						</div>
					</div>
					<div className='bg-surface rounded-xl p-4 border border-white/10'>
						<div className='flex justify-between items-center mb-3'>
							<span className='font-bold'>USDC → SHARIA</span>
							<span className='bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full'>
								Completed
							</span>
						</div>
						<div className='text-sm space-y-2 text-white/80'>
							<div className='flex justify-between'>
								<span className='text-white/60'>Amount:</span>
								<span>100 USDC</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Total Invested:</span>
								<span>600 USDC</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Completed:</span>
								<span>2023-10-15</span>
							</div>
						</div>
					</div>
					<div className='bg-surface rounded-xl p-4 border border-white/10'>
						<div className='flex justify-between items-center mb-3'>
							<span className='font-bold'>ETH → USDC</span>
							<span className='bg-red-500/20 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full'>
								Cancelled
							</span>
						</div>
						<div className='text-sm space-y-2 text-white/80'>
							<div className='flex justify-between'>
								<span className='text-white/60'>Amount:</span>
								<span>0.1 ETH</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Total Invested:</span>
								<span>0.5 ETH</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-white/60'>Completed:</span>
								<span>2023-09-01</span>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
};
