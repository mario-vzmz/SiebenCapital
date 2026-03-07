
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import {
  BarChart3, RefreshCw
} from 'lucide-react';

// Tipos
import { MGIData, Deliberation, TradeInput, TradeLogInput } from './types';

// Componentes
import { Sidebar } from './components/Sidebar';
import { TasksSidebar } from './components/TasksSidebar';
import { MGIOutput } from './components/MGIOutput';
import { AgentFeed } from './components/AgentFeed';
import { MentalCheckDialog, WendyCheckInput } from './components/MentalCheckDialog';
import { TradeDialog } from './components/TradeDialog';
import { TradeLogDialog } from './components/TradeLogDialog';

// Utils
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
import { calculateOpeningContext } from './src/utils/openingAnalysis';
import { saveDeliberation } from './src/services/deliberationService';
import { useUpdateLimit } from './src/hooks/useUpdateLimit';
import { getDeliberations } from './src/services/deliberationService';
import { SYSTEM_INSTRUCTIONS } from './src/systemInstructions';

// --- INSTRUCCIONES MAESTRAS (PROTOCOLO HÍBRIDO 2-STEPS V2 - USD NATIVO) ---
// Se construyen dinámicamente usando SYSTEM_INSTRUCTIONS del módulo central.
const PHASE_1_INSTRUCTION = `${SYSTEM_INSTRUCTIONS.core}\n\n${SYSTEM_INSTRUCTIONS.jim_planVuelo}\n\n${SYSTEM_INSTRUCTIONS.wendy_planVuelo}`;

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
  const [activeTrade, setActiveTrade] = useState<TradeInput | null>(() => {
    const saved = localStorage.getItem("SIEBEN_ACTIVE_TRADE");
    return saved ? JSON.parse(saved) : null;
  });
  const [lastUpdateAttempt, setLastUpdateAttempt] = useState(0); // For rate limiting
  const [chatInput, setChatInput] = useState(""); // New state for chat

  const [hasCustomKey, setHasCustomKey] = useState(false);

  // Default balance in USD
  const [balance, setBalance] = useState(localStorage.getItem("SIEBEN_BALANCE_USD") || "50000");
  const [drawdownMax, setDrawdownMax] = useState(localStorage.getItem("SIEBEN_DRAWDOWN_MAX") || "2");
  const [marginPerContract, setMarginPerContract] = useState(localStorage.getItem("SIEBEN_MARGIN_CONTRACT") || "3000");

  // --- RELAY CONNECTION STATE ---
  const [relayStatus, setRelayStatus] = useState<'DISCONNECTED' | 'WAITING' | 'CONNECTED'>('DISCONNECTED');
  const [lastProcessedTime, setLastProcessedTime] = useState<string | null>(null);

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
      if (phase !== 'IDLE') return; // Stop polling if analytics is in progress

      try {
        const response = await fetch('http://localhost:5000');
        const data = await response.json();

        if (data) {
          if (data.status === 'JSON_SUCCESS' || data.status === 'PLAIN_TEXT_RECEIVED') {
            setRelayStatus('CONNECTED');

            // Check if it's new data by timestamp
            if (data.timestamp && data.timestamp !== lastProcessedTime && data.parsed_data) {
              console.log("🔥 NEW DATA DETECTED:", data);
              setLastProcessedTime(data.timestamp);
              handleDataIngest(data.parsed_data);
            }
          } else {
            setRelayStatus('WAITING');
          }
        }
      } catch (err) {
        setRelayStatus('DISCONNECTED');
        // Silent fail for polling
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [phase, lastProcessedTime]);

  const triggerTradingPlan = () => {
    let currentData = marketData;

    // Si NO hay datos (Simulación), inyectamos mock y ejecutamos Fase 1 (MGI)
    if (!currentData) {
      const mock: MGIData = {
        VWAP_PRICE: {
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
    const dataToUse = overrideData || marketData;
    if (!dataToUse) return;

    if (!wendyData && !mentalCheck.trim()) return;

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
    }
  };

  const handleAperturaAnalysis = async () => {
    try {
      setIsProcessing(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = await buildAperturaPrompt({
        marketData,
        balance: parseFloat(balance),
        drawdownMax: parseFloat(drawdownMax),
        marginPerContract: parseFloat(marginPerContract)
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction: getSystemInstructionForTask('apertura'),
        }
      });

      const text = res.text || "FALLO ANALISIS APERTURA.";

      const delibData = {
        taskId: 'apertura',
        input: `Apertura Invocada (08:55 Vector)`,
        output: text,
        agents: ['core', 'jim', 'axe', 'wags'],
        status: 'COMPLETED'
      };

      // 2. Persistir en Backend
      await saveDeliberation(delibData);

      const newDelib: Deliberation = {
        id: `apertura-${Date.now()}`,
        timestamp: Date.now(),
        input: delibData.input,
        output: text,
        status: "COMPLETED"
      };

      setDeliberations(prev => [...prev, newDelib]);
      setCompletedTasks(prev => new Set(prev).add('apertura'));
    } catch (err: any) {
      setApiError(`FALLO ANALISIS APERTURA: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };



  const handleUpdateAnalysis = async () => {
    if (!completedTasks.has('planVuelo')) {
      setApiError("ERROR: Debe completar el Plan de Vuelo antes de actualizar.");
      return;
    }

    if (!canUpdate) {
      setApiError(`LÍMITE ALCANZADO: 100 actualizaciones por hora. Intente más tarde.`);
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

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('actualizacion') }
      });

      const text = res.text || "Error en actualización.";
      const delibData = {
        taskId: 'actualizacion',
        input: `Update Request #${updateCount + 1}`,
        output: text,
        agents: ['core', 'jim', 'axe'],
        status: 'COMPLETED'
      };

      await saveDeliberation(delibData);
      registerUpdate(); // Increment counter

      const newDelib: Deliberation = {
        id: `update-${Date.now()}`,
        timestamp: Date.now(),
        input: delibData.input,
        output: text,
        status: "COMPLETED"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO ACTUALIZACIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGestionTrade = async (trade: TradeInput) => {
    setActiveTrade(trade);
    setIsTradeDialogOpen(false);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = buildGestionPrompt({
        trade,
        marketData: marketData!,
        balance: parseFloat(balance)
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('gestionTrade') }
      });

      const newDelib: Deliberation = {
        id: `gestion-${Date.now()}`,
        timestamp: Date.now(),
        input: `Gestión: ${trade.setup_name}`,
        output: res.text || "Error en gestión.",
        status: "ACTIVE_TRADE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO GESTIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateGestion = async () => {
    if (!activeTrade) return;
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = buildGestionPrompt({
        trade: activeTrade,
        marketData: marketData!,
        balance: parseFloat(balance)
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('gestionTrade') }
      });

      const newDelib: Deliberation = {
        id: `gestion-update-${Date.now()}`,
        timestamp: Date.now(),
        input: `Actualización Trade: ${activeTrade.setup_name}`,
        output: res.text || "Error en actualización de gestión.",
        status: "ACTIVE_TRADE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO ACTUALIZACIÓN GESTIÓN: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTradeLog = async (logData: Omit<TradeLogInput, 'trade_id'>) => {
    setIsTradeLogOpen(false);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullLog: TradeLogInput = { ...logData, trade_id: `trade-${Date.now()}` };
      const prompt = buildTradeLogPrompt(fullLog);

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('tradeLog') }
      });

      // Update balance
      setBalance(prev => (parseFloat(prev) + logData.final_pnl).toString());

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
    }
  };

  const handleCierreDia = async () => {
    if (!window.confirm("¿Desea cerrar la sesión del día? Esta acción limpiará el estado actual.")) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = buildCierreDiaPrompt({
        balance: parseFloat(balance),
        tradeCount: deliberations.filter(d => d.id.startsWith('log-')).length
      });

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('cierreDia') }
      });

      const newDelib: Deliberation = {
        id: `cierre-${Date.now()}`,
        timestamp: Date.now(),
        input: "CIERRE DE DÍA",
        output: res.text || "Error en cierre.",
        status: "CLOSED"
      };
      setDeliberations(prev => [...prev, newDelib]);

      // Cleanup session state after delay
      setTimeout(() => {
        setMarketData(null);
        setPhase('IDLE');
        setMgiDashboard("");
        setCompletedTasks(new Set());
        setAutoTriggeredTasks(new Set());
      }, 5000);

    } catch (err: any) {
      setApiError(`FALLO CIERRE: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAgentChat = async () => {
    if (!chatInput.trim()) return;
    const query = chatInput;
    setChatInput(""); // Clear immediately for UX
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = buildChatPrompt(query, marketData, parseFloat(balance), activeTrade);

      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: getSystemInstructionForTask('chat') }
      });

      const newDelib: Deliberation = {
        id: `chat-${Date.now()}`,
        timestamp: Date.now(),
        input: query,
        output: res.text || "Sin respuesta.",
        status: "INTERACTIVE"
      };
      setDeliberations(prev => [...prev, newDelib]);
    } catch (err: any) {
      setApiError(`FALLO CHAT: ${err.message}`);
    } finally {
      setIsProcessing(false);
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



  return (
    <div className="h-screen bg-operator-bg text-operator-text font-sans flex flex-col overflow-hidden">

      <div className="flex flex-1 overflow-hidden">

        <Sidebar
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

        <main className="flex-1 min-w-0 flex flex-col bg-operator-bg relative">

          {/* TOP BAR: RELAY STATUS */}
          <div className="h-10 border-b border-operator-border bg-operator-card/50 flex items-center justify-between px-6 flex-shrink-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-operator-text uppercase tracking-widest">Feed Central</span>
              <div className="h-3 w-px bg-operator-border" />
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-none ${relayStatus === 'CONNECTED' ? 'bg-emerald-500' : relayStatus === 'WAITING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className={`text-[9px] font-mono uppercase tracking-widest ${relayStatus === 'CONNECTED' ? 'text-emerald-500' : relayStatus === 'WAITING' ? 'text-amber-500' : 'text-rose-500'}`}>
                  {relayStatus === 'CONNECTED' ? 'MGI RELAY ACTIVE' : relayStatus === 'WAITING' ? 'WAITING SIGNAL...' : 'RELAY OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar space-y-16 min-w-0 w-full relative">
            {phase === 'IDLE' && deliberations.length === 0 && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-4">
                <BarChart3 size={32} className="text-operator-muted mb-2" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.5em] text-operator-muted">SISTEMA LISTO</h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest mt-2">{relayStatus === 'CONNECTED' ? 'Enlace MGI Estable' : 'Esperando Enlace MGI...'}</p>
                </div>
              </div>
            )}

            {isProcessing && phase === 'IDLE' && (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="animate-spin text-sieben" size={24} />
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-operator-muted">Analizando Estructura...</span>
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

          <div className="p-4 border-t border-operator-border bg-operator-bg flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="flex-1 relative group">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAgentChat()}
                  placeholder="Interactuar con la IA (Comandos / Preguntas)..."
                  className="w-full bg-operator-card border border-operator-border rounded-md py-3 px-4 text-[11px] font-mono text-operator-text focus:outline-none focus:border-sieben transition-all"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-[8px] text-operator-muted font-bold uppercase tracking-widest group-focus-within:text-sieben">ENTER TO SEND</span>
                </div>
              </div>
              <button
                onClick={handleAgentChat}
                disabled={!chatInput.trim() || isProcessing}
                className="bg-operator-card hover:bg-sieben hover:text-white hover:border-sieben border border-operator-border disabled:opacity-50 disabled:grayscale p-3 rounded-md text-operator-muted transition-all flex-shrink-0 shadow-none"
              >
                <RefreshCw size={14} className={isProcessing ? 'animate-spin text-sieben' : ''} />
              </button>
            </div>
            <div className="mt-2 flex justify-center">
              <p className="text-[8px] text-operator-muted font-mono uppercase tracking-[0.2em] font-bold">
                SIEBEN LINK: {relayStatus} | BALANCE: ${balance} USD
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
          launchCierreDia={handleCierreDia}
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
