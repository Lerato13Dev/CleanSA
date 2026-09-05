# 🌱 CleanSA — Environmental Reporting & Intelligence

> **A student-built prototype exploring how technology can help communities identify, understand, and respond to environmental problems across South Africa. 🇿🇦**

CleanSA started with a simple question:

> **What if people could report environmental problems, see them on a map, track what happens to them, and eventually use that information to understand bigger environmental patterns?**

Instead of stopping at a basic reporting form, I wanted to explore how this idea could grow into something much bigger.

---

## 🚀 Live Demo

### 👀 Want to see CleanSA without downloading anything?

**👉 [View the Live Application](YOUR_LIVE_DEMO_LINK_HERE)**

You don't need to:

* Clone the repository
* Install anything
* Open VS Code
* Configure anything

Just open the link and explore the application.

> 🌱 **The live version is a hosted prototype and may continue to change as I develop the project.**

---

## 🌍 What is CleanSA?

CleanSA is an environmental reporting and mapping prototype designed around South African communities.

Users can:

📍 View environmental incidents on an interactive map
📝 Submit environmental reports
📸 Add photographic evidence
🚨 Indicate the severity of an incident
🔎 Search and filter reports
🗺️ Explore incidents geographically
📊 View environmental statistics
✅ Track verification and report status
🕐 Follow an incident's lifecycle
🤝 Interact with community reports

The prototype uses examples from different provinces and locations across South Africa rather than focusing on one specific city.

---

# 💡 The Bigger Idea

The interesting part of CleanSA isn't simply reporting litter.

The bigger vision is to eventually turn the platform into an:

## 🧠 Environmental Intelligence Network

Moving from:

> **"Someone reported rubbish."**

to:

> **"CleanSA understands where environmental problems are happening, how serious they are, whether they are recurring, what has been done about them, and where attention may be needed next."**

Future versions could explore:

🤖 AI-assisted environmental analysis
📊 Advanced analytics
🔥 Environmental hotspot detection
📈 Predictive environmental trends
🗺️ GIS and environmental data layers
🧹 Cleanup coordination
📄 Professional PDF reporting
🏛️ Organisation and municipality dashboards
📱 Offline-first reporting

---

# ✨ Current Features

### 📝 Environmental Reporting

Users can submit an environmental report through a multi-step process.

Reports can include:

* Title
* Description
* Location
* Province
* City
* Waste type
* Severity
* Photograph
* Timestamp

The goal was to make reporting straightforward while still collecting useful information.

---

### 📸 Photo Evidence

Users can attach photographs when submitting reports.

The prototype includes:

* Image validation
* File-size checking
* Image preview
* Remove/re-upload functionality

Photographs provide additional context and evidence for an environmental incident.

---

### 🗺️ Interactive Mapping

CleanSA uses **Leaflet** and **OpenStreetMap** to display environmental incidents geographically.

Users can:

📍 Explore incidents
🔎 Search locations
📝 Open report information
🌍 See environmental issues across South Africa

---

### 🔎 Search & Filtering

Reports can be searched and filtered using information such as:

* Province
* Status
* Severity
* Source
* Search terms

This makes it possible to move from simply **viewing information** to actually **exploring the data**.

---

### 🚦 Incident Lifecycle

Reports aren't treated as static posts.

An incident can move through stages such as:

**Reported → Under Review → Verified → Cleanup Planned → Cleanup In Progress → Resolved**

This creates the foundation for eventually tracking what happens after an environmental problem is reported.

---

### 📊 Statistics

CleanSA currently provides statistics based on the available report data.

The long-term goal is to expand this into:

📈 Environmental trends
📍 Hotspot analysis
🚨 Severity patterns
♻️ Waste categories
⏱️ Resolution times
🧹 Cleanup activity
🌱 Environmental impact

---

# 📄 Reporting & Analytics — Future Direction

One of the major features I am exploring is a dedicated **Reports & Analytics** system.

The idea is that users could select a location, province, date range, or specific incident and generate a professional environmental report.

Potential reports include:

