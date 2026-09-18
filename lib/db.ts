import fs from 'fs';
import path from 'path';
// Use node:sqlite DatabaseSync built into Node.js 22
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'messagerie.db');

// Singleton database instance across module reloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDatabase(): any {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDatabaseSchema(dbInstance);
  }
  return dbInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initDatabaseSchema(db: any) {
  // Execute schema definitions
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      is_group INTEGER NOT NULL DEFAULT 0,
      name TEXT,
      user_one_id INTEGER NOT NULL,
      user_two_id INTEGER NOT NULL,
      participants TEXT NOT NULL, -- JSON array of user IDs
      admin_ids TEXT,             -- JSON array of admin user IDs
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      body TEXT,
      file_path TEXT,
      file_type TEXT,
      file_name TEXT,
      reply_to_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'delivered',
      is_edited INTEGER NOT NULL DEFAULT 0,
      is_deleted_for_all INTEGER NOT NULL DEFAULT 0,
      deleted_for_users TEXT,     -- JSON array of user IDs
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id),
      FOREIGN KEY (sender_id) REFERENCES users (id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
  `);

  // Seed default users if table is empty
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCountRow && userCountRow.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
    insertUser.run(1, 'John Doe', 'test@example.com');
    insertUser.run(2, 'Alice Smith', 'alice@example.com');
    insertUser.run(3, 'Bob Johnson', 'bob@example.com');
    insertUser.run(4, 'Charlie Brown', 'charlie@example.com');
    insertUser.run(5, 'David Miller', 'david@example.com');
    insertUser.run(6, 'Emma Watson', 'emma@example.com');
  }

  // Seed default conversations if empty
  const convCountRow = db.prepare('SELECT COUNT(*) as count FROM conversations').get();
  if (convCountRow && convCountRow.count === 0) {
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, is_group, name, user_one_id, user_two_id, participants, admin_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    insertConv.run(
      1,
      0,
      null,
      1,
      2,
      JSON.stringify([1, 2]),
      null,
      new Date(now - 3600000 * 24 * 3).toISOString(),
      new Date(now - 120000).toISOString()
    );

    insertConv.run(
      2,
      1,
      'Équipe Projet Messagerie',
      1,
      1,
      JSON.stringify([1, 2, 3, 6]),
      JSON.stringify([1]),
      new Date(now - 86400000 * 2).toISOString(),
      new Date(now - 1800000).toISOString()
    );

    insertConv.run(
      3,
      0,
      null,
      1,
      3,
      JSON.stringify([1, 3]),
      null,
      new Date(now - 7200000).toISOString(),
      new Date(now - 7200000).toISOString()
    );

    // Seed historical messages for conversation 1
    const insertMsg = db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, body, file_path, file_type, file_name, reply_to_id, is_read, status, is_edited, is_deleted_for_all, deleted_for_users, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const dialoguePrompts = [
      { s: 2, t: 'Bonjour John ! As-tu réussi à configurer le routeur local pour le bureau ?' },
      { s: 1, t: 'Salut Alice ! Oui, l’adresse IP locale est bien attribuée et stable.' },
      { s: 2, t: 'Superbe. Le temps de réponse sur le Wi-Fi est quasi instantané.' },
      { s: 1, t: 'Exactement, moins de 5ms entre les deux postes.' },
      { s: 2, t: 'Est-ce qu’on a testé l’envoi de gros fichiers sans compression ?' },
      { s: 1, t: 'On a constaté que les photos brutes de 12 Mo ralentissaient l’affichage.' },
      { s: 2, t: 'Oui, c’est pour ça qu’une conversion WebP automatique côté client est indispensable.' },
      { s: 1, t: 'Tout à fait, le canvas HTML5 redimensionne jusqu’à 1920px max sans perte visible.' },
      { s: 2, t: 'Et pour l’audio ? Le microphone fonctionne bien sur les mobiles ?' },
      { s: 1, t: 'Oui, tant qu’on active le HTTPS local avec mkcert pour déverrouiller l’autorisation.' },
      { s: 2, t: 'C’est noté. J’ai testé l’indicateur de présence en ligne, il est très réactif.' },
      { s: 1, t: 'Le polling toutes les 2.5s combiné au BroadcastChannel assure une bonne synchronisation.' },
      { s: 2, t: 'As-tu ajouté la possibilité d’éditer un message après l’envoi ?' },
      { s: 1, t: 'Oui ! Clique sur les trois petits points sur ta bulle pour corriger une faute.' },
      { s: 2, t: 'Génial, et la mention "(modifié)" apparaît bien comme sur WhatsApp.' },
      { s: 1, t: 'Exactement, avec l’horodatage de modification préservé.' },
      { s: 2, t: 'Et si on supprime un message ?' },
      { s: 1, t: 'On a deux options : supprimer pour soi, ou supprimer pour tout le monde avec bulle grisée.' },
      { s: 2, t: 'Très bien pensé. Qu’en est-il de la gestion hors-ligne ?' },
      { s: 1, t: 'Si le Wi-Fi coupe, les messages sont mis en attente avec l’icône horloge puis partent dès le retour du signal.' },
      { s: 2, t: 'La recherche globale fonctionne aussi sur les anciens messages archivés ?' },
      { s: 1, t: 'Oui, avec surbrillance et saut direct dans la discussion au clic.' },
      { s: 2, t: 'Impressionnant pour une messagerie réseau local autonome.' },
      { s: 1, t: 'Merci ! Tout reste privé au sein de notre infrastructure sans passer par un cloud externe.' },
      { s: 2, t: 'Je vais partager le QR Code de connexion aux autres collègues ce matin.' },
      { s: 1, t: 'Parfait, ils pourront rejoindre directement depuis Safari ou Chrome mobile.' },
      { s: 2, t: 'Je prépare les documents récapitulatifs pour la réunion technique.' },
      { s: 1, t: 'Ça marche, envoie-les ici dès que tu as fini.' },
      { s: 2, t: 'C’est en cours de finalisation.' },
      { s: 1, t: 'Prends ton temps, la réunion est prévue à 14h30.' },
      { s: 2, t: 'Entendu ! À tout à l’heure alors.' },
      { s: 1, t: 'À tout à l’heure Alice ! Bonne fin de matinée.' },
    ];

    let mId = 1;
    const baseTime = now - 3600000 * 10;
    for (let i = 0; i < dialoguePrompts.length; i++) {
      const item = dialoguePrompts[i];
      const time = new Date(baseTime + i * 180000).toISOString();
      insertMsg.run(
        mId++,
        1,
        item.s,
        item.t,
        null,
        null,
        null,
        null,
        1,
        'read',
        0,
        0,
        JSON.stringify([]),
        time
      );
    }

    // Seed a message in group 2
    insertMsg.run(
      mId++,
      2,
      1,
      'Bienvenue dans le salon de discussion du projet Messagerie Locale !',
      null,
      null,
      null,
      null,
      0,
      'delivered',
      0,
      0,
      JSON.stringify([]),
      new Date(now - 1800000).toISOString()
    );
  }
}
