/**
 * Creates a Firebase Auth user for a client using the Firebase Auth REST API.
 * This is used instead of Cloud Functions (which require Blaze plan).
 * The REST API allows creating users with just the Web API Key.
 */
export async function createClientAuthUser(
  clientEmail: string,
  clientFirstName?: string,
  clientLastName?: string
): Promise<{ uid?: string; alreadyExisted?: boolean; error?: string }> {
  const API_KEY = 'AIzaSyBT7Cag4jABSmA9oxser58rCFAsPaxeL84';
  const lowerEmail = clientEmail.toLowerCase();

  // Agency emails should not be created as client users
  const AGENCY_EMAILS = [
    'support@labinitial.com',
    'arafatinbusiness@gmail.com',
    'support@shopifyheroesagency.com',
    'arafat@labinitial.com',
    'arafat@shopifyheroesagency.com',
  ];

  if (AGENCY_EMAILS.includes(lowerEmail)) {
    return { error: 'Agency emails cannot be created as client users' };
  }

  try {
    // First, try to sign up the user (this will fail if user already exists)
    const tempPassword = generateTempPassword();
    const displayName = `${clientFirstName || ''} ${clientLastName || ''}`.trim() || lowerEmail.split('@')[0];

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: lowerEmail,
          password: tempPassword,
          displayName,
          returnSecureToken: false,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log(`Successfully created auth user for ${lowerEmail}, UID: ${data.localId}`);
      return { uid: data.localId, alreadyExisted: false };
    }

    // If user already exists, that's fine
    if (data.error?.message === 'EMAIL_EXISTS') {
      console.log(`User already exists for ${lowerEmail}`);
      return { alreadyExisted: true };
    }

    console.error('Error creating auth user:', data.error?.message || 'Unknown error');
    return { error: data.error?.message || 'Failed to create user' };
  } catch (error: any) {
    console.error('Error creating auth user:', error);
    return { error: error.message || 'Network error' };
  }
}

/**
 * Generates a secure temporary password.
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