📄 Location Reports
📄 Province Reports
📄 Date-Range Reports
📄 Individual Incident Reports
📄 Cleanup Reports
📄 Environmental Intelligence Reports

Reports could contain:

* Statistics
* Charts
* Maps
* Photographs
* Incident descriptions
* Timelines
* Cleanup information
* Environmental impact
* Recommendations

The goal is to turn CleanSA's collected information into something that can actually be **analysed, presented, and used for decision-making**.

---

# 🧠 Future Intelligence

The long-term direction of CleanSA includes experimenting with more advanced capabilities.

### 🌱 CleanScore

A possible environmental score for a location based on factors such as:

* Incident frequency
* Severity
* Recurrence
* Outstanding incidents
* Verification
* Cleanup history
* Environmental risk

---

### 🔥 Hotspot Intelligence

Identify areas where environmental problems appear to be:

* Frequent
* Recurring
* Severe
* Increasing
* Remaining unresolved

The goal is to eventually make the map more than a collection of markers.

---

### 🤖 AI-Assisted Environmental Analysis

Future experimentation could include AI for:

📸 Image classification
♻️ Waste-type identification
🚨 Severity assistance
🔍 Duplicate-report detection
📍 Hotspot analysis
📈 Predictive environmental trends

AI would be used where it provides actual value rather than simply adding AI for the sake of saying the project uses AI.

---

# 🤖 How I Used AI

I want to be transparent about something important.

**AI was part of my development process.**

I used multiple AI tools as a kind of **development sidekick / pair-programming assistant** throughout the project.

I used AI to help me with things such as:

💡 Brainstorming ideas
🏗️ Exploring application architecture
🎨 Thinking through UI/UX improvements
🧠 Developing the larger CleanSA concept
🐛 Debugging and troubleshooting
💻 Exploring code implementations
🔎 Understanding unfamiliar concepts
📊 Thinking through analytics
🗺️ Exploring mapping functionality
📝 Improving documentation
🔄 Reviewing and iterating on ideas

However, the project was not simply:

**"AI → generate everything → upload to GitHub."**

My role was to:

* Decide what I wanted to build
* Describe the problem and direction
* Ask questions
* Evaluate suggestions
* Test implementations
* Change and refine ideas
* Make design decisions
* Decide which features belonged in the project
* Understand the code being used
* Iterate on the application

I treated AI more like having **multiple technical assistants sitting beside me while I developed the project**.

The final direction of CleanSA came from that process of:

**Idea → conversation → experimentation → implementation → testing → refinement.**

I believe being able to work effectively with AI is becoming an important development skill, but I also believe that understanding **why** something is being built is just as important as generating the code.

---

# 🛠️ Technologies

The current prototype uses:

* 🌐 HTML
* 🎨 CSS
* ⚡ JavaScript
* 🗺️ Leaflet
* 🌍 OpenStreetMap
* 💾 Browser localStorage
* 🖥️ VS Code

I intentionally kept the current version relatively lightweight while focusing on functionality, architecture, UI/UX, and learning.

---

# 🏗️ Application Structure

The current JavaScript is organised into areas such as:

```text
CleanSA
│
├── 🧪 Mock / Sample Data
├── 🔌 API Abstraction Layer
├── 💾 State & Persistence
├── 🧰 Utility Functions
├── 🗺️ Map Provider
├── 📊 Rendering & Statistics
├── 🔎 Search & Filtering
├── 📄 Report Details
├── 📝 Report Submission
├── 🔔 Notifications
└── 🎨 UI / Application Wiring
```

The API abstraction layer is intentionally separated so that the prototype can eventually move from mock data to real API/database communication.

---

# 💾 Prototype Architecture

The current version uses browser `localStorage` to keep submitted reports available after refreshing the application.

This is **prototype functionality**, not a production database.

The eventual architecture could become:

```text
        👤 Users
           │
           ▼
      🌐 Frontend
           │
           ▼
       🔐 Secure API
           │
           ▼
       ⚙️ Backend
           │
      ┌────┴────┐
      ▼         ▼
 🗄️ Database   ☁️ Image Storage
      │
      ▼
📊 Analytics / 🤖 AI
```

