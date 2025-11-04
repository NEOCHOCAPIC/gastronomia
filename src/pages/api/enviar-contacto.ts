// Endpoint serverless para enviar emails usando Resend API
// Requiere la variable de entorno RESEND_API_KEY en Vercel

interface EmailBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Manejar OPTIONS request (CORS preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as EmailBody;
    const { name, email, phone, subject, message } = body || {};

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ success: false, message: 'Faltan campos requeridos' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    const RESEND_KEY = process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    if (!RESEND_KEY) {
      console.error('RESEND_API_KEY no está configurada');
      return new Response(
        JSON.stringify({ success: false, message: 'Servidor mal configurado' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    // Destinatario (puedes cambiarlo con la variable CONTACT_TO)
    const TO = process.env.CONTACT_TO || import.meta.env.CONTACT_TO;
    // Usar el dominio noreply.resend.dev de Resend (sin verificación requerida)
    const FROM = 'Mantagua Gastronomía <onboarding@resend.dev>';

    // Construir HTML del email con diseño profesional
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px 30px; background: white; }
          .field { margin-bottom: 24px; }
          .field-label { font-weight: 600; color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
          .field-value { color: #333; font-size: 15px; line-height: 1.6; }
          .message-section { margin-top: 30px; padding-top: 30px; border-top: 2px solid #f0f0f0; }
          .message-content { background: #f9f9f9; padding: 20px; border-left: 4px solid #D4AF37; border-radius: 4px; color: #333; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.7; }
          .footer { background: #f5f5f5; padding: 20px 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer a { color: #D4AF37; text-decoration: none; }
          a { color: #D4AF37; text-decoration: none; }
          strong { color: #222; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Nuevo Mensaje de Contacto</h1>
            <p>Formulario de contacto - Mantagua Gastronomía</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="field-label">👤 Nombre</div>
              <div class="field-value">${escapeHtml(name)}</div>
            </div>
            
            <div class="field">
              <div class="field-label">📧 Correo Electrónico</div>
              <div class="field-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
            
            <div class="field">
              <div class="field-label">📱 Teléfono</div>
              <div class="field-value">${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : '<em>No proporcionado</em>'}</div>
            </div>
            
            <div class="field">
              <div class="field-label">🏷️ Asunto</div>
              <div class="field-value">${escapeHtml(subject)}</div>
            </div>
            
            <div class="message-section">
              <div class="field-label">💬 Mensaje</div>
              <div class="message-content">${escapeHtml(message)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Mantagua Gastronomía</strong></p>
            <p>Este mensaje fue enviado desde el formulario de contacto de nuestro sitio web</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Llamada a la API de Resend
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `Contacto web: ${escapeHtml(subject)}`,
        html
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Resend error', resp.status, text);
      return new Response(
        JSON.stringify({ success: false, message: 'Error enviando email' }),
        { 
          status: 502, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado correctamente' }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        } 
      }
    );
  } catch (err) {
    console.error('Error en enviar-contacto:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Error del servidor' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        } 
      }
    );
  }
}
