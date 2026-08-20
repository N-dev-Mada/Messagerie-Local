# 💬 Messagerie (Messagerie-Local)

**Messagerie** est une application de chat web en temps réel, inspirée de l'interface de WhatsApp, développée avec **Laravel 11**, **Livewire 3** et **Laravel Reverb**. Elle est pensée pour être déployée sur un **réseau local (Wi‑Fi)** sans dépendre d'un hébergement en ligne : un lanceur Windows (`Lancer Messagerie.bat`) peut démarrer automatiquement le serveur web et le serveur WebSocket, permettant à plusieurs appareils du même réseau (PC, téléphones, tablettes) de discuter entre eux — d'où le nom du dépôt, **Messagerie-Local**.

> 📦 Ce README correspond à la version publiée sur GitHub du projet, qui suit les conventions standards d'un dépôt Git (dépendances, base de données et runtime PHP portable **non versionnés** — voir la section [Installation](#-installation)).

## Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Architecture du projet](#-architecture-du-projet)
- [Modèle de données](#-modèle-de-données)
- [Temps réel : Reverb, canaux et événements](#-temps-réel--reverb-canaux-et-événements)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Lancement en développement](#-lancement-en-développement)
- [Lancement rapide sur réseau local (Windows)](#-lancement-rapide-sur-réseau-local-windows)
- [Variables d'environnement clés](#-variables-denvironnement-clés)
- [Tests](#-tests)
- [Sécurité & limites connues](#-sécurité--limites-connues)
- [Pistes d'amélioration](#-pistes-damélioration)
- [Licence](#-licence)

## ✨ Fonctionnalités

- **Conversations privées (1 à 1)** : démarrage instantané d'une discussion depuis une recherche de contact par nom.
- **Conversations de groupe** : création de groupes nommés avec sélection multiple de participants (table pivot `conversation_user`).
- **Messagerie en temps réel** via WebSockets (Laravel Reverb) : les messages apparaissent instantanément chez le(s) destinataire(s), sans rechargement de page.
- **Indicateur de présence en ligne / hors ligne** grâce à un canal de présence Reverb (`online`).
- **Indicateur "en train d'écrire…"** implémenté avec les événements *whisper* d'Echo (signal client-à-client, non persisté en base).
- **Statut de lecture des messages** (`is_read`) avec badge de messages non lus par conversation.
- **Partage de fichiers et d'images** dans les messages (upload Livewire, stockage dans `storage/app/public/attachments`, aperçu image intégré ou lien de téléchargement).
- **Interface responsive** au style WhatsApp (liste des discussions en colonne + fenêtre de chat), adaptée mobile et desktop.
- **Authentification complète** (inscription, connexion, vérification d'email, réinitialisation de mot de passe, gestion du profil) fournie par **Laravel Breeze** en version Livewire/Volt.
- **Rafraîchissement périodique de la liste des conversations** (`wire:poll`) en complément du temps réel.

## 🛠 Stack technique

| Domaine | Technologie |
|---|---|
| Framework backend | [Laravel 11](https://laravel.com) (PHP ^8.2) |
| Composants réactifs | [Livewire 3.6](https://livewire.laravel.com) + [Volt 1.7](https://livewire.laravel.com/docs/volt) (pages d'authentification en syntaxe fonctionnelle) |
| Temps réel / WebSockets | [Laravel Reverb](https://laravel.com/docs/reverb) (serveur WebSocket auto-hébergé) |
| Client WebSocket | [Laravel Echo](https://github.com/laravel/echo) + [Pusher JS](https://github.com/pusher/pusher-js) (protocole Pusher, backend Reverb) |
| Interactivité front | [Alpine.js](https://alpinejs.dev) (intégré à Livewire) |
| Style | [Tailwind CSS 3](https://tailwindcss.com) + `@tailwindcss/forms` |
| Build front | [Vite 5](https://vitejs.dev) |
| Base de données | SQLite (par défaut) |
| Authentification | [Laravel Breeze](https://laravel.com/docs/starter-kits#laravel-breeze) |
| Tests | PHPUnit 10 |

## 🏗 Architecture du projet

```
Messagerie-Local/
├── Lancer Messagerie.bat      # Lanceur portable Windows (serveur web + Reverb)
├── app/
│   ├── Events/
│   │   └── MessageSent.php        # Événement broadcasté à l'envoi d'un message
│   ├── Livewire/
│   │   ├── ChatComponent.php      # Composant central : conversations, messages, groupes, recherche
│   │   ├── Actions/Logout.php
│   │   └── Forms/LoginForm.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Conversation.php       # Conversations 1-à-1 et groupes
│   │   └── Message.php
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   └── VoltServiceProvider.php
│   └── View/Components/           # Layouts (AppLayout, GuestLayout)
├── database/
│   ├── migrations/                # users, conversations, messages, groupes, statut de lecture
│   ├── factories/
│   └── seeders/
├── resources/
│   ├── views/
│   │   ├── livewire/
│   │   │   ├── chat-component.blade.php   # Interface principale de messagerie
│   │   │   └── pages/auth/                # Écrans d'authentification (Volt)
│   │   ├── dashboard.blade.php            # Point d'entrée : héberge <livewire:chat-component />
│   │   └── layouts/
│   └── js/
│       ├── app.js
│       ├── bootstrap.js
│       └── echo.js                        # Configuration du client Echo (broadcaster: reverb)
├── routes/
│   ├── web.php                    # Routes publiques (accueil, dashboard, profil)
│   ├── auth.php                   # Routes d'authentification (Volt)
│   └── channels.php                # Autorisations des canaux de diffusion
└── config/reverb.php              # Configuration du serveur WebSocket
```

> Les dossiers `vendor/` (dépendances Composer), `php/` (runtime PHP portable) et le fichier `.env` **ne sont pas présents dans le dépôt** : ils sont exclus via `.gitignore` et doivent être régénérés/fournis localement (voir ci-dessous).

## 🗄 Modèle de données

**`users`** — comptes utilisateurs (authentification standard Laravel).

**`conversations`**
- `user_one_id`, `user_two_id` : les deux participants d'une conversation privée (contrainte d'unicité sur la paire).
- `is_group` (bool) et `name` : activés lorsque la conversation est un groupe.
- Relations : `userOne()`, `userTwo()`, `messages()`, `participants()` (via la table pivot `conversation_user` pour les groupes).

**`messages`**
- `conversation_id`, `sender_id`, `body` (nullable), `file_path`, `file_type`, `is_read`, `read_at`.
- Un message peut contenir uniquement du texte, uniquement une pièce jointe, ou les deux.

**`conversation_user`** (table pivot) — liste des membres d'une conversation de groupe.

## ⚡ Temps réel : Reverb, canaux et événements

1. À l'envoi d'un message (`ChatComponent::sendMessage`), le message est enregistré puis l'événement `App\Events\MessageSent` est diffusé via `broadcast(...)->toOthers()`.
2. `MessageSent` implémente `ShouldBroadcastNow` et cible un **canal privé** `chat.{conversation_id}` (voir `routes/channels.php`), qui vérifie que l'utilisateur authentifié est bien participant (ou membre du groupe) de la conversation.
3. Côté client, `resources/views/livewire/chat-component.blade.php` utilise **Alpine.js + Echo** pour :
   - rejoindre le canal de **présence** `online` et signaler qui est connecté (`updateOnlineUsers`) ;
   - s'abonner au canal privé de la conversation active et rafraîchir messages/conversations à la réception de `MessageSent` ;
   - écouter/émettre l'événement *whisper* `typing` pour l'indicateur « en train d'écrire… ».
4. Le serveur Reverb (WebSocket) tourne indépendamment du serveur HTTP Laravel — les deux processus doivent être démarrés (voir sections suivantes).

## ✅ Prérequis

- PHP **≥ 8.2** avec les extensions usuelles de Laravel (pdo_sqlite, mbstring, etc.), installé globalement sur la machine
- [Composer](https://getcomposer.org)
- Node.js (≥ 18 recommandé) et npm
- Extension PHP SQLite activée (base par défaut)
- Git

## 📥 Installation

Contrairement à l'archive de distribution portable, ce dépôt Git ne contient **ni les dépendances (`vendor/`, `node_modules/`), ni le fichier `.env`, ni de base de données `.sqlite`, ni le runtime PHP portable (`php/`)**. Ces éléments doivent être générés après clonage :

```bash
# 1. Cloner le dépôt
git clone https://github.com/<votre-compte>/Messagerie-Local.git
cd Messagerie-Local

# 2. Installer les dépendances PHP
composer install

# 3. Installer les dépendances front
npm install

# 4. Copier le fichier d'environnement et générer la clé d'application
cp .env.example .env
php artisan key:generate

# 5. Créer la base SQLite et exécuter les migrations
touch database/database.sqlite
php artisan migrate

# 6. Créer le lien symbolique vers le stockage public (pièces jointes)
php artisan storage:link

# 7. Compiler les assets front
npm run build   # ou "npm run dev" en mode watch
```

## ▶️ Lancement en développement

**Deux serveurs** doivent tourner simultanément (dans deux terminaux distincts) :

```bash
# Terminal 1 : serveur WebSocket (obligatoire pour le temps réel)
php artisan reverb:start

# Terminal 2 : serveur applicatif Laravel
php artisan serve
```

Par défaut, activez `BROADCAST_CONNECTION=reverb` dans votre `.env` (voir [Variables d'environnement clés](#-variables-denvironnement-clés)), puis rendez-vous sur `http://127.0.0.1:8000`.

## 🖥 Lancement rapide sur réseau local (Windows)

Le dépôt inclut le script `Lancer Messagerie.bat`, qui détecte automatiquement l'IP Wi-Fi locale et démarre Reverb (`--port=8080`) puis le serveur Laravel (`--port=8000`) sur `0.0.0.0`, afin que d'autres appareils du même réseau puissent se connecter via `http://<IP_DU_SERVEUR>:8000/dashboard`.

⚠️ **Point d'attention propre à la version GitHub** : ce script appelle explicitement `php\php.exe` (chemin relatif au dossier `php/`), qui n'est **pas fourni dans le dépôt** (exclu par `.gitignore` car il s'agit de plusieurs centaines de Mo de binaires Windows). Deux options :

1. **Utiliser un PHP installé globalement** : ignorez le `.bat` et lancez `php artisan reverb:start --host=0.0.0.0 --port=8080` puis `php artisan serve --host=0.0.0.0 --port=8000` manuellement (voir section précédente), en remplaçant `php` par le chemin de votre exécutable si besoin.
2. **Reconstituer un PHP portable** : téléchargez une version *Non Thread Safe* (NTS) portable de PHP 8.2+ pour Windows depuis [windows.php.net/download](https://windows.php.net/download/), placez-la dans un dossier `php/` à la racine du projet (contenant `php.exe`), puis double-cliquez sur `Lancer Messagerie.bat`.

> Usage recommandé pour un réseau local de confiance (LAN domestique/bureau, démo) — voir les limites de sécurité ci-dessous avant toute exposition sur Internet.

## 🔧 Variables d'environnement clés

| Variable | Rôle |
|---|---|
| `APP_NAME` | Nom de l'application (`Messagerie`) |
| `APP_URL` | URL de base de l'application |
| `DB_CONNECTION=sqlite` | Base de données SQLite par défaut |
| `BROADCAST_CONNECTION=reverb` | Active Reverb comme driver de diffusion temps réel |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | Identifiants de l'application Reverb (WebSocket) — à générer vous-même, aucune valeur n'est fournie dans `.env.example` |
| `REVERB_SERVER_HOST` / `REVERB_HOST` / `REVERB_PORT` | Adresse/port d'écoute du serveur WebSocket |
| `VITE_REVERB_*` | Équivalents exposés au bundle front (Echo côté navigateur) |
| `FILESYSTEM_DISK` | Disque utilisé pour le stockage des fichiers (pièces jointes via `public`) |

## 🧪 Tests

Le projet inclut la suite de tests standard livrée par Laravel Breeze (authentification, profil) :

```bash
php artisan test
```

Aucun test automatisé ne couvre actuellement le module de messagerie (`ChatComponent`, événements de diffusion) — c'est une piste d'amélioration naturelle (voir ci-dessous).

## 🔒 Sécurité & limites connues

- `.env.example` livre `APP_DEBUG=true` et `APP_ENV=local` par défaut : à changer avant toute exposition publique.
- Les serveurs lancés via `php artisan serve --host=0.0.0.0` ou le `.bat` sont accessibles à toute la machine du réseau local — adapté à un LAN de confiance, pas à un déploiement public sans pare-feu/reverse proxy/HTTPS.
- `php artisan serve` est un serveur de développement, non recommandé en production (préférer Nginx/Apache + PHP-FPM, et un vrai processus superviseur pour `reverb:start`).
- Les pièces jointes sont servies directement depuis `storage/app/public` sans contrôle d'accès applicatif au-delà de l'authentification globale.
- Les identifiants Reverb (`REVERB_APP_KEY`/`SECRET`) doivent être générés par chaque déploiement — aucune valeur par défaut n'est versionnée dans ce dépôt.

## 🗺 Pistes d'amélioration

- Accusés de lecture par message (au-delà du compteur global de non-lus).
- Suppression/modification de messages, réactions.
- Gestion des rôles/admin dans les groupes (ajout/retrait de membres, avatar de groupe).
- Notifications (navigateur ou push) en dehors de l'onglet actif.
- Pagination/chargement progressif de l'historique des messages.
- Tests automatisés dédiés au chat et à la diffusion temps réel.
- Conteneurisation (Docker/Sail) pour un déploiement multiplateforme simplifié, en remplacement du script `.bat` + PHP portable.

## 📄 Licence

Le squelette applicatif est basé sur le framework [Laravel](https://laravel.com), distribué sous licence [MIT](https://opensource.org/licenses/MIT). Le code spécifique à l'application **Messagerie** (composants, modèles, vues de chat) ne comporte pas de licence explicite fournie dans ce dépôt ; à définir selon l'usage souhaité (par exemple en ajoutant un fichier `LICENSE`).
