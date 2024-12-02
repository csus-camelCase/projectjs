# System 1 Search Web Application

## Project Overview
This project is being developed for **System 1 Search**, a NorCal-based recruitment agency for medical professionals. The web app is designed to streamline the process of connecting job candidates with potential employers by providing features such as account creation, job preference management, and event scheduling. 

---

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
  - Manage users, job postings, and events.

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
1. **User**
   - Stores user credentials and account details.
2. **Profile**
   - Contains user profile information, including resume and job preferences.
3. **Job**
   - Represents active job postings.
4. **Event**
   - Stores user-scheduled events like interviews or meetings.

---

## Installation

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
