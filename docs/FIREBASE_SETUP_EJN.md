# Firebase Setup Guide (Free Tier)

This guide will walk you through setting up Firebase Cloud Sync for OTTO CRM. **This is completely free.** We will stay on the "Spark" plan ($0/month).

## Step 1: Create a Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com/) and click **"Go to console"** (top right). Sign in with your Google account if asked.
2. Click the **"Create a project"** (or "Add project") button.
3. **Step 1:** Enter a project name, like `Otto CRM Data`. Check the terms boxes and click **Continue**.
4. **Step 2 (Google Analytics):** Turn **OFF** the switch for "Enable Google Analytics for this project". We don't need it.
5. Click **Create project**. Wait a minute for it to finish, then click **Continue**.

*(Important: If you ever see a prompt to "Upgrade", "Select a billing plan", or "Switch to Blaze", **ignore it or click cancel**. You only need the default free "Spark" plan.)*

## Step 2: Set up the Database

1. In the left menu of the Firebase console, click **Build** and select **Firestore Database**.
2. Click the **"Create database"** button.
3. **Database ID:** Leave it as `(default)` and click **Next**.
4. **Location:** Choose a location close to you (e.g., `nam5 (us-central)` or `us-east1`) and click **Next**.
5. **Security Rules:** Select **Start in test mode** (we will fix the rules in a second). Click **Create**.

### Secure the Database Rules
1. Once the database is created, look at the top of the Firestore page and click the **"Rules"** tab.
2. Delete all the text in the big box and replace it with exactly this:
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /otto_crm/{document} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click the **Publish** button.

## Step 3: Get your Configuration Values

1. Go to Project Settings by clicking the **Gear icon** ⚙️ (top left next to "Project Overview") and select **Project settings**.
2. Scroll down to the **"Your apps"** section. Since there are no apps, click the **Web icon** (it looks like `</>`).
3. **App nickname:** Type `Otto CRM Web` and click **Register app**.
4. A block of code will appear. **Ignore the code** and click **Continue to console**.
5. You are back on the "Project settings" page. Scroll down to the "Your apps" section again. Under the "SDK setup and configuration" section, you will see your keys.

We need two exact values from here:
*   **`FIREBASE_PROJECT_ID`**: Look for `projectId:` in the code block. It will look something like `"otto-crm-data-12345"`. Copy the part inside the quotes.
*   **`FIREBASE_API_KEY`**: Look for `apiKey:` in the code block. It will be a long string of random letters and numbers like `"AIzaSy..."`. Copy the part inside the quotes.

## Step 4: Add Values to Vercel

1. Go to your Vercel dashboard and click on your project: **`dream-cooling-crm`**.
2. Click the **Settings** tab at the top.
3. In the left menu, click **Environment Variables**.
4. We need to add the two variables you copied in Step 3.
5. **First Variable:**
   *   **Key:** Type exactly `FIREBASE_PROJECT_ID`
   *   **Value:** Paste your project ID (e.g., `otto-crm-data-12345`).
   *   Click **Save**.
6. **Second Variable:**
   *   **Key:** Type exactly `FIREBASE_API_KEY`
   *   **Value:** Paste your long API key (e.g., `AIzaSy...`).
   *   Click **Save**.
7. Once both are saved, Vercel needs to restart your app to use them. Click on the **Deployments** tab at the top of your Vercel project, find the most recent deployment (at the top), click the three dots (`...`) next to it, and select **Redeploy**.

You're done! Cloud sync is now active on the free tier.
