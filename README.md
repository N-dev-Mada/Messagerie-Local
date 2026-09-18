# 💬 Messagerie-Local (WhatsApp Web Clone LAN)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/Licence-MIT-green.svg?style=for-the-badge" alt="Licence MIT" />
</p>

> 🚀 Développé par **N-dev-Mada** — Ce projet est le premier produit officiel de la suite **N-product**.

---

## 📖 Description & Vision du Projet

**Messagerie-Local** est une application web de messagerie instantanée locale (LAN) ultra-fluide, 100% autonome et sans aucune dépendance cloud externe, reproduisant fidèlement l'esthétique et l'expérience ergonomique de **WhatsApp Web**.

Conçue pour répondre aux impératifs de souveraineté numérique, de résilience et de confidentialité au sein des réseaux locaux (entreprises, ateliers, campus, centres médicaux, réseaux domestiques ou zones blanches), elle permet des communications instantanées et le partage multimédia sécurisé directement entre les appareils connectés à une même box ou un même routeur Wi-Fi.

---

## ✨ Fonctionnalités Clés (Key Features)

### ⚡ 1. Temps Réel via Server-Sent Events (SSE)
- **Flux continu unidirectionnel léger** : Canal persistant `/api/chat/stream` basé sur les Server-Sent Events (SSE) natifs, sans surcharge de protocole WebSocket lourd.
- **Broker d'événements typé en mémoire** : Diffusion instantanée des nouveaux messages, modifications, suppressions, réactions, statuts de lecture et indicateurs de frappe (*"en train d'écrire..."*).
- **Consommation CPU et réseau minimale** : Idéal pour les petits serveurs locaux et ordinateurs hôtes partagés.

### 🗄️ 2. Persistance SQL Robuste & Haute Concurrence
- **Moteur natif `node:sqlite`** : Zéro dépendance externe native à compiler (`node-gyp`), garantissant une compatibilité immédiate avec Node.js 22+.
- **Mode WAL (Write-Ahead Logging)** : Concurrence élevée permettant des lectures simultanées non bloquantes pendant les écritures.
- **Requêtes préparées & Indexation optimisée** : Protection intégrale contre les injections SQL et temps de réponse inférieurs à la milliseconde sur les requêtes paginées.

### 🖼️ 3. Découplage Médias & Architecture Anti-OOM (Out-of-Memory)
- **Compression intelligente WebP côté client** : Traitement automatique par Canvas HTML5 avant téléversement, réduisant de **70% à 90%** le poids des photos avec badge d'économie affiché en temps réel.
- **Stockage binaire sur disque** : Les fichiers téléversés sont streamés directement vers le répertoire persistant `public/uploads` avec assainissement strict des noms de fichiers.
- **Base de données légère** : Seuls les métadonnées et chemins relatifs sont stockés en base, préservant la mémoire du processus Node.js contre les saturations OOM.

### 🎙️ 4. Messages Vocaux & Lecteur Audio Dédié
- **Enregistrement haute fidélité** : Capture audio via l'API HTML5 `MediaRecorder` avec chronomètre et retour visuel.
- **Lecteur sur-mesure façon WhatsApp** : Forme d'onde dynamique, barre de progression interactive et sélecteur de vitesse de lecture variable (**1x**, **1.5x**, **2x**).

### 🔒 5. Sécurité des Sessions & Validation Stricte
- **Cookies signés `HttpOnly`** : Tokens de session HMAC-SHA256 non manipulables par JavaScript (`SameSite=Lax`), immunisant l'application contre les attaques XSS et le vol de session.
- **Contrôle d'usurpation d'identité** : Chaque action sur l'API (`sendMessage`, `createGroup`, `updateUser`, streaming) valide rigoureusement la concordance entre l'identifiant émetteur et la session active.
- **Validation déclarative avec Zod v3** : Contrôle systématique des schémas d'entrées pour chaque route API.

### 📱 6. PWA & Support Hors-Ligne (Offline First)
- **Installable (Desktop & Mobile)** : Prise en charge native PWA avec Web App Manifest (`standalone`) et bouton d'installation intégré dans l'interface (Chrome, Edge, Android et guide iOS Safari).
- **Service Worker dédié (`/sw.js`)** : Mise en cache préventive des assets statiques (*stale-while-revalidate*) et page de repli élégante `/offline.html`.
- **File d'attente hors-ligne résiliente** : Les messages envoyés en cas de coupure réseau sont mis en attente locale (marqués d'une icône 🕒) et dépilés automatiquement au rétablissement de la connexion.

