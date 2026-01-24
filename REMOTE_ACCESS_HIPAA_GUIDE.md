## Remotely Accessing the Firewood Bank App (HIPAA‑Aware, Low/No Cost)

This document describes how a small non‑profit can let staff use the **existing Firewood Bank desktop app** from other locations while staying as close as possible to HIPAA expectations **without moving PHI into a public cloud**.

The current application is a **Tauri desktop app** (Rust backend + SQLite DB + React UI) that runs on a single Windows machine. All sensitive client and staff data lives on that machine’s local disk.

> **Important:** Strict HIPAA compliance is not just a technical configuration; it also requires policies, training, and legal agreements (BAAs). The approach below is designed to minimize risk and align with HIPAA principles, but it does **not** replace formal legal/compliance work.

---

## 1. Constraints & Design Principles

1. **No “free cloud hosting” for PHI**  
   Free tiers of services like Render, Vercel, Netlify, Railway, Heroku, etc. do **not** sign Business Associate Agreements (BAAs). You cannot host PHI on them and still be HIPAA‑compliant.

2. **Keep PHI on hardware you control**  
   The safest low‑cost pattern is to store all PHI on a single, hardened machine (the “Firewood Bank workstation”) inside your physical control (e.g., office, secure home office), and allow remote access to that machine via VPN and/or remote desktop.

3. **Remote users see a screen, not the data store**  
   Staff connect to the workstation using an encrypted tunnel (VPN) and a screen‑sharing protocol (RDP). The application runs *only* on the workstation, so PHI never sits on remote laptops or random cloud servers.

4. **Minimum viable security controls**  
   Even in a small non‑profit, you should implement:
   - Full‑disk encryption (BitLocker)
   - Named user accounts, strong passwords, lockscreen timeouts
   - Logged and limited admin access
   - Up‑to‑date OS and antivirus

---

## 2. High‑Level Architecture

```mermaid
flowchart LR
  internetUser[remote_staff_laptop] -->|VPN tunnel| vpnNetwork[Secure_VPN_Network]
  vpnNetwork -->|RDP| firewoodWorkstation[Firewood_Workstation_(Windows+Tauri_App)]
  firewoodWorkstation --> localDB[(Encrypted_SQLite_DB)]
```

**Key ideas:**

- The **Firewood Workstation** runs Windows 10/11 Pro, the Tauri/FirewoodBank app, and stores the SQLite database on an encrypted drive.
- Remote staff connect via **VPN** into a private network, then use **Remote Desktop** (RDP) or another secure remote‑desktop tool to control that workstation.
- Only the workstation ever stores PHI at rest; remote devices just display pixels and send keyboard/mouse events.

---

## 3. Prepare the Firewood Workstation

### 3.1 Hardware & OS

1. Use a dedicated Windows 10/11 Pro machine (desktop or laptop) with:
   - Recent CPU and at least 8–16 GB RAM.
   - Reliable, wired internet if possible.
2. Create:
   - One **local Administrator** account (for IT) with a strong, unique password.
   - A **standard user account** (or separate accounts) for staff who will actually run the app.

### 3.2 Full‑Disk Encryption (BitLocker)

1. Open **Control Panel → System and Security → BitLocker Drive Encryption**.
2. Turn on BitLocker for the system drive (C:).
3. Save the recovery key:
   - Print a copy and lock it in a secure place.
   - Optionally store an encrypted copy in a password manager.

BitLocker ensures that if the machine is lost or stolen, the PHI on disk is still protected.

### 3.3 OS Hardening Basics

- **Windows Updates:**  
  Turn on automatic updates; schedule reboots outside business hours.
- **Antivirus:**  
  Use Windows Defender or an equivalent AV with real‑time protection.
- **Account policies:**  
  - Require strong passwords (length ≥ 12 chars).
  - Configure screen lock after 5–10 minutes of inactivity (Settings → Accounts → Sign‑in options).
  - Disable “auto‑login” and ensure users must enter a password after sleep/boot.
- **Local network firewall:**  
  Leave Windows Defender Firewall enabled; only open RDP to the local network or VPN interface, not to the whole internet.

### 3.4 Install the Firewood Bank App

1. Log in as the **staff user** (not the admin).
2. Install the Tauri/FirewoodBank app.
3. Confirm where the app stores its data (SQLite DB, log files). Make sure it is on the **encrypted system drive** (C:).
4. Test:
   - Launch the app.
   - Verify that you can log in and perform normal workflows.

---

## 4. Secure Remote Access Options

You need **two layers**:

1. A **VPN or overlay network** so that remote devices can reach the workstation safely.
2. A **remote desktop protocol** (usually Windows RDP) so users can interact with the GUI.

### 4.1 Option A – Tailscale + Windows Remote Desktop (recommended)

Tailscale creates an encrypted mesh VPN between devices and has a generous free tier for small teams.

#### 4.1.1 Set up Tailscale

1. Create a Tailscale account for your org (e.g., `it@yourorg.org`).
2. On the **workstation**:
   - Install the Tailscale client from `tailscale.com/download`.
   - Log in with the org account.
   - In the Tailscale admin console, **approve** the device and note its Tailscale IP (e.g., `100.x.y.z`).
3. On each **remote staff PC**:
   - Install the Tailscale client.
   - Invite staff via email or SSO to join your Tailscale network.
   - Once connected, they should be able to ping the workstation’s Tailscale IP.

> **HIPAA note:** Tailscale is an encrypted transport. It does not see your application data, but you should still review their security/BAA posture before relying on it long‑term. For many small organizations this is used as a “reasonable and appropriate” control, but confirm with counsel/compliance advisors.

#### 4.1.2 Enable Remote Desktop on the Workstation

1. On the workstation, open **Settings → System → Remote Desktop**.
2. Turn on **Remote Desktop**.
3. Allow **only specific users** (ideally the staff Windows accounts you created).
4. In Windows Firewall:
   - Ensure RDP is allowed only on **Private** networks.
   - Optionally restrict the scope to the Tailscale adapter (advanced firewall rules).

#### 4.1.3 Staff Connection Workflow

1. On the staff PC:
   - Connect to Tailscale.
   - Open **Remote Desktop Connection** (`mstsc.exe` on Windows, or Microsoft Remote Desktop on macOS).
2. Enter the **workstation’s Tailscale IP** (e.g., `100.x.y.z`).
3. Log in using the staff’s **Windows account** (not the admin account).
4. Launch the Firewood Bank app and work as usual.

All PHI stays on the remote workstation; staff only see a remote screen.

### 4.2 Option B – Self‑Hosted Remote Desktop Gateway (more complex)

