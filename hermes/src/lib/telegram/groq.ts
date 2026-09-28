import type { ItemPrioridad } from '@/lib/types'

export interface GroqDecision {
  accion: 'crear' | 'consultar' | 'responder' | 'preguntar'
  titulo?: string
  tipo?: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
  prioridad?: ItemPrioridad
  fecha_limite?: string
  respuesta?: string
  pregunta?: string
  razon?: string
}

const SYSTEM_PROMPT = `Eres Hermes, un asistente personal inteligente. Analizas mensajes de tu usuario y decides qué hacer.

## Tipos de acción

1. **crear**: El usuario quiere guardar algo (tarea, evento, idea, nota, recordatorio).
   - Extrae el título, tipo, prioridad y fecha si aparece.
   - Si no estás seguro del tipo, usa "tarea" por defecto.

2. **consultar**: El usuario pregunta por algo que está en su agenda/calendario (tareas de hoy, eventos, estado de cosas).

3. **responder**: El usuario quiere información general, consejos, o algo que no requiere crear ni consultar.

4. **preguntar**: El mensaje es ambiguo o no puedes decidir sin más info. Formula una pregunta clara.

## Reglas

- Si el mensaje menciona algo con fecha específica ("el viernes", "mañana", "el 15 de marzo"), es casi siempre un evento o tarea con fecha → acción "crear".
- Si el mensaje parece una pregunta sobre lo que tiene que hacer → acción "consultar".
- Si el mensaje es vaga ("algún día", "cuando pueda") → prioridad baja.
- Si el mensaje es urgente ("necesito", "ahora", "urgente") → prioridad alta o urgente.
- Nunca inventes fechas ni datos. Si no hay fecha, no pongas fecha_limite.
- Responde siempre en español.

## Output

Devuelve un JSON válido con esta estructura:
{
  "decision": {
    "accion": "crear",
    "titulo": "Llamar a Juan",
    "tipo": "tarea",
    "prioridad": "media",
    "razon": "El usuario dijo explícitamente que necesita hacer esta llamada"
  }
}

El campo "razon" explica por qué elegiste esa acción y esos valores.`

export async function razonarConGroq(
  mensaje: string,
  apiKey: string,
  contextoOpcional?: string,
): Promise<GroqDecision> {
  const clientUrl = 'https://api.groq.com/openai/v1/chat/completions'

  const userMessage = contextoOpcional
    ? `Contexto adicional: ${contextoOpcional}\n\nMensaje: ${mensaje}`
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
        Authorization: `Bearer ${apiKey}`,
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
      respuesta: `Lo siento, estoy teniendo problemas para procesar tu mensaje. Inténtalo de nuevo o escribe /ayuda.`,
      razon: `Error: ${err.message}`,
    }
  }
}
