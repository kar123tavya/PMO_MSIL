# User Manual: PMO Dashboard

Welcome to the PMO Dashboard! This manual will guide you through the features and operations of the platform.

## 1. Getting Started
### Running the Application
1. Open the project folder (`server` directory) on your company machine.
2. Open the Command Prompt or Terminal and run: `node server.js`
3. Open Google Chrome (or any modern browser) and navigate to: `http://localhost:3000`

### Initial Login
* **Default Admin Account:**
  * **Email:** admin@maruti.co.in
  * **Password:** admin123
* *It is highly recommended to create a new admin account for yourself and delete this default one later for security.*

## 2. Navigation Overview
The left sidebar contains all the main tools you need:
* **Dashboard (▦):** The master list of all projects across all divisions and themes.
* **Flagship Projects (◈):** A filtered view specifically for tracking high-priority "Flagship" projects.
* **Gantt Chart (▤):** A visual timeline of project schedules.
* **Health Card (◧):** A statistical summary of project performance (RAG status).
* **PIC Tracker (◩):** A heatmap tracking how long it has been since a PIC updated their projects.
* **Audit Log (◫):** A detailed history of every single edit made to any project.

## 3. Managing Users (Admins Only)
1. Go to the **Users** tab (via the profile dropdown or sidebar if visible).
2. Click **"+ Add User"**.
3. Fill in their details (Name, Email, Password) and assign them a **Role** (e.g., PIC, TL, SIC, DPM, Admin).
4. Users must log in with their exact email and the password you set for them.

## 4. Managing Projects
### Creating a Single Project
1. On the **Dashboard**, click the blue **"+ Add Project"** button.
2. Fill out the details.
   * *Note: If your Division, Theme, or Category is not in the dropdown, simply type a custom name and hit Enter! It will be automatically saved and added to the list.*

### Importing Projects from Excel (Bulk Upload)
1. On the **Dashboard**, click the green **"Import"** button.
2. Select your Master Excel file. 
3. The system will automatically map the columns, generate the projects, and update everyone's screens instantly.

## 5. Using the PIC Tracker Heatmap
The **PIC Tracker** is designed to identify neglected projects:
1. Navigate to the **PIC Tracker**.
2. You will see a list of all Person-in-Charge (PIC) members. The system automatically pushes the PIC with the most neglected project to the top.
3. Look at the color codes:
   * **Light Red:** Updated within the last 10 days.
   * **Medium Red:** Updated between 11 and 60 days ago.
   * **Dark Red:** Neglected for over 2 months.
4. Click on a PIC's row to expand it and see *every* project assigned to them, completely sorted by staleness.

## 6. Audit Logging
Every time a user edits a project (changes a date, modifies a score, updates a status), the system secretly logs it.
* Go to the **Audit Log** to see who changed what. 
* It records the exact Timestamp, the User's Name, the Field Changed, the Old Value, and the New Value.

## 7. AI Assistant
If you need help parsing data or looking up a specific project, click the **AI Chat Widget** in the bottom right corner of the screen. You can ask it questions like *"How many projects are in IL3?"* or *"Who is assigned to the Engine QA project?"*
