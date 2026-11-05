import { useState } from "react";
import { canvasMessage, useCanvasStatus, useConnectCanvas, useDisconnectCanvas } from "../lib/canvas";
import { ListRow } from "./Card";
import { PrimaryButton } from "./PrimaryButton";

const inputClass =
  "w-full rounded-button border border-card-border bg-page/30 px-3 py-2 text-[14px] text-ink";

/** The Canvas row in Settings → Connected Accounts: connect form, or connected account + disconnect. */
export function CanvasConnect() {
  const status = useCanvasStatus();
  const connect = useConnectCanvas();
  const disconnect = useDisconnectCanvas();
  const [open, setOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");

  const connected = status.data?.connected ? status.data : null;

  if (connected) {
    return (
      <ListRow className="justify-between">
        <div className="min-w-0">
          <p className="text-[15px] text-ink">Canvas</p>
          <p className="truncate text-[12.5px] text-ink-soft-55">
            {connected.accountName ?? "Connected"} · {new URL(connected.baseUrl).host}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Disconnect Canvas? Also delete the access token in Canvas (Account → Settings → Approved Integrations) to fully revoke it.")) {
              disconnect.mutate();
            }
          }}
          disabled={disconnect.isPending}
          className="shrink-0 rounded-pill border border-ink/25 px-3.5 py-1.5 text-[13px] font-semibold text-ink"
        >
          Disconnect
        </button>
      </ListRow>
    );
  }

  return (
    <div className="border-t border-divider px-[18px] py-3">
      <div className="flex items-center justify-between">
        <span className="text-[15px] text-ink">Canvas</span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={status.isPending}
            className="rounded-pill border border-ink/25 px-3.5 py-1.5 text-[13px] font-semibold text-ink"
          >
            Connect
          </button>
        )}
      </div>

      {open && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            connect.mutate(
              { baseUrl, token },
              {
                onSuccess: () => {
                  setToken("");
                  setOpen(false);
                },
              },
            );
          }}
        >
          <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink-soft-62">
            <li>Log in to Canvas in your browser and copy its address (for example <code>school.instructure.com</code>).</li>
            <li>
              In Canvas, open <strong>Account → Settings</strong>, scroll to <strong>Approved Integrations</strong>, and
              click <strong>+ New Access Token</strong>. Name it "Morning" and set an expiry if you like.
            </li>
            <li>Copy the token Canvas shows (it's only shown once) and paste it below.</li>
          </ol>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">Canvas address</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="school.instructure.com"
              autoComplete="url"
              className={inputClass}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">Access token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              className={inputClass}
              required
            />
          </label>
          <p className="text-[12px] leading-relaxed text-ink-soft-55">
            The token is stored encrypted on your server and only used to read assignments and due
            dates. Morning never submits or changes anything in Canvas.
          </p>
          {connect.isError && <p className="text-[13px] text-ink">{canvasMessage(connect.error)}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-button border border-ink/25 py-3 text-[14px] font-semibold text-ink"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={connect.isPending || !baseUrl.trim() || !token.trim()}>
              {connect.isPending ? "Checking…" : "Connect"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </div>
  );
}
