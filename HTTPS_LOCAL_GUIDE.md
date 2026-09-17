# Guide HTTPS Local pour Mobile (Microphone & Notifications)

## Pourquoi le HTTPS est-il nécessaire sur mobile ?
Les navigateurs mobiles modernes (iOS Safari, Android Google Chrome, Samsung Internet) imposent des restrictions de sécurité strictes pour les API sensibles :
1. **L'enregistrement du microphone (`navigator.mediaDevices.getUserMedia`)** pour les messages vocaux.
2. **Les Notifications Web (`Notification.requestPermission`)** pour les alertes de nouveaux messages.

Ces API sont **bloquées** par les navigateurs dès lors que l'application est consultée sur une adresse IP locale non sécurisée (ex: `http://192.168.1.X:3000`). Elles ne fonctionnent en HTTP que sur `http://localhost`.

---

## Méthode 1 : Démarrage rapide avec Next.js (`--experimental-https`)
Next.js intègre un générateur de certificats SSL locaux auto-signés.

Lancez la commande suivante sur la machine hôte :
```bash
npm run dev:https
```
Next.js va générer des certificats SSL temporaires et démarrer l'application sur :
`https://0.0.0.0:3000` (accessible via `https://<votre-ip-locale>:3000`).

### Sur votre smartphone :
1. Scannez le QR Code ou ouvrez `https://<votre-ip-locale>:3000`.
2. Le navigateur affichera un avertissement de sécurité standard (*« Connexion non privée »* ou *« Certificat auto-signé »*).
3. Cliquez sur **« Paramètres avancés »** puis **« Continuer vers le site (non sécurisé) »**.
4. Le microphone et les notifications sont désormais débloqués et pleinement opérationnels !

---

## Méthode 2 : Certificats locaux de confiance avec `mkcert` (Recommandé en production LAN)
Pour éviter tout message d'avertissement sur mobile :
1. Installez **mkcert** sur votre machine :
   - macOS : `brew install mkcert`
   - Linux : `sudo apt install libnss3-tools && brew install mkcert`
   - Windows : `choco install mkcert`
2. Installez l'autorité racine locale :
   ```bash
   mkcert -install
   ```
3. Générez les certificats pour votre IP locale et localhost :
   ```bash
   mkcert localhost 127.0.0.1 0.0.0.0 192.168.1.50
   ```
4. Transférez le certificat racine de mkcert sur votre téléphone (AirDrop, email ou partage local) et installez-le dans les profils de confiance du téléphone.
