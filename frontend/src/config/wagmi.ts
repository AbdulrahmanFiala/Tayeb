import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { moonbaseAlpha } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
	appName: "Tayeb Sharia DeFi",
	projectId: "your-walletconnect-project-id", // Get from WalletConnect Cloud
	chains: [moonbaseAlpha],
	transports: {
		[moonbaseAlpha.id]: http("https://rpc.api.moonbase.moonbeam.network"),
	},
});

export { moonbaseAlpha };
