# 💬 Messagerie-Local

Application web de messagerie instantanée locale et temps réel, hautement optimisée, inspirée de l'interface authentique de **WhatsApp Web**. Conçue pour fonctionner de manière autonome sur réseau local (LAN) ou serveur privé sans dépendance à des services cloud tiers.

---

## 🚀 Fonctionnalités Clés

### 🎨 Expérience & Interface WhatsApp Authentique
- **Fidélité visuelle** : Palette emblématique WhatsApp (`#008069`, `#00a884`, fond texturé `#efeae2`, bulles expéditeur `#d9fdd3`).
- **Discussions 1 à 1 & Groupes** : Messagerie directe instantanée et salons de groupe avec sélection multiple de participants.
- **Tiroir d'informations de conversation** : Consultation des membres du groupe, date de création, galerie des médias et documents partagés avec téléchargement.
- **Visualiseur Média plein écran (Lightbox)** : Zoom, prévisualisation HD et téléchargement des images reçues.
- **Sélecteur d'émojis intégré** : Liste catégorisée d'émojis sans dépendance externe lourde.

### ⚡ Performance & Multimédia Avancé
- **Compression d'images WebP côté client (HTML5 Canvas)** :
  - Détection automatique et redimensionnement intelligent des photos volumineuses avant téléversement.
  - Réduction de **70% à 90%** du poids des images avec badge d'économie affiché en direct.
