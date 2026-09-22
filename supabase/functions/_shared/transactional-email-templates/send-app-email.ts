import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { sendTemplateEmail } from './send-email.ts'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sends a registered app email and mirrors the outcome into email_send_log
 * (app-side history). Delivery, retries, rate limits and suppression are
 * enforced by Lovable's managed email API — this log is a record, never a gate.
 */
export async function sendAppEmail(
  supabase: any,
  templateName: string,
  recipientEmail: string,
  options: {
    templateData?: Record<string, unknown>
    idempotencyKey?: string
    /** Stored in email_send_log.message_id — used by senders for one-shot idempotency. */
    messageId?: string
  } = {},
): Promise<'sent' | 'suppressed' | 'failed'> {
  const logRow = (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string,
  ) => ({
    message_id: options.messageId ?? null,
    template_name: templateName,
    recipient_email: recipientEmail,
    status,
    ...(errorMessage ? { error_message: errorMessage.slice(0, 1000) } : {}),
  })

  const log = async (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string,
  ) => {
    const { error } = await supabase
      .from('email_send_log')
      .insert(logRow(status, errorMessage))
    if (error) {
      console.error('Failed to write email_send_log', {
        status,
        templateName,
        code: error.code,
        message: error.message,
      })
    }
  }

  /** Envoi avec reprise sur 429 (« ralentis ») : une salve de likes dépasse
   *  l'allocation horaire de l'espace de travail et perdait la notification.
   *  La clé d'idempotence garantit qu'aucun doublon n'est envoyé. */
  const sendWithRetry = async () => {
    const maxAttempts = 3
    for (let attempt = 1; ; attempt++) {
      try {
        return await sendTemplateEmail(templateName, recipientEmail, {
          templateData: options.templateData as Record<string, any> | undefined,
          idempotencyKey: options.idempotencyKey,
        })
      } catch (error) {
        const rateLimited = error instanceof EmailAPIError && error.status === 429
        if (!rateLimited || attempt >= maxAttempts) throw error
        const waitSeconds = Math.min(
          (error as EmailAPIError).retryAfterSeconds ?? attempt * 5,
          15,
        )
        console.warn('Email rate limited, retrying', { templateName, attempt, waitSeconds })
        await sleep(waitSeconds * 1000)
      }
    }
  }

  try {
    const result = await sendWithRetry()

    if (!result.sent) {
      await log('suppressed')
      return 'suppressed'
    }

    await log('sent')
    return 'sent'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('App email send failed', { templateName, message })
    await log('failed', message)
    return 'failed'
  }
}
