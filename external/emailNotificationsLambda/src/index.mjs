/*
Email Notifications API 
Hosted on API gateway using a NodeJS lambda function

JSON body example: 
{
  "toAddress": "email1, email2",
  "subject": "Test Email from Lambda",
  "body": "Hello, this is a test email."
}
*/
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize the SES client with the AWS region from environment variables
const ses = new SESClient({ region: process.env.AWS_REGION });

// Function to validate email format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic regex for email validation
  return re.test(email);
};

export const handler = async (event) => {
  let parsedBody;

  // Parse and validate the incoming event body
  try {
    parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON format', error: error.message }),
    };
  }

  let { toAddress, subject, body } = parsedBody;

  // Validate required fields
  if (!toAddress || !subject || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields: toAddress, subject, body' }),
    };
  }

  // Convert to an array if multiple emails are provided (comma-separated)
  const toAddressesArray = toAddress.split(',')
    .map(email => email.trim()) // Remove extra spaces
    .filter(email => validateEmail(email)); // Validate each email

  // Ensure at least one valid email remains
  if (toAddressesArray.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'No valid email addresses provided' }),
    };
  }

  // Construct the email parameters
  const params = {
    Source: process.env.SES_SOURCE_EMAIL,
    Destination: {
      ToAddresses: toAddressesArray, // Pass the array of email addresses
    },
    Message: {
      Body: {
        Text: { Data: body },
      },
      Subject: { Data: subject },
    },
  };

  try {
    // Create and send the email using SES
    const command = new SendEmailCommand(params);
    const data = await ses.send(command);
    console.log('Email sent successfully:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully', data }),
    };
  } catch (error) {
    console.error('Error sending email:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to send email', error }),
    };
  }
};