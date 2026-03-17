import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), 'data', 'sieben.db')

def get_regime_context(regime, confidence, direction):
    """
    Recupera lecciones históricas basadas en el régimen y genera un resumen compacto.
    NO utiliza LLM para el resumen.
    """
    try:
        if not os.path.exists(DB_FILE):
            return {"lessons_count": 0, "summary": "No hay base de datos disponible."}

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Búsqueda exacta primero
        query = "SELECT setup_name, rule_text, outcome FROM lessons WHERE ib_regime = ? AND ib_confidence = ? AND ib_direction = ? ORDER BY timestamp DESC LIMIT 10"
        cursor.execute(query, (regime, confidence, direction))
        lessons = cursor.fetchall()

        # Si no hay lecciones exactas, buscamos solo por régimen
        if not lessons:
            query = "SELECT setup_name, rule_text, outcome FROM lessons WHERE ib_regime = ? ORDER BY timestamp DESC LIMIT 5"
            cursor.execute(query, (regime,))
            lessons = cursor.fetchall()

        conn.close()

        if not lessons:
            return {
                "lessons_count": 0,
                "summary": f"No hay lecciones registradas para el régimen {regime}."
            }

        # Generar resumen compacto (< 150 tokens aprox)
        lines = []
        for l in lessons:
            outcome_marker = "✅" if l['outcome'] == 'WIN' else "❌" if l['outcome'] == 'LOSS' else "⚠️"
            line = f"{outcome_marker} [{l['setup_name']}]: {l['rule_text']}"
            lines.append(line)

        # Truncar si es necesario para mantener brevedad
        summary_text = "\\n".join(lines)
        if len(summary_text) > 600: # Heurística para ~150 tokens
            summary_text = summary_text[:597] + "..."

        return {
            "lessons_count": len(lessons),
            "summary": summary_text
        }

    except Exception as e:
        return {"error": str(e), "summary": "Error al recuperar memoria."}

if __name__ == "__main__":
    # Test simple
    print(get_regime_context("TREND_DISGUISED", "MEDIUM", "BULLISH"))
