
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import {
  BarChart3, RefreshCw
} from 'lucide-react';

// Tipos
import { MGIData, Deliberation, TradeInput, TradeLogInput, ActiveSetup } from './types';

// Componentes
import { Sidebar } from './components/Sidebar';
import { SidebarV2 } from './components/Sidebar_v2';
import { TasksSidebar } from './components/TasksSidebar';
import { MGIOutput } from './components/MGIOutput';
import { AgentFeed } from './components/AgentFeed';
import { MentalCheckDialog, WendyCheckInput } from './components/MentalCheckDialog';
import { TradeDialog } from './components/TradeDialog';
import { TradeLogDialog } from './components/TradeLogDialog';
import { CierreDiaDialog } from './components/CierreDiaDialog';
import { ChatBar } from './components/ChatBar';

// Utils
const buildHistoryPayload = (delibs: Deliberation[]) => {
  // Tomamos solo las últimas 5 para no saturar la ventana de contexto
  const recent = delibs.slice(-5);
  const history: any[] = [];
  recent.forEach(d => {
    history.push({ role: 'user', parts: [{ text: d.input || '...' }] });
    history.push({ role: 'model', parts: [{ text: d.output }] });
  });
  return history;
};

import {
  buildPlanVueloPrompt,
  buildAperturaPrompt,

  buildUpdatePrompt,
  buildGestionPrompt,
  buildTradeLogPrompt,
  buildCierreDiaPrompt,
  buildChatPrompt,
  getSystemInstructionForTask
} from './src/utils/promptBuilder';
import { saveDeliberation } from './src/services/deliberationService';

// --- HELPER: PARSE AXE SETUP ---
async function parseAndSaveAxeSetup(axeOutput: string) {
  // REGEX MEJORADO: Más flexible con espacios y caracteres de tabla
  const tableRegex = /\|\s*([^|]+?)\s*\|\s*([^|]*?(?:LONG|SHORT)[^|]*?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/;
  const match = axeOutput.match(tableRegex);
  
  if (!match) return null;
  
  const setup_name = match[1].trim();
  const direction = match[2].trim().includes('LONG') ? 'LONG' : 'SHORT';
  const zone_price = parseFloat(match[3]) || parseFloat(match[5]);
  const entry_limit = parseFloat(match[5]);
  const stop_loss = parseFloat(match[6]);
  const take_profit = parseFloat(match[7]);
  
  // Calcular invalidación: SL + 2 pts adicionales (o -2 para LONG)
  const invalidation_price = direction === 'LONG' 
    ? stop_loss - 2.0 
    : stop_loss + 2.0;
  
  // Calcular expiración (20 min por defecto para esta fase)
  const expiry_time = new Date(Date.now() + 20 * 60000).toISOString();
  
  const setup: Partial<ActiveSetup> = {
    setup_name,
    direction,
    zone_price,
    trigger_condition: match[4].trim(),
    entry_limit,
    stop_loss,
    take_profit,
    invalidation_price,
    expiry_time,
    status: 'WAITING'
  };

  try {
    await fetch('/api/active_setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setup)
    });
    console.log("✅ Auto-parsed Setup saved:", setup_name);
  } catch (e) {
    console.error("Error saving auto-parsed setup:", e);
  }
}

import { useUpdateLimit } from './src/hooks/useUpdateLimit';
import { getDeliberations, saveTradeLog } from './src/services/deliberationService';
import { SYSTEM_INSTRUCTIONS } from './src/systemInstructions';
import { evaluateTaylorRisk, evaluateActiveRisk } from './src/utils/riskEngine';

const PHASE_1_INSTRUCTION = `${SYSTEM_INSTRUCTIONS.core}\n\n${SYSTEM_INSTRUCTIONS.jim_planVuelo}\n\n${SYSTEM_INSTRUCTIONS.wendy_planVuelo}`;

