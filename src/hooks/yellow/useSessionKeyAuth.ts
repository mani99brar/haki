export function useSessionKeyAuth() {
  async function authenticate(address: string, signature: string) {
    const sessionKey = crypto.randomUUID();

    const res = await fetch("/api/auth/session-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, sessionKey, signature }),
    });

    if (!res.ok) {
      throw new Error("Session auth failed");
    }

    return true;
  }

  return { authenticate };
}
