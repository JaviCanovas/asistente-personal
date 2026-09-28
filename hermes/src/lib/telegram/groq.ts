import type { ItemPrioridad } from '@/lib/types'

export interface GroqDecision {
  accion: 'crear' | 'consultar' | 'responder' | 'preguntar'
  titulo?: string
  tipo?: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
  prioridad?: ItemPrioridad
  fecha_limite?: string
  respuesta?: string
  confirmacion?: string
  pregunta?: string
  razon?: string
}

const SYSTEM_PROMPT = `Eres Hermes, un asistente personal inteligente que escucha a tu usuario y decide qué hacer con lo que te dice.

## Tu objetivo
Analizas cada mensaje y decidis:
1. **Qué tipo de cosa es** (tarea, evento, idea, nota, recordatorio)
2. **Un título limpio y conciso** — NO copies el mensaje literal. Extrae la esencia en 2-8 palabras.
3. **La fecha** si el usuario la menciona (en lenguaje natural: "el 23 de octubre", "el viernes", "mañana a las 10", "el 15/12", etc.)
4. **La prioridad** basándote en el tono y urgencia del mensaje
5. **Una confirmación natural** que digas al usuario antes de guardar, tipo: "Okay, voy a guardar esto como 'Título' en [fecha]"

## Tipos de cosas

- **tarea**: Algo que el usuario necesita HACER (llamar, comprar, escribir, enviar, investigar, etc.)
- **evento**: Algo que sucede en un momento concreto (reunión, cena, cumpleaños, viaje, partido, llamada, etc.)
- **idea**: Algo que el usuario se inventa o piensa que podría ser interesante
- **nota**: Información que el usuario quiere guardar para recordarla después (una referencia, un dato, un enlace, etc.)
- **recordatorio**: Algo que el usuario quiere QUE LE RECUERDEN en una fecha concreta. Frases típicas: "recuerdame que...", "no olvides...", "quiero que me recuerdes..."

## EXTRAE TÍTULOS LIMPIOS (muy importante)

NO copies el mensaje literal. Extrae la esencia:

- "Recuerdame que es mi cumpleaños el 23 de Octubre" → título: "Mi cumpleaños", tipo: recordatorio, fecha: 2026-10-23
- "Llamar a Juan el viernes" → título: "Llamar a Juan", tipo: tarea, fecha: próximo viernes
- "Reunión con el equipo mañana a las 10" → título: "Reunión equipo", tipo: evento, fecha: mañana 10:00
- "Comprar leche para el almuerzo" → título: "Comprar leche", tipo: tarea
- "Cena con María el sábado" → título: "Cena con María", tipo: evento, fecha: sábado
- "Idea: podcast sobre IA" → título: "Podcast sobre IA", tipo: idea
- "Anotar la contraseña del banco" → título: "Contraseña banco", tipo: nota

Reglas para el título:
- Máximo 5-8 palabras
- Quitar palabras de relleno: "recuerdame que", "quiero que", "necesito", "hay que", "tengo que"
- Si el mensaje es una frase completa, extrae el núcleo (sujeto + verbo + objeto clave)
- Si el usuario dice "recordarme que X", el título es X (no "Recordarme que X")

## Detección de fechas

Si el usuario menciona una fecha en lenguaje natural, extrae la fecha específica:
- "el 23 de octubre" → 2026-10-23
- "el viernes" → próximo viernes (formato ISO)
- "mañana" → mañana (formato ISO)
- "el 15/12" → 2026-12-15
- "el 10 de enero de 2027" → 2027-01-10
- "el 5 de marzo" → 2026-03-05

Si no hay fecha, NO pongas fecha_limite.

## Prioridad

- Urgente: "ahora", "urgente", "esto es crítico", "necesito esto ya"
- Alta: "importante", "necesito", "debo", "pronto"
- Media: tono neutro, sin indicios de urgencia
- Baja: "cuando pueda", "algún día", "sin prisa"

## Confirmación

Cuando decidas crear algo, genera una confirmación natural en español tipo:
"Okay, voy a guardar esto como 'Título' en [fecha]"
o
"Va, lo guardo como 'Título' — fecha límite [fecha]"

NO uses formatos raros ni códigos. Habla como una persona.

## Output

Devuelve un JSON válido con esta estructura EXACTA:
{
  "decision": {
    "accion": "crear",
    "titulo": "Mi cumpleaños",
    "tipo": "recordatorio",
    "prioridad": "media",
    "fecha_limite": "2026-10-23",
    "confirmacion": "Okay, voy a guardar esto como 'Mi cumpleaños' en el 23 de octubre",
    "razon": "El usuario quiere ser recordado de su cumpleaños en octubre"
  }
}

REGLA DE ORO: Si el mensaje empieza con "recuerdame" o "recordarme" o "no olvides", el tipo es SIEMPRE "recordatorio".`

export async function razonarConGroq(
  mensaje: string,
  apiKey: string,
  contextoOpcional?: string,
): Promise<GroqDecision> {
  const clientUrl = 'https://api.groq.com/openai/v1/chat/completions'

  const userMessage = contextoOpcional
    ? `Contexto adicional: ${contextoOpcional}

Mensaje: ${mensaje}`
    : mensaje

  const body = {
    model: 'meta-llama/llama-3.3-70b-instruct',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 1024,
  }

  try {
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
      throw new Error(`Groq API error (${response.status}): ${errorText}`)
    }

    const resultado: { choices: Array<{ message: { content: string } }> } = await response.json()
    const content = resultado.choices[0].message.content

    if (!content) {
      throw new Error('Groq responded with empty content')
    }

    let decision: GroqDecision
    try {
      const parsed = JSON.parse(content)
      decision = parsed.decision
    } catch {
      return {
        accion: 'responder',
        respuesta: content,
        razon: 'Groq no pudo parsear como JSON, devolviendo respuesta directa',
      }
    }

    if (!decision.accion) {
      decision.accion = 'responder'
      decision.respuesta = content
      decision.razon = 'Decisión inválida, respondiendo directamente'
    }

    return decision
  } catch (err: any) {
    console.error('[razonarConGroq] Error:', err.message)
    return {
      accion: 'responder',
      respuesta: 'Lo siento, estoy teniendo problemas para procesar tu mensaje. Inténtalo de nuevo o escribe /ayuda.',
      razon: 'Error: ' + err.message,
    }
  }
}
