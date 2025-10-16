const { logEmailSent } = require('../utils/emailLogger');

/**
 * Función para loguear los emails enviados en la base de datos
 */
async function logEmailSent({
  to,
  subject,
  provider,
  status,
  messageId = null,
  error = null,
  category = 'general'
}) {
  try {
    const { error: dbError } = await supabase
      .from('email_logs')
      .insert([{
        recipient: to,
        subject,
        provider,
        status,
        message_id: messageId,
        error_message: error,
        category,
        created_at: new Date().toISOString()
      }]);

    if (dbError) {
      console.error('Error logging email:', dbError);
    }
  } catch (error) {
    console.error('Error logging email to database:', error);
  }
}

module.exports = { logEmailSent };