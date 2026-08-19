import { sendTemplateEmail } from './send-email.ts'

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

  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, {
      templateData: options.templateData as Record<string, any> | undefined,
      idempotencyKey: options.idempotencyKey,
    })

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