### 🌐 7. Déploiement Réseau Local (LAN) & Accès Rapide
- **Écoute multi-interfaces `0.0.0.0`** : Accessible instantanément par tous les ordinateurs, tablettes et smartphones du réseau local.
- **Connexion Smartphone via QR Code** : Détection automatique de l'adresse IP locale et génération d'un QR code scannable avec l'appareil photo du smartphone pour un accès sans saisie.
- **Bascule rapide de profil** : Permet de tester et simuler plusieurs utilisateurs simultanément depuis un même navigateur.

---

## 🛠️ Pile Technique (Tech Stack)

| Domaine | Technologie | Rôle dans l'application |
| :--- | :--- | :--- |
| **Framework Web** | [Next.js 15+](https://nextjs.org/) | App Router, Server Components & Route Handlers haute performance |
| **Langage** | [TypeScript 5](https://www.typescriptlang.org/) | Typage strict de bout en bout (Client, API, Schémas) |
| **Styles & Design** | [Tailwind CSS v4](https://tailwindcss.com/) | Design system WhatsApp fidèle, responsive mobile-first et animations fluides |
| **Icônes** | [Lucide React](https://lucide.dev/) | Bibliothèque d'icônes vectorielles cohérente |
| **Base de Données** | SQLite (`node:sqlite`) | Persistance locale ultra-rapide en mode WAL avec requêtes préparées |
| **Temps Réel** | Server-Sent Events (SSE) | Diffusion instantanée via `/api/chat/stream` et broker mémoire typé |
| **Validation** | [Zod v3](https://zod.dev/) | Validation stricte des payloads API et intégrité des types |
| **PWA & Offline** | Service Worker & Manifest | Application autonome installable et cache statique |
| **Sécurité** | Cookies `HttpOnly` + HMAC-SHA256 | Sessions sécurisées et protection anti-usurpation d'identité |
| **Multimédia** | Web Audio API & Canvas 2D | Enregistrement vocal avec onde sonore et compression d'image WebP |
| **Réseau Local** | `qrcode` | Génération de QR Code vectoriel sans dépendance externe |

---

## 🚀 Guide de Démarrage Rapide (Quick Start)

### Prérequis
- **[Node.js](https://nodejs.org/)** version **22+** recommandée (support natif de `node:sqlite`).
- Gestionnaire de paquets **npm**, **yarn** ou **pnpm**.

### 1. Cloner le dépôt et installer les dépendances
```bash
git clone https://github.com/votre-compte/messagerie-local.git
cd messagerie-local
npm install
```

### 2. Lancer le serveur en mode développement (LAN)
```bash
npm run dev
```

Le serveur démarre et écoute sur toutes les interfaces réseau (`0.0.0.0:3000`) :
- **Depuis l'ordinateur hôte** : ouvrez `http://localhost:3000`
- **Depuis un smartphone ou un autre PC du réseau** : ouvrez `http://<IP_DE_L_HOTE>:3000`

### 3. Compiler et lancer en production
```bash
npm run build
npm start
```

---

## 📱 Guide de Déploiement Réseau Local (LAN)

### 1. Identifier l'adresse IP de l'hôte
- **Windows** : Ouvrez un terminal `PowerShell` ou `cmd` et tapez `ipconfig` (repérez l'adresse IPv4, ex: `192.168.1.45`).
- **macOS** : Ouvrez le Terminal et tapez `ipconfig getifaddr en0` (Wi-Fi).
- **Linux** : Ouvrez le Terminal et tapez `ip a` ou `hostname -I`.

### 2. Autoriser le port 3000 dans le Pare-feu (Firewall)
Pour permettre aux smartphones et ordinateurs du réseau d'accéder au serveur :
- **Windows Defender Firewall** (PowerShell en mode Administrateur) :
  ```powershell
  New-NetFirewallRule -DisplayName "Messagerie Local (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```
- **macOS** : Vérifiez dans *Réglages Système > Réseau > Pare-feu* que Node.js autorise les connexions entrantes.
- **Linux (ufw)** :
  ```bash
  sudo ufw allow 3000/tcp
  sudo ufw reload
  ```

### 3. Connexion Smartphone via QR Code
1. Dans la barre de navigation de l'application, cliquez sur le bouton **« Connexion Smartphone »** (ou l'icône 📱).
2. Un modal s'ouvre avec le **QR Code** contenant directement l'URL `http://<VOTRE-IP-LOCALE>:3000`.
3. Scannez le code avec l'appareil photo de votre smartphone (iOS ou Android) pour ouvrir l'application sans aucune saisie d'adresse IP.

---

## 🏗️ Architecture & Structure du Projet

L'arborescence du projet est organisée de manière modulaire selon les conventions Next.js App Router :

```text
├── app/
│   ├── api/
│   │   ├── auth/session/route.ts     # Gestion et émission des cookies de session HttpOnly signés
│   │   ├── chat/route.ts             # Route principale REST (messages, groupes, profils, pagination)
│   │   ├── chat/stream/route.ts      # Endpoint Server-Sent Events (SSE) temps réel
│   │   └── network-info/route.ts     # Détection dynamique des adresses IP locales de la machine hôte
│   ├── layout.tsx                    # Layout racine, balises meta, viewport et enregistrement PWA
│   ├── manifest.ts                   # Définition dynamique du Web App Manifest
│   └── page.tsx                      # Page principale, gestion des utilisateurs et ErrorBoundary
├── components/
│   ├── chat/
│   │   ├── ChatDrawer.tsx            # Tiroir d'informations (membres du groupe, médias, documents)
│   │   ├── ChatInputBar.tsx          # Barre de saisie, émojis, upload compressé et micro vocal
│   │   ├── ConversationSidebar.tsx   # Liste des conversations, recherche globale et indicateurs
│   │   ├── MessageItem.tsx           # Bulle de message, lecteur audio, citation, menu contextuel
│   │   └── MessageList.tsx           # Flux des messages, pagination infinie et défilement fluide
│   ├── ConnectionStatusBadge.tsx     # Pastille d'état réseau en direct (Connecté, Reconnexion, Hors-ligne)
│   ├── ErrorBoundary.tsx             # Enveloppe React de résilience pour éviter tout écran blanc
│   ├── MobileConnectModal.tsx        # Modal d'affichage du QR Code de connexion LAN
│   ├── Navbar.tsx                    # En-tête de l'application, sélecteur rapide de profils et PWA
│   ├── PWAInstallButton.tsx          # Déclencheur d'installation native PWA (Desktop, Android & iOS)
│   └── ServiceWorkerRegister.tsx     # Enregistrement différé du Service Worker client
├── hooks/
│   ├── useChatSync.ts                # Cœur de synchronisation temps réel SSE, file d'attente hors-ligne
│   └── usePWAInstall.ts              # Détection de l'événement beforeinstallprompt et statut standalone
├── lib/
│   ├── auth.ts                       # Cryptographie HMAC-SHA256 et gestion des cookies de session
│   ├── db.ts                         # Initialisation SQLite native (WAL mode) et requêtes préparées
│   ├── mediaStorage.ts               # Découplage des médias sur disque (public/uploads) anti-OOM
│   ├── imageUtils.ts                 # Compression WebP client via Canvas HTML5
│   ├── sseEvents.ts                  # Broker d'événements mémoire pour diffusion SSE
│   ├── types.ts                      # Interfaces et définitions TypeScript communes
│   └── validation.ts                 # Schémas de validation déclaratifs Zod v3
└── public/
    ├── icons/                        # Icônes PWA (192px, 512px, maskable, SVG)
    ├── offline.html                  # Page de repli autonome servie par le Service Worker
    ├── sw.js                         # Service Worker (gestion du cache statique et requêtes de navigation)
    └── uploads/                      # Répertoire de stockage binaire des fichiers et messages vocaux
```

---

## 🔒 Configuration HTTPS Local (Optionnel pour Micro Smartphone)

> 💡 **Pourquoi le HTTPS est-il requis pour le micro sur mobile ?**  
> Les navigateurs mobiles (Chrome Android, Safari iOS) restreignent par mesure de sécurité l'accès à l'API `MediaRecorder` (micro) aux contextes sécurisés (HTTPS ou `localhost`). Pour envoyer des messages vocaux depuis un smartphone sur le réseau local, vous pouvez générer un certificat local en 2 minutes avec **mkcert** :

```bash
# 1. Installer mkcert (ex: macOS brew / Windows choco / Linux apt)
mkcert -install

# 2. Générer le certificat pour votre IP locale (ex: 192.168.1.45)
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 192.168.1.45

# 3. Lancer Next.js avec HTTPS activé
next dev --experimental-https --experimental-https-key ./localhost-key.pem --experimental-https-cert ./localhost.pem -H 0.0.0.0 -p 3000
```

---

## 👨‍💻 Auteur & Écosystème

Ce projet est conçu et maintenu par :

- **Auteur :** **N-dev-Mada**
- **Écosystème :** Ce projet est le **premier produit officiel de la suite N-product**, une gamme d'applications modernes, autonomes et axées sur la productivité, la confidentialité et l'excellence technique.

---

## 📄 Licence

Ce projet est distribué sous licence **MIT**. Vous êtes libre de l'utiliser, l'étudier, le modifier et le déployer au sein de votre infrastructure personnelle ou professionnelle.