- **Messages Vocaux (Web Audio API & MediaRecorder)** :
  - Enregistrement direct depuis le microphone avec chronomètre et jauge dynamique.
  - Lecteur audio sur-mesure intégré aux bulles de discussion (forme d'onde stylisée, contrôle de lecture, vitesse variable 1x / 1.5x / 2x).
- **Pagination fluide (Infinite Scroll)** :
  - Chargement dynamique par lots de 30 messages avec bouton « Charger les messages précédents » et conservation précise de la position de défilement.
- **Réponses & Citations contextuelles** :
  - Clic sur le bouton répondre pour citer un message antérieur avec survol interactif et aperçu miniature.
- **Modification & Suppression réversible / définitive** :
  - Menu contextuel pour éditer un message envoyé ou le supprimer avec avertissement modal.

### 🌐 Fiabilité Réseau, Mode Hors-Ligne & LAN
- **File d'attente hors-ligne (Offline Queue & LocalStorage)** :
  - Bannière dynamique de perte de connexion réseau (`navigator.onLine` et détection d'échec d'API).
  - Les messages envoyés hors-ligne s'affichent avec une **icône horloge (🕒)** et sont stockés localement.
  - Dès rétablissement du réseau, la file d'attente est automatiquement dépilée dans l'ordre chronologique.
- **Recherche globale multi-niveaux & Saut contextuel** :
  - Recherche simultanée parmi les contacts, les conversations et l'ensemble du corpus des messages.
  - Clic sur un message trouvé pour ouvrir la conversation correspondante, défiler directement jusqu'à la bulle ciblée et la mettre en valeur avec une animation lumineuse.
- **Connexion Smartphone LAN instantanée** :
  - Détection automatique de l'adresse IP locale de la machine hôte (`192.168.x.x:3000`).
  - Générateur de **QR Code** scannable avec l'appareil photo d'un smartphone sur le même réseau Wi-Fi.
- **Sélecteur rapide d'utilisateurs** :
  - Bascule instantanée entre profils de test (Alice, Bob, Charlie, etc.) pour valider les échanges multi-utilisateurs sur une même machine ou entre différents appareils.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework Web** | [Next.js 15+](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **Langage** | [TypeScript](https://www.typescriptlang.org/) (Typage strict de bout en bout) |
| **Styles & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) & [tw-animate-css](https://github.com) |
| **Icônes** | [Lucide React](https://lucide.dev/) |
| **Audio & Médias** | HTML5 MediaRecorder API, Web Audio API, Canvas 2D (WebP Compression) |
| **Synchronisation & État** | BroadcastChannel API, Polling optimisé, LocalStorage Persistence |
| **QR Code** | `qrcode` (Rendu SVG/Canvas sans service distant) |

---

## 📦 Installation & Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) v18.17 ou version ultérieure
- Gestionnaire de paquets `npm`, `yarn` ou `pnpm`

### 1. Cloner le projet et installer les dépendances
```bash
git clone https://github.com/votre-compte/messagerie-local.git
cd messagerie-local
npm install
```

### 2. Démarrer le serveur de développement
```bash
npm run dev
```

L'application s'ouvre sur **http://localhost:3000** (ou sur l'adresse `0.0.0.0:3000` accessible depuis le réseau local).

### 3. Compiler pour la production
```bash
npm run build
npm start
```

---

## 📱 Guide de Connexion Réseau Local (LAN)

Pour utiliser l'application depuis votre smartphone ou un autre ordinateur connecté à la même box / point d'accès Wi-Fi :

1. **Identifier l'adresse IP de votre machine hôte** :
   - Sur **Windows** : Ouvrez un terminal `cmd` ou `PowerShell` et tapez `ipconfig` (recherchez l'adresse IPv4, ex: `192.168.1.45`).
   - Sur **macOS / Linux** : Ouvrez un terminal et tapez `ip a` ou `ifconfig` (ou `ipconfig getifaddr en0`).
2. **Ouvrir le port ou utiliser le QR Code** :
   - Cliquez sur le bouton **« Connexion Smartphone »** ou l'icône 📱 en haut de la messagerie.
   - Le QR Code généré contient directement le lien `http://<VOTRE-IP-LOCALE>:3000`.
   - Scannez le QR Code avec l'appareil photo de votre smartphone (iOS ou Android) : l'application s'ouvre instantanément.

---

## 🔒 Guide Configuration HTTPS Local (Microphone & Notifications)

> 💡 **Pourquoi le HTTPS est-il requis sur mobile ?**  
> Les navigateurs modernes (Chrome Android, Safari iOS) bloquent par sécurité l'accès au microphone (`MediaRecorder`) et aux notifications système sur les adresses IP non sécurisées (`http://192.168.x.x`). Seul `http://localhost` est exempté.  
> Pour profiter des **messages vocaux** depuis un smartphone sur le réseau local, il suffit d'activer un certificat local de confiance avec **mkcert**.

### Étape 1 : Installer mkcert
- **macOS** (via Homebrew) :
  ```bash
  brew install mkcert
  brew install nss # pour Firefox si nécessaire
  mkcert -install
  ```
- **Windows** (via Chocolatey ou Scoop) :
  ```bash
  choco install mkcert
  mkcert -install
  ```
- **Linux** (Debian/Ubuntu) :
  ```bash
  sudo apt install libnss3-tools
  curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
  chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
  mkcert -install
  ```

### Étape 2 : Générer les certificats pour votre IP locale
Remplacez `192.168.1.45` par votre adresse IP locale :
```bash
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 192.168.1.45
```

### Étape 3 : Lancer Next.js avec le support HTTPS
Ajoutez ou adaptez la commande de démarrage dans votre `package.json` :
```json
"scripts": {
  "dev:https": "next dev --experimental-https --experimental-https-key ./localhost-key.pem --experimental-https-cert ./localhost.pem -H 0.0.0.0 -p 3000"
}
```
Puis lancez :
```bash
npm run dev:https
```

### Étape 4 : Installer le certificat racine sur votre smartphone
- Envoyez-vous le fichier d'autorité racine généré par `mkcert -CAROOT` (`rootCA.pem`) sur votre smartphone (par AirDrop, e-mail ou téléchargement local).
- Installez le profil de certificat dans les paramètres de sécurité de votre smartphone (sur iOS : *Réglages > Général > Profils*, puis activez la confiance dans *Réglages > Général > Informations > Réglages des certificats*).
- Vous disposez à présent d'une connexion `https://192.168.x.x:3000` reconnue comme sûre, avec enregistrement vocal et notifications 100% fonctionnels !

---

## 👥 Auteur & Licence

Projet développé avec passion pour la communication sans contrainte, rapide, privée et sécurisée.
Ceci est le prémier produit concret de la suite N-product à venir par Nancy150907
Distribué sous licence **MIT**.
