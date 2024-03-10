export const STORAGE_NETWORK_KEY = "STORAGE_NETWORK_KEY";

export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

export const L2_ETH_TOKEN_ADDRESS =
  "0x000000000000000000000000000000000000800a";
const nodeType = import.meta.env.VITE_NODE_TYPE;

export const WRAPPED_MNT =
  nodeType === "nexus-goerli"
    ? "0xEa12Be2389c2254bAaD383c6eD1fa1e15202b52A"
    : "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8";

export const NOVA_CHAIN_ID = nodeType === "nexus-goerli" ? 810182 : 810180;

export const NOVA_NFT_CONTRACT =
  nodeType === "nexus-goerli"
    ? "0xF2fe005206cF81C149EbB2D40A294F5Ac59D9E6D"
    : "";
