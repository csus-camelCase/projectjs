![image](https://github.com/user-attachments/assets/9bd614d9-fb19-4c54-b082-4d639b1aea9a)

# System 1 Search Web Application

## Project Overview
This project is being developed for **System 1 Search**, a NorCal-based recruitment agency for medical professionals. The web app is designed to streamline the process of connecting job candidates with potential employers by providing features such as account creation, job preference management, and event scheduling. 

---
![image](https://github.com/user-attachments/assets/e70eb73b-fc83-4bfb-be95-8c01a2df7712)

## Features

### User Functionality
- **Account Management**
  - User registration and secure login/logout.
  - Password encryption with `bcrypt`.
  - Session management with `express-session`.

- **Profile Setup**
  - Add personal details, job preferences, and upload resumes.
  - Resumes are stored securely in AWS S3.

- **Job Preferences**
  - Save and manage job preferences, including title, location, and job type.

- **Event Scheduling**
  - Schedule events with details like title, date, time, and location.
  - Option to include calendar links for external scheduling.

- **Admin Dashboard**
  - Allows recruiters at System 1 to manage users, job postings, and events.

![image](https://github.com/user-attachments/assets/10c083b6-5d85-428a-8f9e-1b4d1ef75811) ![image](https://github.com/user-attachments/assets/7b7c6501-15be-445b-9667-4a6060151bed)


---

## Technical Overview

### Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Frontend:** EJS templates, static HTML/CSS
- **File Storage:** AWS S3
- **Authentication:** `bcrypt`
- **Environment Management:** `dotenv`
- **File Uploads:** `multer`

### Modules
- `express`: JS Framework for server routing and middleware.
- `mongoose`: MongoDB object modeling for schema design.
- `body-parser`: For parsing request bodies.
- `multer`: For handling file uploads.
- `aws-sdk`: AWS SDK for interacting with S3.

### Database Schemas
![image](https://github.com/user-attachments/assets/7c3fa599-8365-4028-ac74-c1a040fdd007)

1. **Admin**
   - Stores admin credentials and account details.
3. **Candidate/User**
   - Stores user credentials and account details.
4. **Profile Management**
   - Contains information relevant to profile management.
5. **Job List**
   - Represents active job postings.
6. **Event Manager**
   - Stores user-scheduled events like interviews or meetings.

---

## Setup Instructions

### Prerequisites
- Node.js and npm
- MongoDB instance
- AWS account with S3 bucket
- `.env` file for environment variables

### Steps
**1. Clone the repository:**
  ```bash
   git clone https://github.com/csus-camelCase/projectjs.git
   ```
**2. Navigate to the project directory:**
   ```bash
   cd projectjs
   ```
**3. Install dependencies:**
  ```bash
  npm install
  ```
**4. Setup environment variables: Create a .env file in the project root with the following:**
```plaintext
  PORT=3001
  CONNECTION=your_connection_string
  AWS_ACCESS_KEY_ID=your_access_key_id
  AWS_SECRET_ACCESS_KEY=your_aws_secret_key
  AWS_REGION=your_aws_region
  S3_BUCKET_NAME=your_s3_bucket_name
```
**5. Start the server:** 
  ```bash
  npm run start
  ```

--- 

## Testing
- place holder to do in CSC 191
  
---

## Deployment
- place holder to do in CSC 191 

---

## Timeline (Tentative)

Key milestones we expect to complete in **CSC 191**, based on the user stories and features defined in our Jira.

| Phase                     | Milestone                                      | Estimated Completion Date |
|---------------------------|----------------------------------------------------------|---------------------------|
| **Phase 1: API Integrations** | Complete integration of all APIs to enable dynamic content generation on HTML pages. | Late January '25 |
| **Phase 2: Aesthetic Finalization** | Finalize any aesthetic-related changes to the web pages, ensuring a sleek and professional user experience. | Late February '25 |
| **Phase 3: IT Testing** | Perform thorough internal testing (IT) to ensure the code functions as expected. The plan is to debug, handle any errors, and optimize performance. | Late March '25 |
| **Phase 4: UAT Testing** | Conduct User Acceptance Testing (UAT) with System 1 staff to verify the system meets requirements and expectations. We will collect feedback and address any issues. | Mid April '25 |
| **Phase 5: Final Delivery** | Finalize all documentation and prepare for the final delivery to stakeholders (and possible deployment to production). | Early May '25 |


Jira Timeline for CSC 191 (dates subject to change)

![image](https://github.com/user-attachments/assets/5a75224a-6808-4870-b645-6e0cab0baba5)




---

**NOTE:** The **"External"** folder contains code for external applications part of this project (ex. AWS Lambda Functions). 

---





## Developers
- **Zachary Estelita**
- **Zamiel Red Jose Gripo**
- **Jacob Hurlburt**
- **Tom Bolyard**
- **Jacob Sim**
- **Rey Halili**
- **Z Wiese**
- **Kenny Ahn**
- **Oluwatamilore Kuti**
