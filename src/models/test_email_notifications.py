# Test case for email notifications API

import requests

url = "https://api.camelcase-preprod.com/email/send"

headers = {
    "x-api-key": "rlFQMGqpw72w4NnytZBapaLsFnc2WaQH1mrTZ0un",
    "Content-Type": "application/json"
}
data = {
    "toAddress": "jacobsim@csus.edu, jj.srprj.test@gmail.com",
    "subject": "Test Email from Lambda",
    "body": "Hello, this is a test email."
}

response = requests.post(url, json=data, headers=headers)

print("Status Code:", response.status_code)
print("Response Body:", response.text)
