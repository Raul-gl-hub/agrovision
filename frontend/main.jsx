console.log("AGROVISION STAMP vA1");
document.title = "AgroVision — RDGL";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
console.log("AGROVISION STAMP vA1");
document.title = "AgroVision — STAMP vA1";

const API = "http://localhost:8000";

console.log("AGROVISION STAMP vA1");
document.title = "AgroVision — STAMP vA1";

function App() {
  // -------- estado base --------
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState("");
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [reco, setReco] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Nutrientes
  const [nutrLatest, setNutrLatest] = useState(null);
  const [nutrHist, setNutrHist] = useState([]);
  const [nutrReco, setNutrReco] = useState(null);
  const [nutrView, setNutrView] = useState("nk"); // "nk" | "phec"

  // Cultivos
  const [crops, setCrops] = useState([]);
  const [deviceCrop, setDeviceCrop] = useState(null);
  const [pendingCrop, setPendingCrop] = useState("");

  // Umbrales (form CONTROLADO)
  const [cropForm, setCropForm] = useState(null);
  const [cropSaving, setCropSaving] = useState(false);
  const [cropMsg, setCropMsg] = useState("");

  // Control de edición / auto-refresh + “apagar” gráficos
  const [isEditingCrop, setIsEditingCrop] = useState(false);
  const [hoverUmbrales, setHoverUmbrales] = useState(false); // si el mouse está encima de la tarjeta
  const [suppressUntil, setSuppressUntil] = useState(0);
  const editIdleRef = useRef(null);

  // ---------- helpers UI ----------
  const Card = ({ title, children, style }) => (
    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", ...style }}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      {children}
    </div>
  );

  const Badge = ({ color, children }) => (
    <span style={{
      display: "inline-block", padding: "6px 10px", borderRadius: 999,
      background: color, color: "#fff", fontWeight: 700, fontSize: 12
    }}>
      {children}
    </span>
  );

  // --------- carga de dispositivos (sensores ∪ nutrientes) ---------
  useEffect(() => {
    const safe = (p) => p.then(r => (r.ok ? r.json() : [])).catch(() => []);
    Promise.all([
      safe(fetch(`${API}/sensors/devices`)),
      safe(fetch(`${API}/nutrients/devices`)),
    ])
      .then(([a, b]) => {
        const set = Array.from(new Set([...(a || []), ...(b || [])]));
        setDevices(set);
        if (!device && set.length > 0) setDevice(set[0]);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista de cultivos
  useEffect(() => {
    fetch(`${API}/crops`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => setCrops(list || []))
      .catch(console.error);
  }, []);

  // ---------- función de carga total ----------
  const loadAll = (dev) => {
    if (!dev) return;
    const safe = (p) => p.then(r => (r.ok ? r.json() : null)).catch(() => null);

    Promise.all([
      safe(fetch(`${API}/sensors/latest?device_id=${encodeURIComponent(dev)}`)),
      safe(fetch(`${API}/sensors/history?device_id=${encodeURIComponent(dev)}&hours=24`)),
      safe(fetch(`${API}/recommendations?device_id=${encodeURIComponent(dev)}`)),
      safe(fetch(`${API}/nutrients/latest?device_id=${encodeURIComponent(dev)}`)),
      safe(fetch(`${API}/nutrients/history?device_id=${encodeURIComponent(dev)}&hours=24`)),
      safe(fetch(`${API}/recommendations/nutrients?device_id=${encodeURIComponent(dev)}`)),
      safe(fetch(`${API}/devices/crop?device_id=${encodeURIComponent(dev)}`)),
    ])
      .then(([lat, hist, rec, nlat, nhist, nrec, dc]) => {
        setLatest(lat);
        setHistory(hist || []);
        setReco(rec);
        setNutrLatest(nlat || null);
        setNutrHist(nhist || []);
        setNutrReco(nrec || null);

        const ct = (dc && dc.crop_type) || null;
        setDeviceCrop(ct);
        setPendingCrop(ct || "");

        setUpdatedAt(new Date());
      })
      .catch(console.error);
  };

  useEffect(() => { loadAll(device); }, [device]);

  // Auto-refresh cada 15s (pausado si se edita o si suprimimos temporalmente)
  useEffect(() => {
    if (!device) return;
    const id = setInterval(() => {
      if (Date.now() < suppressUntil) return;
      if (isEditingCrop) return;
      loadAll(device);
    }, 15000);
    return () => clearInterval(id);
  }, [device, isEditingCrop, suppressUntil]);

  // Cargar umbrales del cultivo actual
  const loadCropProfile = (ct) => {
    if (!ct) { setCropForm(null); return; }
    fetch(`${API}/crops/${encodeURIComponent(ct)}`)
      .then(r => r.json())
      .then(data => {
        // strings para inputs controlados
        setCropForm({
          humidity_threshold: data.humidity_threshold ?? "",
          temp_high_c: data.temp_high_c ?? "",
          ph_min: data.ph_min ?? "",
          ph_max: data.ph_max ?? "",
          ec_min: data.ec_min ?? "",
          ec_max: data.ec_max ?? "",
          n_min: data.n_min ?? "",
          p_min: data.p_min ?? "",
          k_min: data.k_min ?? "",
        });
        setCropMsg("");
      })
      .catch(e => { console.error(e); setCropMsg("No se pudo cargar umbrales"); });
  };

  // Cuando cambia el cultivo activo/pendiente, recarga umbrales
  useEffect(() => {
    const ct = deviceCrop || pendingCrop;
    if (ct) loadCropProfile(ct);
    else setCropForm(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCrop, pendingCrop]);

  // ---------- edición de inputs (controlados) ----------
  const changeCropField = (field) => (e) => {
    const val = e.target.value; // string, permite vacío
    setCropForm(prev => ({ ...prev, [field]: val }));
    // marcar edición activa + rearmar temporizador
    setIsEditingCrop(true);
    if (editIdleRef.current) clearTimeout(editIdleRef.current);
    editIdleRef.current = setTimeout(() => setIsEditingCrop(false), 5000);
    // suprimir auto-refresh por un momento
    setSuppressUntil(Date.now() + 2000);
  };

  // ---------- validaciones y guardado ----------
  const validateCropForm = (f) => {
    if (f.humidity_threshold !== "" && (Number(f.humidity_threshold) < 0 || Number(f.humidity_threshold) > 100))
      return "Humedad (gatillo) debe estar entre 0 y 100.";
    if (f.ph_min !== "" && f.ph_max !== "" && Number(f.ph_min) > Number(f.ph_max))
      return "ph_min no puede ser mayor que ph_max.";
    if (f.ec_min !== "" && f.ec_max !== "" && Number(f.ec_min) > Number(f.ec_max))
      return "ec_min no puede ser mayor que ec_max.";
    return "";
  };

  const saveCropThresholds = () => {
    const ct = deviceCrop || pendingCrop;
    if (!ct || !cropForm) return;

    const err = validateCropForm(cropForm);
    if (err) { setCropMsg(err); return; }

    // normalizar: envío sólo campos con valor
    const keys = ["humidity_threshold","temp_high_c","ph_min","ph_max","ec_min","ec_max","n_min","p_min","k_min"];
    const payload = {};
    keys.forEach(k => {
      const v = cropForm[k];
      if (v !== "" && v !== null && v !== undefined) {
        payload[k] = Number(String(v).replace(",", "."));
      }
    });

    setCropSaving(true);
    setSuppressUntil(Date.now() + 2000);

    fetch(`${API}/crops/${encodeURIComponent(ct)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(data => {
        setCropForm({
          humidity_threshold: data.humidity_threshold ?? "",
          temp_high_c: data.temp_high_c ?? "",
          ph_min: data.ph_min ?? "",
          ph_max: data.ph_max ?? "",
          ec_min: data.ec_min ?? "",
          ec_max: data.ec_max ?? "",
          n_min: data.n_min ?? "",
          p_min: data.p_min ?? "",
          k_min: data.k_min ?? "",
        });
        setCropMsg("Umbrales guardados.");
        loadAll(device);
      })
      .catch(e => { console.error(e); setCropMsg("Error al guardar umbrales."); })
      .finally(() => setCropSaving(false));
  };

  const resetCropThresholds = () => {
    const ct = deviceCrop || pendingCrop;
    if (ct) loadCropProfile(ct);
  };

  // ---------- asignación de cultivo ----------
  const saveCrop = () => {
    if (!device || !pendingCrop) return;
    fetch(`${API}/devices/crop`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: device, crop_type: pendingCrop })
    })
      .then(r => r.json())
      .then(() => loadAll(device))
      .catch(console.error);
  };

  // ---------- datos para gráficos ----------
  const chartData = useMemo(
    () => (history || []).map(p => ({
      ts: new Date(p.ts),
      time: new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temperature: p.temperature,
      humidity: p.humidity
    })),
    [history]
  );

  const nutrChartData = useMemo(
    () => (nutrHist || []).map(p => ({
      time: new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      n_ppm: p.n_ppm,
      k_ppm: p.k_ppm,
      ph: p.ph,
      ec_ms: p.ec_ms
    })),
    [nutrHist]
  );

  // ---------- exportaciones ----------
  const handleExportCSV = () => {
    const rows = [
      ["device_id", "ts_iso", "temperature_c", "humidity_pct"],
      ...history.map(p => [
        device, new Date(p.ts).toISOString(), p.temperature ?? "", p.humidity ?? ""
      ])
    ];
    const csv = rows.map(r => r.map(v =>
      (typeof v === "string" && v.includes(",")) ? `"${v.replace(/"/g, '""')}"` : v
    ).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agrovision_${device || "device"}_last24h.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportNutrCSV = () => {
    const rows = [
      ["device_id", "ts_iso", "n_ppm", "p_ppm", "k_ppm", "ph", "ec_ms"],
      ...(nutrHist || []).map(p => [
        device, new Date(p.ts).toISOString(),
        p.n_ppm ?? "", p.p_ppm ?? "", p.k_ppm ?? "", p.ph ?? "", p.ec_ms ?? ""
      ])
    ];
    const csv = rows.map(r => r.map(v =>
      (typeof v === "string" && v.includes(",")) ? `"${v.replace(/"/g, '""')}"` : v
    ).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agrovision_${device || "device"}_nutrientes_24h.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- riesgo hídrico simple ----------
  const risk = useMemo(() => {
    const t = latest?.temperature ?? null;
    const h = latest?.humidity ?? null;
    if (t == null || h == null) return { level: "Desconocido", color: "#6b7280", note: "Esperando lecturas..." };
    if (h < 35 && t > 30) return { level: "ALTO", color: "#dc2626", note: "Riesgo de estrés por baja humedad y alta temperatura" };
    if ((h >= 35 && h < 50) || (t >= 27 && t <= 30)) return { level: "MEDIO", color: "#f59e0b", note: "Condiciones a monitorear" };
    return { level: "BAJO", color: "#16a34a", note: "Condiciones favorables" };
  }, [latest]);

  // ¿Debemos bloquear interacción con gráficos?
  const chartsBlocked = isEditingCrop || hoverUmbrales;

  // ---------- layout ----------
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>
      <h1 style={{ marginTop: 0 }}>AgroVision — Dashboard</h1>

      {/* Barra superior */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600 }}>
          Dispositivo:&nbsp;
          <select value={device} onChange={e => setDevice(e.target.value)}>
            <option value="">Selecciona…</option>
            {devices.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <button
          onClick={handleExportCSV}
          disabled={!history?.length}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db",
            background: history?.length ? "#111827" : "#9ca3af",
            color: "#fff", fontWeight: 600, cursor: history?.length ? "pointer" : "not-allowed"
          }}
          title="Descarga CSV (últimas 24h)"
        >
          Exportar CSV (24h)
        </button>

        <button
          onClick={handleExportNutrCSV}
          disabled={!nutrHist?.length}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db",
            background: nutrHist?.length ? "#111827" : "#9ca3af",
            color: "#fff", fontWeight: 600, cursor: nutrHist?.length ? "pointer" : "not-allowed"
          }}
          title="Descarga CSV de nutrientes (24h)"
        >
          Exportar CSV Nutrientes (24h)
        </button>

        {updatedAt && (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Actualizado: {updatedAt.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Badges */}
      {reco && (
        <div style={{ marginTop: 16 }}>
          <Badge color={
            reco.status === "ok" ? "#16a34a" :
            reco.status === "monitor" ? "#f59e0b" :
            (reco.status === "irrigate_now" || reco.status === "heat_alert") ? "#dc2626" :
            "#6b7280"
          }>
            {reco.message}
          </Badge>
        </div>
      )}

      {nutrReco && (
        <div style={{ marginTop: 8 }}>
          <span style={{
            display: "inline-block", padding: "6px 10px", borderRadius: 999,
            background:
              nutrReco.status === "action" ? "#dc2626" :
              nutrReco.status === "monitor" ? "#f59e0b" :
              nutrReco.status === "ok" ? "#16a34a" : "#6b7280",
            color: "#fff", fontWeight: 700, fontSize: 12
          }}>
            {nutrReco.message}
          </span>
        </div>
      )}

      {/* Tarjetas superiores */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <Card title="Última lectura">
          {latest ? (
            <div style={{ lineHeight: 1.7 }}>
              <div><b>device:</b> {latest.device_id || device}</div>
              <div><b>ts:</b> {new Date(latest.ts).toLocaleString()}</div>
              <div><b>temp:</b> {latest.temperature ?? "—"} °C</div>
              <div><b>humedad:</b> {latest.humidity ?? "—"} %</div>
            </div>
          ) : "—"}
        </Card>

        <Card title="Riesgo de estrés hídrico">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge color={risk.color}>{risk.level}</Badge>
            <span style={{ color: "#374151" }}>{risk.note}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Regla simple: ALTO si H&lt;35% y T&gt;30°C; MEDIO si H 35–50% o T 27–30°C.
          </div>
        </Card>

        <Card title="Mapa (placeholder)">
          <div style={{
            width: "100%", height: 180, borderRadius: 10, border: "1px dashed #9ca3af",
            display: "grid", placeItems: "center", background: "#f3f4f6", color: "#6b7280"
          }}>
            Ubicación del dispositivo<br />(-1.0, -79.0) — demo
          </div>
        </Card>

        <Card title="Cultivo">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={pendingCrop} onChange={e => setPendingCrop(e.target.value)}>
              <option value="">Sin asignar…</option>
              {crops.map(c => (
                <option key={c.crop_type} value={c.crop_type}>{c.crop_type}</option>
              ))}
            </select>
            <button
              onClick={saveCrop}
              disabled={!pendingCrop || !device}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db",
                background: (!pendingCrop || !device) ? "#9ca3af" : "#111827",
                color: "#fff", fontWeight: 700,
                cursor: (!pendingCrop || !device) ? "not-allowed" : "pointer"
              }}
            >
              Guardar
            </button>
          </div>
          {deviceCrop && (
            <div style={{ marginTop: 8 }}>
              <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                Activo: {deviceCrop}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Umbrales + Nutrientes última */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {/* Elevamos el z-index para evitar solapado con los gráficos y apagamos gráficos al pasar el mouse */}
        <Card
          title="Umbrales del cultivo"
          style={{ position: "relative", zIndex: 1000 }}
        >
          {!deviceCrop && !pendingCrop ? (
            <div style={{ color: "#6b7280" }}>Selecciona un cultivo para editar sus umbrales.</div>
          ) : !cropForm ? (
            <div style={{ color: "#6b7280" }}>Cargando…</div>
          ) : (
            <div
              onMouseEnter={() => setHoverUmbrales(true)}
              onMouseLeave={() => setHoverUmbrales(false)}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <label>Humedad gatillo (%)
                  <input
                    type="number" min="0" max="100" step="1"
                    value={cropForm.humidity_threshold}
                    onChange={changeCropField("humidity_threshold")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>Temp alta (°C)
                  <input
                    type="number" step="0.1"
                    value={cropForm.temp_high_c}
                    onChange={changeCropField("temp_high_c")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>pH mín
                  <input
                    type="number" step="0.01"
                    value={cropForm.ph_min}
                    onChange={changeCropField("ph_min")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>pH máx
                  <input
                    type="number" step="0.01"
                    value={cropForm.ph_max}
                    onChange={changeCropField("ph_max")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>EC mín (mS/cm)
                  <input
                    type="number" step="0.01"
                    value={cropForm.ec_min}
                    onChange={changeCropField("ec_min")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>EC máx (mS/cm)
                  <input
                    type="number" step="0.01"
                    value={cropForm.ec_max}
                    onChange={changeCropField("ec_max")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>N mín (ppm)
                  <input
                    type="number" step="1"
                    value={cropForm.n_min}
                    onChange={changeCropField("n_min")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>P mín (ppm)
                  <input
                    type="number" step="1"
                    value={cropForm.p_min}
                    onChange={changeCropField("p_min")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>

                <label>K mín (ppm)
                  <input
                    type="number" step="1"
                    value={cropForm.k_min}
                    onChange={changeCropField("k_min")}
                    onFocus={() => setIsEditingCrop(true)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  onClick={saveCropThresholds}
                  disabled={cropSaving}
                  style={{
                    padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db",
                    background: "#111827", color: "#fff", fontWeight: 700
                  }}
                >
                  {cropSaving ? "Guardando…" : "Guardar umbrales"}
                </button>

                <button
                  onClick={resetCropThresholds}
                  disabled={cropSaving}
                  style={{
                    padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db",
                    background: "#e5e7eb", color: "#111827", fontWeight: 700
                  }}
                >
                  Deshacer cambios
                </button>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: cropMsg.includes("guardados") ? "#16a34a" : "#6b7280", minHeight: 18 }}>
                {cropMsg || (isEditingCrop ? "Auto-refresh pausado mientras editas." : "\u00A0")}
              </div>
            </div>
          )}
        </Card>

        <Card title="Nutrientes (última)">
          {nutrLatest ? (
            <div style={{ lineHeight: 1.7 }}>
              <div><b>N:</b> {nutrLatest.n_ppm ?? "—"} ppm</div>
              <div><b>P:</b> {nutrLatest.p_ppm ?? "—"} ppm</div>
              <div><b>K:</b> {nutrLatest.k_ppm ?? "—"} ppm</div>
              <div><b>pH:</b> {nutrLatest.ph ?? "—"}</div>
              <div><b>EC:</b> {nutrLatest.ec_ms ?? "—"} mS/cm</div>
            </div>
          ) : "—"}
        </Card>
      </div>

      {/* Minigráfico con selector */}
      {!!nutrHist.length && (
        <div style={{ marginTop: 16, position: "relative", zIndex: 0 }}>
          <Card title={`Nutrientes — 24h (${nutrView === "nk" ? "N & K" : "pH & EC"})`}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => setNutrView("nk")}
                style={{
                  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db",
                  background: nutrView === "nk" ? "#111827" : "#fff",
                  color: nutrView === "nk" ? "#fff" : "#111827"
                }}
              >
                N & K
              </button>
              <button
                onClick={() => setNutrView("phec")}
                style={{
                  padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db",
                  background: nutrView === "phec" ? "#111827" : "#fff",
                  color: nutrView === "phec" ? "#fff" : "#111827"
                }}
              >
                pH & EC
              </button>
            </div>

            <div
              style={{
                width: "100%",
                height: 240,
                overflow: "hidden",
                // ⚠️ clave: apagamos interacción del gráfico si estás editando o con el mouse sobre umbrales
                pointerEvents: chartsBlocked ? "none" : "auto"
              }}
            >
              <ResponsiveContainer>
                <LineChart data={nutrChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  {nutrView === "nk" ? (
                    <>
                      <YAxis domain={[0, 'auto']} />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="n_ppm" name="N (ppm)" dot={false} />
                      <Line type="monotone" dataKey="k_ppm" name="K (ppm)" dot={false} />
                    </>
                  ) : (
                    <>
                      <YAxis yAxisId="left" domain={[4, 9]} label={{ value: 'pH', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 5]} label={{ value: 'mS/cm', angle: 90, position: 'insideRight' }} />
                      <Tooltip /><Legend />
                      <Line yAxisId="left" type="monotone" dataKey="ph" name="pH" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="ec_ms" name="EC (mS/cm)" dot={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Gráfico ambiente (también lo “apagamos” mientras editas por si acaso) */}
      {!!history.length && (
        <div style={{ marginTop: 16 }}>
          <Card title="Serie temporal (24h)">
            <div style={{ width: "100%", height: 340, pointerEvents: chartsBlocked ? "none" : "auto" }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: '%', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperatura (°C)" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humedad (%)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              Mostrando últimas {Math.min(history.length, 10)} muestras abajo.
            </div>
          </Card>

          <Card title="Histórico (últimos 10 puntos)">
            <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              {history.slice(-10).map((p, i) => (
                <li key={i}>
                  {new Date(p.ts).toLocaleTimeString()} — T: {p.temperature ?? "—"}°C · H: {p.humidity ?? "—"}%
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
