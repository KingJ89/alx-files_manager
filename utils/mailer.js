import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import mimeMessage from 'mime-message';
import { gmail_v1 as gmailAPI, google } from 'googleapis';

const ACCESS_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const AUTH_TOKEN_FILE = 'auth_token.json';
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Prompts the user to authorize the application and retrieves a new token.
 * @param {google.auth.OAuth2} authClient The OAuth2 client instance.
 * @param {function} onAuthCallback Callback to execute with the authorized client.
 */
async function requestNewToken(authClient, onAuthCallback) {
  const authURL = authClient.generateAuthUrl({
    access_type: 'offline',
    scope: ACCESS_SCOPES,
  });
  console.log('Visit this URL to authorize the application:', authURL);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the authorization code: ', (code) => {
    rl.close();
    authClient.getToken(code, (err, token) => {
      if (err) {
        console.error('Error obtaining access token:', err);
        return;
      }
      authClient.setCredentials(token);
      writeFileAsync(AUTH_TOKEN_FILE, JSON.stringify(token))
        .then(() => {
          console.log('Token stored successfully:', AUTH_TOKEN_FILE);
          onAuthCallback(authClient);
        })
        .catch((writeError) => console.error('Error saving token:', writeError));
    });
  });
}

/**
 * Authorizes the app using the provided credentials and executes the callback.
 * @param {Object} appCredentials The application credentials.
 * @param {function} onAuthCallback The callback to execute with the authorized client.
 */
async function initializeAuthorization(appCredentials, onAuthCallback) {
  const { client_secret: secret, client_id: id, redirect_uris: redirects } = appCredentials.web;
  const authClient = new google.auth.OAuth2(id, secret, redirects[0]);

  try {
    const tokenData = await readFileAsync(AUTH_TOKEN_FILE);
    authClient.setCredentials(JSON.parse(tokenData));
    onAuthCallback(authClient);
  } catch {
    await requestNewToken(authClient, onAuthCallback);
  }
}

/**
 * Sends an email using the Gmail API.
 * @param {google.auth.OAuth2} authClient The authorized OAuth2 client.
 * @param {gmailAPI.Schema$Message} emailData The email data to be sent.
 */
function executeMailSend(authClient, emailData) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });
  
  gmail.users.messages.send({
    userId: 'me',
    requestBody: emailData,
  }, (err) => {
    if (err) {
      console.error('Error while sending the email:', err.message || err.toString());
      return;
    }
    console.log('Email sent successfully.');
  });
}

/**
 * Utility class for Gmail email management.
 */
export default class EmailService {
  static verifyAuthorization() {
    readFileAsync('credentials.json')
      .then(async (data) => {
        await initializeAuthorization(JSON.parse(data), (authClient) => {
          if (authClient) {
            console.log('Authorization verified successfully.');
          }
        });
      })
      .catch((err) => console.error('Error loading credentials file:', err));
  }

  static constructEmail(recipient, subject, bodyContent) {
    const senderAddress = process.env.EMAIL_SENDER;
    const emailPayload = {
      type: 'text/html',
      encoding: 'UTF-8',
      from: senderAddress,
      to: [recipient],
      cc: [],
      bcc: [],
      replyTo: [],
      date: new Date(),
      subject,
      body: bodyContent,
    };

    if (!senderAddress) {
      throw new Error('Sender address is not defined.');
    }

    if (mimeMessage.validMimeMessage(emailPayload)) {
      const mimeEmail = mimeMessage.createMimeMessage(emailPayload);
      return { raw: mimeEmail.toBase64SafeString() };
    }
    throw new Error('Invalid MIME message structure.');
  }

  static dispatchEmail(emailData) {
    readFileAsync('credentials.json')
      .then(async (data) => {
        await initializeAuthorization(
          JSON.parse(data),
          (authClient) => executeMailSend(authClient, emailData),
        );
      })
      .catch((err) => console.error('Error loading credentials file:', err));
  }
}
