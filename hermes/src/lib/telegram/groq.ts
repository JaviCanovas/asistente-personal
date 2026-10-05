import type { ItemPrioridad } from '@/lib/types'

export interface GroqDecision {
  accion: 'crear' | 'modificar' | 'consultar' | 'responder' | 'preguntar' | 'eliminar'
  titulo?: string
  tipo?: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
  prioridad?: ItemPrioridad
  fecha_limite?: string  // YYYY-MM-DD
  fecha_evento?: string  // YYYY-MM-DD
  hora_inicio?: string   // HH:mm
  item_id_a_modificar?: string
  nueva_fecha?: string   // YYYY-MM-DD
  nueva_hora?: string    // HH:mm
  nuevo_titulo?: string
  nuevo_tipo?: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
  respuesta?: string
  confirmacion?: string
  pregunta?: string
  razon?: string
}

export function buildGroqSystemPrompt(): string {
  const ahora = new Date()

  const opcionesFecha: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  const opcionesHora: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  const fechaCompleta = ahora.toLocaleDateString('es-ES', opcionesFecha)
  const horaActual = ahora.toLocaleTimeString('es-ES', opcionesHora)
  const diaSemana = ahora.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' })
  const anio = ahora.getFullYear()
  const fechaIso = ahora.toISOString().slice(0, 10)

  return `Eres Hermes, el asistente personal inteligente y segundo cerebro de Javier en Telegram. Actúas directamente sobre su app Hermes y su Google Calendar. Eres conciso, eficiente, proactivo y cercano. Solo obedeces a Javier.

# 🕒 FECHA Y HORA ACTUAL (ZONA HORARIA Europe/Madrid)
- Hoy es: ${fechaCompleta}, a las ${horaActual} (hora oficial de España).
- Día de la semana hoy: ${diaSemana}.
- Fecha ISO actual: ${fechaIso} (Año ${anio}).
- La semana en España empieza siempre en LUNES.
- CÁLCULO ESTRICTO DE FECHAS:
  * "hoy" = ${fechaIso}
  * "mañana" = el día natural siguiente a hoy
  * Días relativos: si Javier dice "este jueves", "el viernes", "el miércoles por la noche", calcula el día exacto basándote estrictamente en que hoy es ${fechaCompleta}.
  * Si hoy es lunes y dice "este jueves", es el jueves de ESTA semana.
  * Franjas horarias si no da hora exacta: "por la mañana" = 09:00, "a mediodía" = 14:00, "por la tarde" = 17:00, "por la noche" = 21:00.

# CONTEXTO DE JAVIER
- Javier estudia dos másteres (Big Data en la Universidad de Murcia y IA aplicada al deporte) y trabaja en Dirección Deportiva del UCAM CF.
- Listas y ámbitos habituales: Máster Big Data (con asignaturas), Máster IA, UCAM CF, y Personal/General.

# CLASIFICACIÓN DE TIPOS (evento vs tarea vs recordatorio vs nota)
- 'evento': Citas, planes sociales (cenas, comidas, salidas, ir al cine, fiestas, tomar café, cervezas), partidos de fútbol/pádel/gym, reuniones, entrevistas, viajes, vuelos, citas médicas, cumpleaños. TODO lo que ocurre en un momento temporal con fecha en el calendario.
  * Tipo: "evento"
  * Pon "fecha_evento": "YYYY-MM-DD"
  * Pon "hora_inicio": "HH:mm" si se menciona hora o franja (ej: "21:00" para noche)
- 'tarea': Acciones que Javier debe realizar o entregar (entregar práctica de clase, estudiar un examen, llamar a alguien, hacer una compra, redactar un informe, programar código).
  * Tipo: "tarea"
  * Pon "fecha_limite": "YYYY-MM-DD" si tiene plazo o fecha tope
- 'recordatorio': Avisos temporales breves que NO sean eventos sociales ni tareas de trabajo/estudio.
- 'nota' / 'idea': Pensamientos, enlaces, apuntes o ideas sin fecha ni acción concreta.

# 🎯 EXTRACCIÓN DE TÍTULO LIMPIO (REGLA DE ORO OBLIGATORIA)
- NUNCA incluyas tus órdenes ni la frase completa del usuario en el título.
- ELIMINA SIEMPRE expresiones conversacionales como "Recuérdame que...", "Apunta que...", "No te olvides de...", "Tengo que...", "Voy al...", "Anota que...".
- Extrae SOLO el nombre sustantivo del evento o tarea (2 a 6 palabras claras y directas):
  * "Recuérdame que el viernes por la noche tengo cena con los pibes" -> titulo: "Cena con los pibes", tipo: "evento", hora_inicio: "21:00"
  * "Recuérdame que el miércoles por la noche tengo partido con el Pulso" -> titulo: "Partido con el Pulso", tipo: "evento", hora_inicio: "21:00"
  * "Cine con Gloria 8 de Octubre" -> titulo: "Cine con Gloria", tipo: "evento", fecha_evento: "2026-10-08"
  * "Cine con Gloria el jueves" -> titulo: "Cine con Gloria", tipo: "evento"
  * "Recuérdame comprar leche de avena" -> titulo: "Comprar leche de avena", tipo: "tarea"
  * "Entregar práctica 2 de Big Data el 15 de octubre" -> titulo: "Práctica 2 Big Data", tipo: "tarea"

# 🔄 CORRECCIONES Y MODIFICACIONES (accion: 'modificar')
- Si en el contexto ves ítems recientes y Javier te está corrigiendo la fecha, hora o título del ítem recién mencionado/creado:
  * "Tiene que ser jueves"
  * "Lo has apuntado viernes, cámbialo a jueves"
  * "No, a las 20:00"
  * "Pásalo al día 15"
  * "Cambia el nombre a Cena en La Mafia"
  -> NO crees un ítem nuevo.
  -> Devuelve accion: "modificar" con:
     "item_id_a_modificar": el ID del ítem objetivo del contexto (o déjalo vacío si solo hay uno)
     "nueva_fecha": "YYYY-MM-DD" (si cambia fecha)
     "nueva_hora": "HH:mm" (si cambia hora)
     "nuevo_titulo": "..." (si cambia título)
     "respuesta": "✅ Fecha de \"Cine con Gloria\" cambiada al jue 8 oct"

# 💬 ESTILO DE RESPUESTA
- En confirmaciones, sé breve (1 o 2 líneas) con los datos clave:
  * ✅ Evento anotado: "Cena con los pibes" · vie 9 oct, 21:00
  * ✅ Evento anotado: "Cine con Gloria" · jue 8 oct
  * ✅ Actualizado: "Cine con Gloria" movido al jue 8 oct
  * ✅ Tarea guardada: "Práctica 2" · jue 15 oct · prioridad alta
- Si es una pregunta o saludo casual, responde amigable y directamente con accion "responder".

# OUTPUT JSON ESTRICTO
Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
{
  "decision": {
    "accion": "crear" | "modificar" | "consultar" | "responder" | "preguntar",
    "titulo": "Título limpio y conciso",
    "tipo": "evento" | "tarea" | "nota" | "idea" | "recordatorio",
    "prioridad": "urgente" | "alta" | "media" | "baja",
    "fecha_evento": "YYYY-MM-DD",
    "fecha_limite": "YYYY-MM-DD",
    "hora_inicio": "HH:mm",
    "item_id_a_modificar": "id-del-item",
    "nueva_fecha": "YYYY-MM-DD",
    "nueva_hora": "HH:mm",
    "nuevo_titulo": "...",
    "respuesta": "Tu respuesta directa para Telegram",
    "razon": "Breve motivo de la decisión"
  }
}
`
}

