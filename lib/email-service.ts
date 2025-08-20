import emailjs from 'emailjs-com';


const EMAILJS_SERVICE_ID = 'service_klh99zf'; 
const EMAILJS_TEMPLATE_ID = 'template_ddna2b6';
const EMAILJS_USER_ID = 's8MFdSCNO3XGYiKzZ';


export interface WelcomeEmailData {
  user_name: string;
  user_email: string;
  account_type: string;
}

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  try {
    const isSeller = data.account_type === 'seller';
    const accountTypeText = isSeller ? 'Vendedor' : 'Comprador';
    
    const templateParams = {
      to_name: data.user_name,
      to_email: data.user_email,
      account_type: accountTypeText,
      message: `¡Bienvenido a Servido, ${data.user_name}! Tu cuenta ha sido creada como ${accountTypeText.toLowerCase()}.`,
      subject: '¡Bienvenido a Servido!',
      email: data.user_email, 
      name: 'Servido', 
      title: '¡Bienvenido a Servido!' 
    };

    console.log('Enviando email con parámetros:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );

    console.log('Email de bienvenida enviado exitosamente:', result);
    
   
    if (result && result.status === 200) {
      console.log('✅ Email enviado correctamente con status 200');
    } else {
      console.warn('⚠️ Email enviado pero con status diferente:', result?.status);
    }
  } catch (error) {
    console.error('❌ Error enviando email de bienvenida:', error);
   
  }
};

// Función para inicializar EmailJS
export const initEmailJS = () => {
  emailjs.init(EMAILJS_USER_ID);
};


export const testEmailService = async (testEmail: string): Promise<void> => {
  try {
    const templateParams = {
      to_name: 'Usuario de Prueba',
      to_email: testEmail,
      account_type: 'Comprador',
      message: 'Este es un email de prueba para verificar la configuración.',
      subject: 'Prueba de Email - Servido'
    };

    console.log('Enviando email de prueba con parámetros:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );

    console.log('Email de prueba enviado exitosamente:', result);
    
    if (result && result.status === 200) {
      console.log('✅ Email de prueba enviado correctamente');
      alert('Email de prueba enviado. Revisa tu bandeja de entrada y spam.');
    } else {
      console.warn('⚠️ Email de prueba enviado pero con status diferente:', result?.status);
    }
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error);
    alert('Error enviando email de prueba: ' + error);
    throw error;
  }
}; 