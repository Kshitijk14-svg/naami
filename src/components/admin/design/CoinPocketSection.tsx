import { fieldLabelStyle, inputStyle, textareaStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  coinPocketError: string | null;
  coinPocketSaving: boolean;
  coinPocketSaved: boolean;
  onSave: () => void;
}

export function CoinPocketSection({ settings, update, coinPocketError, coinPocketSaving, coinPocketSaved, onSave }: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Coin Pocket Card
      </h2>
      <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
            <input value={settings.coinpocket_kicker ?? ""} onChange={(e) => update("coinpocket_kicker", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Season Tag</label>
            <input value={settings.coinpocket_season_tag ?? ""} onChange={(e) => update("coinpocket_season_tag", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
            <input value={settings.coinpocket_title ?? ""} onChange={(e) => update("coinpocket_title", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title Accent (italic line)</label>
            <input value={settings.coinpocket_title_accent ?? ""} onChange={(e) => update("coinpocket_title_accent", e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Description</label>
          <textarea value={settings.coinpocket_description ?? ""} onChange={(e) => update("coinpocket_description", e.target.value)} style={textareaStyle} />
        </div>
        <div>
          <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
            Authenticity Card Specs
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Spec {n} Label</label>
                  <input value={settings[`coinpocket_spec${n}_label`] ?? ""} onChange={(e) => update(`coinpocket_spec${n}_label`, e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Spec {n} Value</label>
                  <input value={settings[`coinpocket_spec${n}_value`] ?? ""} onChange={(e) => update(`coinpocket_spec${n}_value`, e.target.value)} style={inputStyle} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Serial Code</label>
          <input value={settings.coinpocket_serial_code ?? ""} onChange={(e) => update("coinpocket_serial_code", e.target.value)} style={inputStyle} />
        </div>
        <SaveControl saving={coinPocketSaving} saved={coinPocketSaved} error={coinPocketError} onSave={onSave} label="Save Coin Pocket Card" />
      </div>
    </section>
  );
}