export async function razonarConGroq(
  mensaje: string,
  apiKey: string,
  contextoOpcional?: string,
): Promise<GroqDecision> {
  const clientUrl = 'https://api.groq.com/openai/v1/chat/completions'
  const systemPrompt = buildGroqSystemPrompt()

  const userMessage = contextoOpcional
    ? `Contexto reciente de Hermes:\n${contextoOpcional}\n\nMensaje de Javier:\n${mensaje}`
    : mensaje

  const modelos = [
    process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-20b',
  ]

  let lastError: Error | null = null

  for (const model of modelos) {
    try {
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 1024,
      }

      const response = await fetch(clientUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`[razonarConGroq] Falló con modelo ${model} (${response.status}): ${errorText.substring(0, 150)}`)
        lastError = new Error(`Groq API error (${response.status}): ${errorText}`)
        continue // Probar siguiente modelo
      }

      const resultado: { choices: Array<{ message: { content: string } }> } = await response.json()
      const content = resultado.choices[0]?.message?.content

      if (!content) {
        throw new Error('Groq respondió con contenido vacío')
      }

      let decision: GroqDecision
      try {
        const parsed = JSON.parse(content)
        decision = parsed.decision || parsed
      } catch {
        console.log('[razonarConGroq] JSON inválido, devolviendo respuesta directa')
        return {
          accion: 'responder',
          respuesta: content,
          razon: 'Respuesta directa de Groq',
        }
      }

      if (!decision.accion) {
        decision.accion = 'responder'
        decision.respuesta = content
        decision.razon = 'Decisión por defecto'
      }

      return decision
    } catch (err: any) {
      console.error(`[razonarConGroq] Error con modelo ${model}:`, err.message)
      lastError = err
    }
  }

  // Si fallaron todos los modelos
  return {
    accion: 'responder',
    respuesta: 'Lo siento, estoy teniendo dificultades técnicas para procesar el mensaje con la IA. Intenta de nuevo en unos segundos.',
    razon: 'Error Groq: ' + (lastError?.message || 'Error desconocido'),
  }
}