// --- COMPONENTES AUXILIARES ---
const ActiveSetupBadge = ({ setup }: { setup: ActiveSetup | null }) => {
  if (!setup || setup.status === 'NONE' || setup.status === 'CANCELLED') return null;
  
  if (setup.status === 'TRIGGERED') {
    const isLong = setup.direction === 'LONG';
    return (
      <div className={`flex items-center gap-4 px-6 py-2.5 rounded-2xl backdrop-blur-2xl bg-[#0a0f1c]/90 border transition-all duration-500
        ${isLong 
          ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.5)] bg-emerald-500/5' 
          : 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.5)] bg-rose-500/5'}`}>
        <div className="flex flex-col">
          <span className={`text-xs font-black tracking-[0.15em] uppercase leading-none mb-1.5
            ${isLong ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]'}`}
            style={{ fontFamily: "'Oxanium', cursive" }}>
            {isLong ? '▲' : '▼'} {setup.direction} — GO
          </span>
          <div className="flex items-center gap-3 opacity-90">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Target:</span>
            <span className="text-sm font-mono text-white font-bold tracking-tighter">{setup.take_profit.toFixed(2)}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Stop:</span>
            <span className="text-sm font-mono text-white font-bold tracking-tighter">{setup.stop_loss.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (setup.status === 'WAITING') {
    return (
      <div className="flex items-center gap-4 px-6 py-3 rounded-2xl backdrop-blur-2xl bg-[#0a0f1c]/80 border border-white/5 animate-pulse">
        <span className="text-xs font-black text-white/60 uppercase tracking-[0.25em]"
          style={{ fontFamily: "'Oxanium', cursive" }}>
          ⏳ {setup.direction} — ZONA: {setup.zone_price.toFixed(2)}
        </span>
      </div>
    );
  }

  if (setup.status === 'EXPIRED') {
     return (
      <div className="flex items-center gap-4 px-6 py-2 rounded-2xl border border-white/5 bg-white/5 opacity-40">
        <span className="text-xs font-mono text-white/50 uppercase tracking-widest">
          ✕ SETUP EXPIRADO
        </span>
      </div>
    );
  }
  
  return null;
};

export default function App() {
  const [marketData, setMarketData] = useState<MGIData | null>(null);
  const [phase, setPhase] = useState<'IDLE' | 'STANDBY' | 'LAUNCHED'>('IDLE');
  const [mgiDashboard, setMgiDashboard] = useState<string>("");
  const [deliberations, setDeliberations] = useState<Deliberation[]>(() => {
    const saved = localStorage.getItem("SIEBEN_DELIBERATIONS");
    return saved ? JSON.parse(saved) : [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [mentalCheck, setMentalCheck] = useState("");
  const [isMentalCheckOpen, setIsMentalCheckOpen] = useState(false); // New state for dialog
  const [apiError, setApiError] = useState<string | null>(null);
  const [autoTriggeredTasks, setAutoTriggeredTasks] = useState<Set<string>>(new Set());
  const [historyItems, setHistoryItems] = useState<Deliberation[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("SIEBEN_COMPLETED_TASKS");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Limitador de actualizaciones (5 por hora)
  const { canUpdate, registerUpdate, updateCount } = useUpdateLimit(100, 3600000);

  // New session session flows state
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isTradeLogOpen, setIsTradeLogOpen] = useState(false);
  const [isCierreDiaOpen, setIsCierreDiaOpen] = useState(false);
  const [activeTrade, setActiveTrade] = useState<TradeInput | null>(() => {
    const saved = localStorage.getItem("SIEBEN_ACTIVE_TRADE");
    return saved ? JSON.parse(saved) : null;
  });
  const [lastUpdateAttempt, setLastUpdateAttempt] = useState(0); // For rate limiting

  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [currentRegime, setCurrentRegime] = useState<string>("Desconocido");

  // Default balance in USD
  const [balance, setBalance] = useState(localStorage.getItem("SIEBEN_BALANCE_USD") || "50000");
  const [drawdownMax, setDrawdownMax] = useState(localStorage.getItem("SIEBEN_DRAWDOWN_MAX") || "2");
  const [marginPerContract, setMarginPerContract] = useState(localStorage.getItem("SIEBEN_MARGIN_CONTRACT") || "3000");

  // --- RELAY CONNECTION STATE ---
  const [relayStatus, setRelayStatus] = useState<'DISCONNECTED' | 'WAITING' | 'CONNECTED'>('DISCONNECTED');
  const lastProcessedTimeRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  
  // --- LIVE PRICE & SETUP TRACKING ---
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>('flat');
  const [activeSetup, setActiveSetup] = useState<ActiveSetup | null>(null);

  useEffect(() => {
    localStorage.setItem("SIEBEN_BALANCE_USD", balance);
    localStorage.setItem("SIEBEN_DRAWDOWN_MAX", drawdownMax);
    localStorage.setItem("SIEBEN_MARGIN_CONTRACT", marginPerContract);
  }, [balance, drawdownMax, marginPerContract]);

  useEffect(() => {
    localStorage.setItem("SIEBEN_DELIBERATIONS", JSON.stringify(deliberations));
  }, [deliberations]);

  useEffect(() => {
    localStorage.setItem("SIEBEN_COMPLETED_TASKS", JSON.stringify(Array.from(completedTasks)));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem("SIEBEN_ACTIVE_TRADE", JSON.stringify(activeTrade));
  }, [activeTrade]);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio?.hasSelectedApiKey) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(selected);
      }
    };
    checkKey();

    // Recuperar historial del backend al iniciar
    const fetchHistory = async () => {
      try {
        const history = await getDeliberations();
        if (history && history.length > 0) {
          console.log("Recuperados", history.length, "registros del backend");
          setHistoryItems(history as unknown as Deliberation[]);
        }
      } catch (e) {
        console.error("Error cargando historial de deliberaciones:", e);
      }
    };
    fetchHistory();

    // A-01: Hidratación inicial de datos MGI (VAH, VAL, POC, ATR)
    const fetchInitialMgi = async () => {
      try {
        const response = await fetch('/api/marketdata/pre-market');
        const data = await response.json();
        if (data && !data.error && !data.message) {
          console.log("🏢 Initial MGI Hydration:", data);
          handleDataIngest(data);
        }
      } catch (e) {
        console.warn("No se pudo hidratar MGI inicial:", e);
      }
    };
    fetchInitialMgi();
  }, []);

  const openKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio?.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setApiError(null);
    }
  };

  // Al recibir datos del Relay, actualizamos fusionando con los datos previos.
  const handleDataIngest = (newData: any) => {
    console.log("📥 MGI Data Received:", newData);
    setMarketData(prev => {
      const newPrice = newData.PRICE?.candle?.close;
      if (newPrice && prev?.PRICE?.candle?.close) {
        if (newPrice > prev.PRICE.candle.close) setPriceDirection('up');
        else if (newPrice < prev.PRICE.candle.close) setPriceDirection('down');
        setPrevPrice(prev.PRICE.candle.close);
      }

      if (!prev) return newData;
      // Fusionamos los objetos. Si un campo es un objeto (como MGI_RTH), lo actualizamos.
      const merged = { ...prev };
      for (const key in newData) {
        if (typeof newData[key] === 'object' && newData[key] !== null && !Array.isArray(newData[key])) {
          merged[key] = { ...(merged[key] || {}), ...newData[key] };
        } else {
          merged[key] = newData[key];
        }
      }
      return merged;
    });
    setApiError(null);
  };

  // Esta función es la que realmente gasta créditos de API. Solo se llama manual.
  const executeMgiAnalysis = async (data: MGIData) => {
    setIsProcessing(true);
    setApiError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash', // Optimization: Use Flash for Phase 1
        contents: `PROCESAR JSON PARA TABLERO MGI: ${JSON.stringify(data)}`,
        config: { systemInstruction: PHASE_1_INSTRUCTION }
      });

      setMgiDashboard(res.text || "Error generando tablero MGI.");
      setPhase('STANDBY');
    } catch (err: any) {
      if (err.message?.includes("429")) setApiError("CUOTA AGOTADA (429). Use una API Key institucional.");
      else setApiError(`FALLO FASE 1: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RELAY POLLING MECHANISM ---
  useEffect(() => {
    const interval = setInterval(async () => {
      // 1. Fetch Market Data Polling
      try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data) {
          if (data.status === 'JSON_SUCCESS' || data.status === 'PLAIN_TEXT_RECEIVED') {
            setRelayStatus('CONNECTED');
            if (data.timestamp && data.timestamp !== lastProcessedTimeRef.current && data.parsed_data) {
              lastProcessedTimeRef.current = data.timestamp;
              handleDataIngest(data.parsed_data);
            }
          } else {
            setRelayStatus('WAITING');
          }
        }
      } catch (err) {
        setRelayStatus('DISCONNECTED');
      }

      // 2. Fetch Active Setup Polling
      try {
        const setupRes = await fetch('/api/active_setup');
        const setupData = await setupRes.json();
        setActiveSetup(setupData);
      } catch (e) {
        console.warn("Failed to fetch active setup");
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const triggerTradingPlan = () => {
    let currentData = marketData;

    // Si NO hay datos (Simulación), inyectamos mock y ejecutamos Fase 1 (MGI)
    if (!currentData) {
      const mock: MGIData = {
        PRICE: {
          candle: { open: 24827.00, high: 24830.75, low: 24823.50, close: 24829.75 },
          VWAP_ETH: 24892.25, VWAP_RTH: 24848.75, VWAP_RTH_1SD_UP: 24898.25, VWAP_RTH_1SD_DN: 24799.50, VWAP_RTH_2SD_UP: 24947.50, VWAP_RTH_2SD_DN: 24750.00
        },
        MGI_RTH: { Y_MAX: 24961.75, Y_MIN: 24748, ONH: 24985.25, ONL: 24825.25, Y_VAH: 24961.75, Y_POC: 24887.47, Y_VAL: 24813.19 },
        MGI_MACRO: { VIX: 20.53, ATR_15MIN: 28.99, ATR_3DAY_SMA: 297.58, VOLUMEN_T1: 2096712, VOLUMEN_T2: 1828804, VOLUMEN_20DAY_SMA: 2066811, SHAPE_SEMANA_ANTERIOR: "D-Shape", SHAPE_DIA_ANTERIOR: "D-Shape" },
        MGI_NODES: { POCs_5D: [24887.47, 25099.32, 24765.12, 24716.53, 24777.74], HVNs_3D: [24801.43, 24886.93], LVNs_3D: [24812.12, 24897.62] }
      };

      console.log("⚠️ SIMULACIÓN ACTIVADA");
      setMarketData(mock);
      executeMgiAnalysis(mock);
      currentData = mock;
    }

    if (!mentalCheck.trim()) {
      setIsMentalCheckOpen(true);
    } else {
      launchFlightPlan(undefined, currentData);
    }
  };

  const launchFlightPlan = async (wendyData?: WendyCheckInput, overrideData?: MGIData) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const dataToUse = overrideData || marketData;
    if (!dataToUse) {
      isProcessingRef.current = false;
      return;
    }

    if (!wendyData && !mentalCheck.trim()) {
      isProcessingRef.current = false;
      return;
    }

    // Use either the strongly typed data from the dialog or a fallback manual string
    const finalData: WendyCheckInput = wendyData || {
      mentalCheck: mentalCheck,
      energyLevel: 'Medio',
      distractions: 'Ninguna'
    };

    setIsProcessing(true);
    setApiError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = await buildPlanVueloPrompt({
        account_balance: parseFloat(balance),
        risk_percent_per_trade: 1, // Legacy rule
        drawdown_max_percent: parseFloat(drawdownMax),
        margin_per_contract: parseFloat(marginPerContract),
        marketData: dataToUse,
        mentalCheck: finalData.mentalCheck,
        energy_level: finalData.energyLevel,
        distractions: finalData.distractions
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction: getSystemInstructionForTask('planVuelo'),
        }
      });

      const text = res.text || "FALLO EN EL LANZAMIENTO.";
      const newDelib: Deliberation = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        input: finalData.mentalCheck,
        output: text,
        status: text.includes("🟢 APROBADA") ? "READY" : "VETOED"
      };

      setDeliberations([newDelib]); // Restaura la UI como "Nueva Sesion"
      setHistoryItems(prev => [newDelib, ...prev]);

      try {
        await saveDeliberation({
          taskId: 'planVuelo',
          input: finalData.mentalCheck,
          output: text,
          agents: ['jim', 'taylor', 'wendy', 'wags'],
          status: newDelib.status
        });
      } catch (e) {
        console.error("No se pudo guardar la deliberación", e);
      }

      setPhase('LAUNCHED');
      setMentalCheck("");
      setCompletedTasks(prev => new Set(prev).add('planVuelo'));
    } catch (err: any) {
      if (err.message?.includes("429")) setApiError("CUOTA AGOTADA (429). Cambie su API Key.");
      else setApiError(`FALLO FASE 2: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleAperturaAnalysis = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsProcessing(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = await buildAperturaPrompt({
        marketData,
        balance: parseFloat(balance),
        drawdownMax: parseFloat(drawdownMax),
        marginPerContract: parseFloat(marginPerContract)
      });

      // --- PHASE 1: JIM (Context & Regime) ---
      const res1 = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('apertura_phase1') }
      });

      const jimOutput = res1.text || "Error en Fase 1 (Jim).";
      
      // Parsear REGIME_ANALYSIS
      let regimeContextText = "";
      const regimeMatch = jimOutput.match(/```json\n([\s\S]*?)\n```/);
      if (regimeMatch) {
        try {
          const regimeData = JSON.parse(regimeMatch[1]);
          setCurrentRegime(`${regimeData.REGIME_ANALYSIS?.sesgo_direccional} - ${regimeData.REGIME_ANALYSIS?.contexto_ib} (Conf: ${regimeData.REGIME_ANALYSIS?.regime_confidence_score})`);
        } catch (e) {
          console.error("Error parsing regime JSON", e);
        }
        regimeContextText = `\n\n[!!! RÉGIMEN ESTRUCTURAL DETECTADO (AUDITORÍA JIM) !!!]\n${regimeMatch[1]}\n\nJim ha dictaminado este régimen. Axe y Taylor DEBEN cumplir estrictamente las reglas de filtrado y exposición asociadas.`;
      }

      // --- PHASE 2: AXE, TAYLOR & THE CHAIN ---
      const res2 = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: jimOutput }] },
          { role: 'user', parts: [{ text: `Jim ha entregado su diagnóstico.${regimeContextText}\n\nContinúen con la ejecución en cascada: Axe, Taylor, Wendy y Wags.` }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('apertura_phase2') }
      });

      const chainOutput = res2.text || "Error en Fase 2 (Chain).";
      let fullText = jimOutput + "\n\n" + chainOutput;

      // --- AUTO-PARSE AXE SETUP ---
      if (chainOutput.includes("AXE_DONE")) {
         await parseAndSaveAxeSetup(chainOutput);
      }

      // --- PERSISTENCIA TAYLOR_SIZING ---
      const taylorMatch = chainOutput.match(/```json\n([\s\S]*?)\n```/);
      if (taylorMatch) {
          try {
              const taylorData = JSON.parse(taylorMatch[1]);
              if (taylorData.TAYLOR_SIZING) {
                  // Agregar capital snapshot vivo
                  taylorData.TAYLOR_SIZING.capital_snapshot = parseFloat(balance);
                  fetch('/api/taylor/sessions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(taylorData)
                  }).catch(e => console.error("Error persistiendo Taylor Sizing", e));
              }
          } catch (e) { console.error("Error parsing Taylor JSON", e); }
      }

      // Early Exit post-processing (Jim checks)
      const upperText = fullText.toUpperCase();
      const isChoppy = upperText.includes("CHOPPY") || upperText.includes("ILEGIBLE") || upperText.includes("FRICCIÓN") || upperText.includes("BLOQUEADA");
      if (isChoppy) {
        const cutIdx = fullText.indexOf("STATUS: JIM_DONE");
        if (cutIdx !== -1) {
          fullText = fullText.substring(0, cutIdx + "STATUS: JIM_DONE".length);
        }
        fullText += "\n\n⚠️ **[SISTEMA - EARLY EXIT]**: Jim detectó mercado inoperable. El resto del ciclo fue abortado.";
      } else {
        const taylorEval = evaluateTaylorRisk(fullText);
        fullText += "\n\n" + taylorEval.message;
      }

      const delibData = {
        taskId: 'apertura',
        input: `Apertura Invocada (08:55 Vector)`,
        output: fullText,
        agents: ['core', 'jim', 'axe', 'wendy', 'wags', 'taylor'],
        status: 'COMPLETED'
      };
      await saveDeliberation(delibData);

      const newDelib: Deliberation = {
        id: `apertura-${Date.now()}`,
        timestamp: Date.now(),
        input: delibData.input,
        output: fullText,
        status: "COMPLETED"
      };
      setDeliberations(prev => [...prev, newDelib]);
      setCompletedTasks(prev => new Set(prev).add('apertura'));
    } catch (err: any) {
      setApiError(`FALLO ANALISIS APERTURA: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };



  const handleUpdateAnalysis = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!completedTasks.has('planVuelo')) {
      setApiError("ERROR: Debe completar el Plan de Vuelo antes de actualizar.");
      isProcessingRef.current = false;
      return;
    }
    if (!canUpdate) {
      setApiError(`LÍMITE ALCANZADO: 100 actualizaciones por hora. Intente más tarde.`);
      isProcessingRef.current = false;
      return;
    }

    setIsProcessing(true);
    setApiError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = await buildUpdatePrompt({
        marketData,
        balance: parseFloat(balance),
        drawdownMax: parseFloat(drawdownMax),
        marginPerContract: parseFloat(marginPerContract)
      });

      // --- PHASE 1: JIM ---
      const res1 = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          // Use a smaller history window for updates to break long output patterns
          ...buildHistoryPayload(deliberations.slice(-2)),
          { role: 'user', parts: [{ text: prompt + "\n\nIMPORTANTE: Jim, sigue ESTRICTAMENTE el formato de MÁXIMO 3 BULLETS CORTOS para este reporte estructural." }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('actualizacion_phase1') }
      });

      const jimOutput = res1.text || "Error en Fase 1 (Jim).";
      
      // Parsear REGIME_ANALYSIS
      let regimeContextText = "";
      const regimeMatch = jimOutput.match(/```json\n([\s\S]*?)\n```/);
      if (regimeMatch) {
         try {
           const regimeData = JSON.parse(regimeMatch[1]);
           const newRegime = `${regimeData.REGIME_ANALYSIS?.sesgo_direccional} - ${regimeData.REGIME_ANALYSIS?.contexto_ib} (Conf: ${regimeData.REGIME_ANALYSIS?.regime_confidence_score})`;
           setCurrentRegime(newRegime);
         } catch (e) { console.error("Error parsing regime JSON update", e); }
         regimeContextText = `\n\n[!!! RÉGIMEN ESTRUCTURAL DETECTADO (AUDITORÍA JIM) !!!]\n${regimeMatch[1]}\n\nJim ha dictaminado este régimen. Axe y Taylor DEBEN cumplir estrictamente las reglas de filtrado y exposición asociadas.`;
      }

      // --- PHASE 2: AXE, TAYLOR & THE CHAIN ---
      const res2 = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations.slice(-2)),
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: jimOutput }] },
          { role: 'user', parts: [{ text: `Jim ha entregado su diagnóstico.${regimeContextText}\n\nContinúen con la ejecución en cascada: Axe y Taylor.` }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('actualizacion_phase2') }
      });

      const chainOutput = res2.text || "Error en Fase 2 (Chain).";
      let fullText = jimOutput + "\n\n" + chainOutput;
      
      // --- AUTO-PARSE AXE SETUP (Update) ---
      if (chainOutput.includes("AXE_DONE")) {
         await parseAndSaveAxeSetup(fullText); // Use fullText to be safe
      }

      // --- PERSISTENCIA TAYLOR_SIZING (Update) ---
      const taylorMatch = chainOutput.match(/```json\n([\s\S]*?)\n```/);
      if (taylorMatch) {
          try {
              const taylorData = JSON.parse(taylorMatch[1]);
              if (taylorData.TAYLOR_SIZING) {
                  taylorData.TAYLOR_SIZING.capital_snapshot = parseFloat(balance);
                  fetch('/api/taylor/sessions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(taylorData)
                  }).catch(e => console.error("Error persistiendo Taylor Sizing (Update)", e));
              }
          } catch (e) { console.error("Error parsing Taylor JSON update", e); }
      }

      // Early Exit post-processing
      const upperText = fullText.toUpperCase();
      const isChoppy = upperText.includes("CHOPPY") || upperText.includes("ILEGIBLE") || upperText.includes("FRICCIÓN") || upperText.includes("BLOQUEADA");
      if (isChoppy) {
        const cutIdx = fullText.indexOf("STATUS: JIM_DONE");
        if (cutIdx !== -1) {
          fullText = fullText.substring(0, cutIdx + "STATUS: JIM_DONE".length);
        }
        fullText += "\n\n⚠️ **[SISTEMA - EARLY EXIT]**: Jim detectó mercado inoperable. El resto del ciclo fue abortado.";
      } else {
        const taylorEval = evaluateTaylorRisk(fullText);
        fullText += "\n\n" + taylorEval.message;
      }

      const delibData = {
        taskId: 'actualizacion',
        input: `Update Request #${updateCount + 1}`,
        output: fullText,
        agents: ['core', 'jim', 'axe', 'wendy', 'wags', 'taylor'],
        status: 'COMPLETED'
      };
      await saveDeliberation(delibData);
      registerUpdate();

      const newDelib: Deliberation = {
        id: `update-${Date.now()}`,
        timestamp: Date.now(),
        input: delibData.input,
        output: fullText,
        status: "COMPLETED"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO ACTUALIZACIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleGestionTrade = async (trade: TradeInput) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setActiveTrade(trade);
    setIsTradeDialogOpen(false);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // ── FRESH SNAPSHOT: fetch live price from relay right now ──
      let freshMarketData = marketData;
      try {
        const freshRes = await fetch('/api/status');
        const freshJson = await freshRes.json();
        if (freshJson?.parsed_data) {
          // Merge: keep accumulated MGI_RTH/MACRO/NODES, overlay fresh PRICE
          freshMarketData = { ...(marketData || {}), ...freshJson.parsed_data };
          // Also deep-merge sub-objects so accumulated keys are not lost
          for (const key in freshJson.parsed_data) {
            if (typeof freshJson.parsed_data[key] === 'object' && freshJson.parsed_data[key] !== null) {
              (freshMarketData as any)[key] = { ...((marketData as any)?.[key] || {}), ...freshJson.parsed_data[key] };
            }
          }
          setMarketData(freshMarketData as MGIData);
          console.log('🔄 Fresh relay snapshot for Gestión:', (freshMarketData as any)?.PRICE?.candle?.close);
        }
      } catch (fetchErr) {
        console.warn('Could not refresh relay data, using cached marketData:', fetchErr);
      }

      const prompt = buildGestionPrompt({
        trade,
        marketData: freshMarketData!,
        balance: parseFloat(balance)
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('gestionTrade') }
      });

      const currentPrice = (freshMarketData as any)?.PRICE?.candle?.close || trade.entry_price;
      const taylorRisk = evaluateActiveRisk(trade, currentPrice);

      const finalOutput = res.text + "\n\n" + taylorRisk.message;

      const newDelib: Deliberation = {
        id: `gestion-${Date.now()}`,
        timestamp: Date.now(),
        input: `Gestión: ${trade.setup_name}`,
        output: finalOutput,
        status: "ACTIVE_TRADE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO GESTIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleUpdateGestion = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!activeTrade) {
        isProcessingRef.current = false;
        return;
    }
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // ── FRESH SNAPSHOT: fetch live price from relay right now ──
      let freshMarketData = marketData;
      try {
        const freshRes = await fetch('/api/status');
        const freshJson = await freshRes.json();
        if (freshJson?.parsed_data) {
          freshMarketData = { ...(marketData || {}), ...freshJson.parsed_data };
          for (const key in freshJson.parsed_data) {
            if (typeof freshJson.parsed_data[key] === 'object' && freshJson.parsed_data[key] !== null) {
              (freshMarketData as any)[key] = { ...((marketData as any)?.[key] || {}), ...freshJson.parsed_data[key] };
            }
          }
          setMarketData(freshMarketData as MGIData);
          console.log('🔄 Fresh relay snapshot for UpdateGestión:', (freshMarketData as any)?.PRICE?.candle?.close);
        }
      } catch (fetchErr) {
        console.warn('Could not refresh relay data, using cached marketData:', fetchErr);
      }

      const prompt = buildGestionPrompt({
        trade: activeTrade,
        marketData: freshMarketData!,
        balance: parseFloat(balance)
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('gestionTrade') }
      });

      const currentPrice = (freshMarketData as any)?.PRICE?.candle?.close || activeTrade.entry_price;
      const taylorRisk = evaluateActiveRisk(activeTrade, currentPrice);

      const finalOutput = res.text + "\n\n" + taylorRisk.message;

      const newDelib: Deliberation = {
        id: `gestion-update-${Date.now()}`,
        timestamp: Date.now(),
        input: `Actualización Trade: ${activeTrade.setup_name}`,
        output: finalOutput,
        status: "ACTIVE_TRADE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO ACTUALIZACIÓN GESTIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleSaveTradeLog = async (logData: Omit<TradeLogInput, 'trade_id'>) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setIsTradeLogOpen(false);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullLog: TradeLogInput = { ...logData, trade_id: `trade-${Date.now()}` };
      const prompt = buildTradeLogPrompt(fullLog);

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('tradeLog') }
      });
      const text = res.text || "";

      // Memoria Evolutiva: Extraer LECCIÓN en caso de pérdida
      if (text.includes("LECCIÓN:")) {
        const match = text.match(/LECCIÓN:(.*)/i);
        const lessonStr = match ? match[1].trim() : "";
        if (lessonStr) {
          fetch('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              regime: currentRegime,
              setup_name: activeTrade?.setup_name || 'Desconocido',
              rule_text: lessonStr
            })
          }).catch(err => console.error("Error guardando Lección:", err));
        }
      }
      // Update balance (Convert Puntos to USD using MNQ standard $2.0 per point per contract)
      const usdPnl = logData.puntos * (activeTrade?.contracts || 1) * 2.0;
      setBalance(prev => (parseFloat(prev) + usdPnl).toString());

      // Save to SQLite
      await saveTradeLog({
        ...fullLog,
        setup_name: activeTrade?.setup_name,
        direction: activeTrade?.direction,
        contracts: activeTrade?.contracts,
        entry_price: activeTrade?.entry_price,
        stop_loss: activeTrade?.stop_loss,
        tp1_price: activeTrade?.tp1_price,
        tp2_price: activeTrade?.tp2_price,
        ai_audit: res.text
      }).catch(err => console.error("Failed to save trade log to SQLite", err));

      const newDelib: Deliberation = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        input: "Auditoría de Trade (Registro)",
        output: res.text || "Error en registro.",
        status: "ARCHIVED"
      };
      setDeliberations(prev => [...prev, newDelib]);
      setActiveTrade(null);
    } catch (err: any) {
      setApiError(`FALLO LOG: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleCierreDia = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setIsCierreDiaOpen(false);
    setIsProcessing(true);
    try {
      // Obtener trades consolidados desde la Base de Datos SQLite para calcular el P&L
      const tradesRes = await fetch('/api/trades');
      const allTrades: any[] = await tradesRes.json();

      // Filtrar a la sesión de hoy local
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTrades = allTrades.filter(t => t.TradeDate === todayStr);
      const totalPnl = todayTrades.reduce((acc, curr) => acc + (curr.Amount || 0), 0);
      const totalContracts = todayTrades.reduce((acc, curr) => acc + (curr.Quantity || 0), 0);
      const totalPoints = todayTrades.reduce((acc, curr) => acc + (curr.puntos || 0), 0);

      // Consolidar interacción para la psicóloga
      const interactiveHistory = deliberations
        .filter(d => d.status === "INTERACTIVE" || d.status === "ACTIVE_TRADE")
        .map(d => `> ${d.input}\n< ${d.output}`)
        .join('\n\n');

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const tradesListStr = todayTrades.length > 0
        ? todayTrades.map((t, i) => `Trade #${i + 1} [Setup: ${t.nombre_setup || 'N/A'}] | Riesgo: ${t.rs || 0}R | Puntos: ${t.puntos} | Dir: ${t.Buy_Sell} | Audit Wendy: ${t.wendy_notes}`).join('\\n')
        : 'Ningún trade ejecutado hoy.';

      // Extracción de métricas de régimen para auditoría
      const jimOutputs = deliberations.filter(d => d.output.includes("REGIME_ANALYSIS"));
      const lastJimOutput = jimOutputs.length > 0 ? jimOutputs[jimOutputs.length - 1].output : "";
      const regimeMatch = lastJimOutput.match(/```json\n([\s\S]*?)\n```/);
      let regimeActual = "AMBIGUOUS";
      let nivelExposicion = 1;
      if (regimeMatch) {
        try {
          const rData = JSON.parse(regimeMatch[1]);
          const analysis = rData.REGIME_ANALYSIS || {};
          regimeActual = `${analysis.contexto_ib || 'AMBIGUOUS'} ${analysis.regime_confidence_score || 'LOW'} ${analysis.sesgo_direccional || 'NEUTRAL'}`;
          nivelExposicion = analysis.nivel_exposicion || 1;
        } catch(e) {}
      }

      const axeSetupsCount = deliberations.filter(d => 
        d.output.includes("AXE") && 
        (d.output.includes("SETUP") || d.output.includes("ENTRY")) && 
        !d.output.includes("EARLY EXIT")
      ).length;

      const prompt = buildCierreDiaPrompt({
        balance: parseFloat(balance),
        tradeCount: todayTrades.length,
        pnl: totalPnl,
        contracts: totalContracts,
        points: totalPoints,
        tradesList: tradesListStr,
        comments: interactiveHistory || 'Ninguna interacción conversacional detectada hoy.',
        regimeActual,
        nivelExposicion,
        axeSetupsCount
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { systemInstruction: getSystemInstructionForTask('cierreDia') }
      });

      const wagsText = res.text || "";
      const wagsMatch = wagsText.match(/```json\n([\s\S]*?)\n```/);
      if (wagsMatch) {
          try {
              const wagsData = JSON.parse(wagsMatch[1]);
              if (wagsData.WAGS_AUDIT) {
                  fetch('/api/wags/audit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(wagsData)
                  }).catch(e => console.error("Error persistiendo Auditoría Wags", e));

                  if (wagsData.WAGS_AUDIT.leccion_del_dia) {
                      const rParts = wagsData.WAGS_AUDIT.regime_actual.split(' ');
                      fetch('/api/lessons', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              ib_regime: rParts[0] || 'AMBIGUOUS',
                              ib_confidence: rParts[1] || 'LOW',
                              ib_direction: rParts[2] || 'NEUTRAL',
                              outcome: wagsData.WAGS_AUDIT.resultado_pnl < 0 ? 'LOSS' : 'WIN',
                              setup_name: 'DAILY_AUDIT_LESSON',
                              rule_text: wagsData.WAGS_AUDIT.leccion_del_dia
                          })
                      }).catch(e => console.error("Error auto-guardando leccion Wags", e));
                  }
              }
          } catch (e) { console.error("Error parsing Wags Audit JSON", e); }
      }

      const newDelib: Deliberation = {
        id: `cierre-${Date.now()}`,
        timestamp: Date.now(),
        input: "CIERRE DE DÍA",
        output: wagsText,
        status: "CLOSED"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO CIERRE: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleAgentChat = async (message: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!message.trim()) {
        isProcessingRef.current = false;
        return;
    }
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = buildChatPrompt(message, marketData, parseFloat(balance), activeTrade);

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...buildHistoryPayload(deliberations),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: { systemInstruction: getSystemInstructionForTask('chat') }
      });

      const newDelib: Deliberation = {
        id: `chat-${Date.now()}`,
        timestamp: Date.now(),
        input: message,
        output: res.text || "Sin respuesta.",
        status: "INTERACTIVE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO CHAT: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const exportSessionToMarkdown = () => {
    if (deliberations.length === 0) return;

    let md = `# SIEBEN SESSION AUDIT - ${new Date().toLocaleDateString()}\n\n`;
    md += `**Balance Final:** $${balance} USD\n`;
    md += `**Tareas Completadas:** ${Array.from(completedTasks).join(', ')}\n\n`;
    md += `--- \n\n`;

    deliberations.forEach(d => {
      md += `### [${new Date(d.timestamp).toLocaleTimeString()}] ${d.input}\n`;
      md += `${d.output}\n\n`;
      md += `--- \n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sieben_session_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };



  // ── PLAYGROUND MODE ──
  const isPlayground = new URLSearchParams(window.location.search).get('playground') === 'sidebar';

  const sidebarProps = {
    balance, setBalance, drawdownMax, setDrawdownMax,
    marginPerContract, setMarginPerContract,
    isProcessing, apiError, onOpenKeyDialog: openKeyDialog,
    relayStatus, marketData,
    onExportSession: exportSessionToMarkdown,
    hasData: deliberations.length > 0,
    historyItems, onSelectHistoryItem: (item: Deliberation) => setDeliberations([item]),
    onNewChat: () => { setDeliberations([]); setPhase('IDLE'); }
  };

  if (isPlayground) {
    return (
      <div className="h-screen bg-[#050810] flex overflow-hidden">
        <div className="flex items-start gap-6 p-6 w-full overflow-auto">
          <div className="flex-shrink-0">
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-2">v1 — Current</p>
            <Sidebar {...sidebarProps} />
          </div>
          <div className="flex-shrink-0">
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-2">v2 — Glass Console</p>
            <SidebarV2 {...sidebarProps} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-operator-bg text-operator-text font-sans flex flex-col overflow-hidden">

      <div className="flex flex-1 overflow-hidden">

        <SidebarV2
          balance={balance}
          setBalance={setBalance}
          drawdownMax={drawdownMax}
          setDrawdownMax={setDrawdownMax}
          marginPerContract={marginPerContract}
          setMarginPerContract={setMarginPerContract}
          isProcessing={isProcessing}
          apiError={apiError}
          onOpenKeyDialog={openKeyDialog}
          relayStatus={relayStatus}
          marketData={marketData}
          onExportSession={exportSessionToMarkdown}
          hasData={deliberations.length > 0}
          historyItems={historyItems}
          onSelectHistoryItem={(item) => setDeliberations([item])}
          onNewChat={() => { setDeliberations([]); setPhase('IDLE'); }}
        />

        <MentalCheckDialog
          isOpen={isMentalCheckOpen}
          onClose={() => setIsMentalCheckOpen(false)}
          onSubmit={(wendyData) => {
            setMentalCheck(wendyData.mentalCheck);
            setIsMentalCheckOpen(false);
            launchFlightPlan(wendyData);
          }}
        />

        <TradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => setIsTradeDialogOpen(false)}
          onSubmit={handleGestionTrade}
        />

        <TradeLogDialog
          isOpen={isTradeLogOpen}
          onClose={() => setIsTradeLogOpen(false)}
          onSubmit={handleSaveTradeLog}
          currentTradeName={activeTrade?.setup_name}
        />

        <CierreDiaDialog
          isOpen={isCierreDiaOpen}
          onClose={() => setIsCierreDiaOpen(false)}
          onSubmit={handleCierreDia}
        />

        <main className="flex-1 min-w-0 flex flex-col bg-[#050810] relative">
          {/* TOP BAR: CYBER HUD MONITOR (ALIGNED LEFT) */}
          <div className="h-20 border-b border-white/5 bg-[#0a0f1c]/90 flex items-center gap-8 px-8 flex-shrink-0 z-50 backdrop-blur-3xl shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {/* IZQUIERDA: Precio en Vivo (Cyber HUD style) */}
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.4)]">
              <span className="text-xs font-black text-cyan-500/50 tracking-[0.3em] uppercase"
                 style={{ fontFamily: "'Oxanium', cursive" }}>MNQ</span>
              <span className={`text-2xl font-black transition-all duration-300 tabular-nums tracking-tighter ${
                activeSetup?.status === 'TRIGGERED'
                  ? priceDirection === 'up' 
                    ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.7)]' 
                    : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                  : 'text-white/40'
              }`}
                style={{ fontFamily: "'Oxanium', cursive" }}>
                {marketData?.PRICE?.candle?.close 
                  ? `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(marketData.PRICE.candle.close)} ${activeSetup?.status === 'TRIGGERED' ? (priceDirection === 'up' ? '▲' : '▼') : ''}`
                  : '---.--'}
              </span>
            </div>

            {/* IZQUIERDA ADYACENTE: Active Setup */}
            <div className="flex items-center">
              <ActiveSetupBadge setup={activeSetup} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-12 custom-scrollbar space-y-12 w-0 min-w-full relative">
            {phase === 'IDLE' && deliberations.length === 0 && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
                <div className="w-16 h-16 rounded-full border border-cyan-500/20 flex items-center justify-center animate-pulse">
                  <BarChart3 size={32} className="text-cyan-500/50" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.5em] text-cyan-500/40" style={{ fontFamily: "'Oxanium', cursive" }}>SISTEMA_STANDBY</h2>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 mt-2">{relayStatus === 'CONNECTED' ? 'LINK_ESTABLISHED' : 'AWAITING_RELAY_LINK'}</p>
                </div>
              </div>
            )}

            {isProcessing && phase === 'IDLE' && (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="animate-spin text-cyan-400" size={24} />
                <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-cyan-400/50">Computing_Tactical_Analysis</span>
              </div>
            )}

            {phase === 'STANDBY' && mgiDashboard && (
              <MGIOutput
                mgiDashboard={mgiDashboard}
                mentalCheck={mentalCheck}
                setMentalCheck={setMentalCheck}
                launchFlightPlan={launchFlightPlan}
                isProcessing={isProcessing}
              />
            )}

            {deliberations.length > 0 && (
              <AgentFeed
                deliberations={deliberations}
                isProcessing={isProcessing}
                phase={phase}
                onReset={() => { setPhase('IDLE'); setMgiDashboard(""); setMarketData(null); }}
              />
            )}
          </div>

          <div className="flex flex-col flex-shrink-0 relative">
            <ChatBar onSend={handleAgentChat} isProcessing={isProcessing} />
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <p className="text-[7px] text-white/5 font-mono uppercase tracking-[0.4em] font-black">
                SIEBEN_CORE_ACTIVE // {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR - SIEBEN TASKS */}
        <TasksSidebar
          launchTradingPlan={triggerTradingPlan}
          launchApertura={handleAperturaAnalysis}
          launchUpdate={handleUpdateAnalysis}
          launchGestion={() => !activeTrade ? setIsTradeDialogOpen(true) : handleUpdateGestion()}
          launchTradeLog={() => setIsTradeLogOpen(true)}
          launchCierreDia={() => setIsCierreDiaOpen(true)}
          isProcessing={isProcessing}
          completedTasks={completedTasks}
          isTradeActive={!!activeTrade}
          isUpdateLimitReached={!canUpdate}
        />

      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
