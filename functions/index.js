const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const AGENCY_EMAILS = [
  'support@labinitial.com',
  'arafatinbusiness@gmail.com',
  'support@shopifyheroesagency.com',
  'arafat@labinitial.com',
  'arafat@shopifyheroesagency.com',
];

/**
 * Generates a secure temporary password.
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Creates a Firebase Auth user for a client when a project is created.
 * This is triggered by a Firestore onCreate event on the projects collection.
 * It creates the user with a temporary password so the client can sign in.
 * The client should use "Forgot Password" to set their own password.
 */
exports.createClientAuthUser = functions.firestore
  .document('projects/{projectId}')
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const clientEmail = project.clientEmail;
    const clientFirstName = project.clientFirstName || '';
    const clientLastName = project.clientLastName || '';

    if (!clientEmail) {
      console.log('No client email found, skipping auth user creation');
      return null;
    }

    // Skip if the email is an agency email
    if (AGENCY_EMAILS.includes(clientEmail.toLowerCase())) {
      console.log(`Email ${clientEmail} is an agency email, skipping auth user creation`);
      return null;
    }

    try {
      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(clientEmail);
        console.log(`User already exists for ${clientEmail}, UID: ${existingUser.uid}`);
        return { uid: existingUser.uid, alreadyExisted: true };
      } catch (err) {
        // User doesn't exist, which is what we want - proceed to create
        if (err.code !== 'auth/user-not-found') {
          throw err;
        }
      }

      // Generate a temporary password
      const tempPassword = generateTempPassword();

      // Create the user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: clientEmail,
        emailVerified: false,
        password: tempPassword,
        displayName: `${clientFirstName} ${clientLastName}`.trim() || clientEmail.split('@')[0],
        disabled: false,
      });

      console.log(`Successfully created auth user for ${clientEmail}, UID: ${userRecord.uid}`);

      return { uid: userRecord.uid, alreadyExisted: false };
    } catch (error) {
      console.error(`Error creating auth user for ${clientEmail}:`, error);
      // Don't throw - we don't want to block the project creation if auth fails
      return { error: error.message };
    }
  });

/**
 * Callable function to manually create a client auth user.
 * Can be called from the client side after creating a project.
 */
exports.createClientAuthUserCallable = functions.https.onCall(async (data, context) => {
  // Ensure the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to create a client user.'
    );
  }

  const callerEmail = context.auth.token.email;
  
  // Ensure the caller is an agency
  if (!AGENCY_EMAILS.includes(callerEmail.toLowerCase())) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only agency users can create client accounts.'
    );
  }

  const { clientEmail, clientFirstName, clientLastName } = data;

  if (!clientEmail) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Client email is required.'
    );
  }

  const lowerEmail = clientEmail.toLowerCase();

  // Skip if the email is an agency email
  if (AGENCY_EMAILS.includes(lowerEmail)) {
    return { message: 'Agency emails are not created as client users', skipped: true };
  }

  try {
    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(lowerEmail);
      console.log(`User already exists for ${lowerEmail}, UID: ${existingUser.uid}`);
      return { uid: existingUser.uid, alreadyExisted: true };
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: lowerEmail,
      emailVerified: false,
      password: tempPassword,
      displayName: `${clientFirstName || ''} ${clientLastName || ''}`.trim() || lowerEmail.split('@')[0],
      disabled: false,
    });

    console.log(`Successfully created auth user for ${lowerEmail}, UID: ${userRecord.uid}`);

    return { uid: userRecord.uid, alreadyExisted: false };
  } catch (error) {
    console.error(`Error creating auth user for ${lowerEmail}:`, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
