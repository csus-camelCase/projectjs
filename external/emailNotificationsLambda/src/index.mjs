import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize the SES client with the AWS region from environment variables
const ses = new SESClient({ region: process.env.AWS_REGION }); // Use environment variables for configuration

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
    // Return an error response if the JSON is invalid
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON format', error: error.message }),
    };
  }

  const { toAddress, subject, body } = parsedBody;

  // Validate required fields
  if (!toAddress || !subject || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields: toAddress, subject, body' }),
    };
  }

  // Validate email format
  if (!validateEmail(toAddress)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid email address' }),
    };
  }

  // Construct the email parameters
  const params = {
    Source: process.env.SES_SOURCE_EMAIL, // Use environment variables for sensitive data like the source email
    Destination: {
      ToAddresses: [toAddress],
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
    console.log('Email sent successfully:', data); // Log success for debugging purposes

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully', data }),
    };
  } catch (error) {
    console.error('Error sending email:', error); // Log errors for troubleshooting

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to send email', error }),
    };
  }
};