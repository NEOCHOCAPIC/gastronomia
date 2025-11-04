// Endpoint serverless para enviar candidaturas con CV adjunto usando Resend
// Recibe FormData con archivo PDF y envía email con el CV como adjunto

interface CandidaturaBody {
  nombre?: string;
  email?: string;
  telefono?: string;
  mensaje?: string;
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
    const formData = await request.formData();
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const telefono = formData.get('telefono') as string;
    const mensaje = formData.get('mensaje') as string;
    const cvFile = formData.get('cv') as File;

    console.log('FormData recibido:', {
      nombre: !!nombre,
      email: !!email,
      telefono: !!telefono,
      mensaje: !!mensaje,
      cvFile: !!cvFile,
      cvType: cvFile?.type,
      cvSize: cvFile?.size
    });

    // Validaciones
    if (!nombre || !email || !telefono || !cvFile) {
      console.error('Campos faltantes:', { nombre, email, telefono, cvFile: !!cvFile });
      return new Response(
        JSON.stringify({ success: false, message: 'Faltan campos requeridos (nombre, email, teléfono, CV)' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    // Validar tipo de archivo
    if (cvFile.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ success: false, message: `Solo se aceptan archivos PDF. Recibido: ${cvFile.type}` }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (cvFile.size > maxSize) {
      return new Response(
        JSON.stringify({ success: false, message: 'El archivo es demasiado grande. Máximo 5MB.' }),
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

    const TO = process.env.CONTACT_TO || import.meta.env.CONTACT_TO;
    const FROM = 'Mantagua Gastronomía <onboarding@resend.dev>';

    // Convertir archivo a buffer y luego a base64
    const arrayBuffer = await cvFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64CV = buffer.toString('base64');

    // Construir HTML del email
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
          .cv-section { margin-top: 30px; padding-top: 30px; border-top: 2px solid #f0f0f0; background: #f9f9f9; padding: 20px; border-radius: 4px; border-left: 4px solid #D4AF37; }
          .cv-note { color: #666; font-size: 13px; margin-top: 10px; }
          .footer { background: #f5f5f5; padding: 20px 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer a { color: #D4AF37; text-decoration: none; }
          a { color: #D4AF37; text-decoration: none; }
          strong { color: #222; }
          .highlight { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Nueva Candidatura Recibida</h1>
            <p>Solicitud de empleo - Mantagua Gastronomía</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="field-label">👤 Nombre Completo</div>
              <div class="field-value">${escapeHtml(nombre)}</div>
            </div>
            
            <div class="field">
              <div class="field-label">📧 Correo Electrónico</div>
              <div class="field-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
            
            <div class="field">
              <div class="field-label">📱 Teléfono</div>
              <div class="field-value"><a href="tel:${escapeHtml(telefono)}">${escapeHtml(telefono)}</a></div>
            </div>

            ${mensaje ? `
            <div class="field">
              <div class="field-label">💬 Carta de Presentación</div>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; color: #333; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6;">
                ${escapeHtml(mensaje)}
              </div>
            </div>
            ` : ''}

            <div class="cv-section">
              <div class="field-label">📄 CV Adjunto</div>
              <div class="field-value">
                ✅ Archivo PDF recibido: <strong>${escapeHtml(cvFile.name)}</strong> (${(cvFile.size / 1024).toFixed(2)} KB)
              </div>
              <div class="cv-note">
                El archivo CV está adjunto a este email. Descárgalo para revisar la candidatura completa.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Mantagua Gastronomía</strong></p>
            <p>📧 ${TO}</p>
            <p style="margin-top: 15px; color: #999;">
              Candidatura recibida desde el formulario de empleo del sitio web
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Llamada a la API de Resend con adjunto
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `🚀 Nueva Candidatura - ${escapeHtml(nombre)}`,
        html,
        attachments: [
          {
            filename: cvFile.name,
            content: base64CV
          }
        ]
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Resend error', resp.status, text);
      return new Response(
        JSON.stringify({ success: false, message: 'Error enviando candidatura' }),
        { 
          status: 502, 
          headers: { 
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          } 
        }
      );
    }

    // Enviar confirmación al candidato
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; background: white; }
          .footer { background: #f5f5f5; padding: 20px 30px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Candidatura Recibida</h1>
          </div>
          
          <div class="content">
            <p>Hola <strong>${escapeHtml(nombre)}</strong>,</p>
            
            <p>Gracias por tu interés en unirte a <strong>Mantagua Gastronomía</strong>.</p>
            
            <p>Hemos recibido tu candidatura. Nuestro equipo de recursos humanos revisará tu CV y se pondrá en contacto contigo dentro de los próximos 5 días laborales.</p>
            
            <p>Si tienes alguna pregunta, no dudes en escribirnos a <strong>recursos@mantagua.com</strong>.</p>
            
            <p>¡Muchas gracias por tu candidatura!</p>
            
            <p>Saludos,<br><strong>El equipo de Mantagua Gastronomía</strong></p>
          </div>
          
          <div class="footer">
            <p>Este es un email automático. Por favor, no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar confirmación al candidato (opcional, pero recomendado)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: '✅ Candidatura Recibida - Mantagua Gastronomía',
        html: confirmationHtml
      })
    }).catch((err) => {
      console.error('Error enviando confirmación:', err);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Candidatura recibida correctamente. Te enviaremos un email de confirmación.' 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        } 
      }
    );
  } catch (err) {
    console.error('Error en enviar-candidatura:', err);
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