This would eventually allow CleanSA to support:

🔐 Authentication
👤 User accounts
🛡️ Role-based access
🗄️ Database persistence
☁️ Image storage
🔌 Real APIs
📊 Advanced analytics
🤖 AI services

---

# 🌱 Why I Built This

Environmental problems aren't just numbers on a screen.

They affect:

🏘️ Communities
🌊 Water systems
🏫 Schools
🌳 Public spaces
🏙️ Cities
🌍 The environment

I wanted to explore whether software could connect:

**People + Location + Evidence + Data + Action**

into one platform.

CleanSA is my attempt to explore that idea while continuing to develop my skills as an IT student.

---

# 📚 What I'm Learning

This project has allowed me to explore more than just writing HTML, CSS and JavaScript.

I'm learning about:

🧑‍💻 Front-end development
🗺️ Interactive mapping
📊 Data visualisation
🔌 API architecture
💾 Data persistence
📱 Responsive design
🧠 AI-assisted development
📈 Analytics
🏗️ Software architecture
🔐 Security considerations
🌍 Technology and real-world problems

More importantly, I'm learning how to take an idea and ask:

> **"How can I turn this into something that could actually be useful?"**

---

# 🧪 Prototype Disclaimer

CleanSA currently contains **sample/demo environmental data**.

The information displayed in the prototype should **not be interpreted as verified real-world environmental information**.

The application is an experimental project designed to explore the technology and concept.

It is not currently intended to replace official municipal reporting systems, emergency services, environmental authorities, or other official channels.

---

# 🚀 Running the Project

If you want to explore the source code:

### 1️⃣ Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2️⃣ Open the project

Open the folder in **VS Code**.

### 3️⃣ Run it

Open the HTML file in your browser, or use an extension such as **Live Server** for a better development workflow.

### 4️⃣ Explore

Try:

🗺️ Exploring the map
🔎 Filtering reports
📄 Opening incidents
📝 Creating a report
📸 Uploading an image
🚦 Exploring different statuses

---

# 🔮 Future Vision

The long-term concept is:

```text
             👥 COMMUNITY
                  │
                  ▼
            📝 REPORT
                  │
                  ▼
            🔍 VERIFY
                  │
                  ▼
          🧠 ANALYSE DATA
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    🗺️ HOTSPOTS          📊 ANALYTICS
        │                   │
        └─────────┬─────────┘
                  ▼
             🚨 PRIORITY
                  │
                  ▼
               🧹 ACTION
                  │
                  ▼
             📸 EVIDENCE
                  │
                  ▼
              ✅ RESOLVE
                  │
                  ▼
            📄 REPORTING
                  │
                  ▼
           🌱 MEASURE IMPACT
```

The goal isn't simply to build another reporting website.

The goal is to explore how a student-built application could evolve from a simple prototype into something capable of providing **environmental intelligence, useful analytics, and measurable community value.**

---

# 👨🏽‍💻 About This Project

**CleanSA is a personal/student development project.**

I'm building it as part of my journey through IT and software development.

It represents how I like to learn:

> **Build → Break → Understand → Improve → Build Again.**

I'm not trying to pretend that the current prototype is a finished production platform.

Instead, I'm documenting the process of taking an idea from:

**💭 Concept**

→ **🧪 Prototype**

→ **💻 Application**

→ **📊 Analytics**

→ **🧠 Intelligence**

→ **🌍 Real-world possibility**

---

# ⭐ Thanks for Checking It Out

If you're a recruiter, developer, student, or simply someone interested in the project:

**Thanks for taking the time to look at CleanSA. 🌱**

The live application is the quickest way to experience the project:

### 👉 [Open CleanSA](YOUR_LIVE_DEMO_LINK_HERE)

The repository contains the development behind it, while the live version lets you immediately see what I've built.

---

### 🌱 Build something small. Learn from it. Make it better. See how far it can go. 🚀
