"use client";

import { useEffect, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";
import { EidolonNav } from "@/components/eidolon-nav";

type GithubStatus = {
  connected: boolean;
  expired?: boolean;
  login?: string;
  scopes?: string[];
  updatedAt?: string;
};

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type SolanaProvider = { connect: () => Promise<{ publicKey?: { toString: () => string } }> ; disconnect?: () => Promise<void> };

export default function Connectors() {
  const [github, setGithub] = useState<GithubStatus | null>(null);
  const [wallet, setWallet] = useState<{ kind: "ethereum" | "solana"; address: string; chain?: string } | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");

  async function connectWallet(kind: "ethereum" | "solana") {
    setWalletError(""); setWalletBusy(true);
    try {
      if (kind === "ethereum") {
        const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
        if (!provider) throw new Error("No compatible EVM wallet was detected. Install a browser wallet such as MetaMask or Coinbase Wallet.");
        const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
        if (!accounts?.[0]) throw new Error("The wallet did not return an account.");
        const chainId = await provider.request({ method: "eth_chainId" }) as string;
        const chain = chainId === "0x1" ? "Ethereum" : chainId === "0x89" ? "Polygon" : chainId === "0xa" ? "Optimism" : chainId === "0xa4b1" ? "Arbitrum" : chainId;
        setWallet({ kind, address: accounts[0], chain });
        localStorage.setItem("eidolon_wallet", JSON.stringify({ kind, address: accounts[0], chain }));
      } else {
        const provider = (window as Window & { solana?: SolanaProvider }).solana;
        if (!provider) throw new Error("No compatible Solana wallet was detected.");
        const result = await provider.connect();
        const address = result.publicKey?.toString();
        if (!address) throw new Error("The wallet did not return a public key.");
        setWallet({ kind, address, chain: "Solana" });
        localStorage.setItem("eidolon_wallet", JSON.stringify({ kind, address, chain: "Solana" }));
      }
    } catch (error) { setWalletError(error instanceof Error ? error.message : "Wallet connection failed."); }
    finally { setWalletBusy(false); }
  }

  function disconnectWallet() { setWallet(null); localStorage.removeItem("eidolon_wallet"); }

  useEffect(() => {
    try { const saved = localStorage.getItem("eidolon_wallet"); if (saved) setWallet(JSON.parse(saved)); } catch {}
    fetch("/api/connectors/github", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.ok) setGithub(data);
        else setGithub({ connected: false });
      })
      .catch(() => setGithub({ connected: false }));
  }, []);

  const githubConnected = github?.connected === true;

  return (
    <main className="info-page">
      <EidolonNav section="connectors" />
      <section className="info-hero connector-hero">
        <div className="connector-hero-mark"><EidolonIcon name="verified" size={34} /></div><span className="eyebrow">SOURCE / PROOF / CAPABILITY</span>
        <h1>Your sources.<br/><em>Your proof.</em></h1>
        <p>Connectors establish real relationships with external systems. They are never decorative badges.</p>
      </section>

      <section className="connector-grid">
        <article className="connector-card active">
          <div>
            <span className="connector-status">{github === null ? "CHECKING" : githubConnected ? "CONNECTED" : github?.expired ? "EXPIRED" : "AVAILABLE"}</span>
            <span className="connector-mark"><EidolonIcon name="verified" size={20} /></span>
          </div>
          <h2>GitHub</h2>
          <p>Connect GitHub to prove control of supported repositories. Verification uses the real provider account and repository.</p>
          {githubConnected ? (
            <>
              <span className="connector-muted">Connected as <strong>{github.login}</strong></span>
              <span className="connector-muted">Scopes: {(github.scopes ?? []).join(", ") || "provider-managed"}</span>
            </>
          ) : github?.expired ? (
            <a className="connector-muted" href="/auth?next=/connectors">Reconnect GitHub →</a>
          ) : (
            <a className="connector-muted" href="/auth?next=/launch">Sign in to continue →</a>
          )}
        </article>

        <article className={`connector-card ${wallet ? "active" : ""}`}>
          <div><span className="connector-status">{wallet ? "CONNECTED" : "WALLET"}</span><span className="connector-mark"><EidolonIcon name="economy" size={20} /></span></div>
          <h2>Wallets</h2>
          <p>Connect a browser wallet to use wallet-aware capabilities. EIDOLON never asks for a private key or recovery phrase.</p>
          {wallet ? <><span className="connector-muted">{wallet.chain} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span><button type="button" className="connector-connect-button" onClick={disconnectWallet}>Disconnect</button></> : <div className="connector-wallet-actions"><button type="button" className="connector-connect-button" disabled={walletBusy} onClick={() => connectWallet("ethereum")}>{walletBusy ? "Connecting…" : "Connect EVM"}</button><button type="button" className="connector-connect-button secondary" disabled={walletBusy} onClick={() => connectWallet("solana")}>Solana</button></div>}
          {walletError && <span className="connector-error" role="alert">{walletError}</span>}
        </article>
        <article className="connector-card">
          <div><span className="connector-status">COMING LATER</span><span className="connector-mark">◈</span></div>
          <h2>Wallets</h2>
          <p>Connect a browser wallet to use wallet-aware capabilities. EIDOLON never asks for a private key or recovery phrase.</p>
          {wallet ? <><span className="connector-muted">{wallet.chain} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span><button type="button" className="connector-connect-button" onClick={disconnectWallet}>Disconnect</button></> : <div className="connector-wallet-actions"><button type="button" className="connector-connect-button" disabled={walletBusy} onClick={() => connectWallet("ethereum")}>{walletBusy ? "Connecting…" : "Connect EVM"}</button><button type="button" className="connector-connect-button secondary" disabled={walletBusy} onClick={() => connectWallet("solana")}>Solana</button></div>}
          {walletError && <span className="connector-error" role="alert">{walletError}</span>}
        </article>
        <article className="connector-card">
          <div><span className="connector-status">COMING LATER</span><span className="connector-mark">◇</span></div>
          <h2>Platforms</h2>
          <p>App stores, games and brokerages require their own authorization and policy rails before they can be represented as connected.</p>
          <span className="connector-muted">Not connected</span>
        </article>
      </section>

      <section className="support-note">
        <span className="eyebrow">THE RULE</span>
        <h2>Connection is evidence, not decoration.</h2>
        <p>A connector should only unlock claims that its underlying provider can actually prove.</p>
      </section>
    </main>
  );
}
