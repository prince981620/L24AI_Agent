interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  daily_volume?: number;
}

export async function getTokenInfo(tokenQuery: string): Promise<TokenInfo> {
  try {
    const response = await fetch(
      `/api/token?q=${encodeURIComponent(tokenQuery)}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch token");
    }
    const token = await response.json();
    return token;
  } catch (error) {
    console.error("Token lookup error:", error);
    throw error;
  }
}

export async function getTokenMintAddress(tokenQuery: string): Promise<string> {
  const tokenInfo = await getTokenInfo(tokenQuery);
  return tokenInfo.address;
}
