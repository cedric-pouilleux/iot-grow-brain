# Guide de déploiement en production

## 🚀 Lancer l'environnement de production

### Prérequis

1. **Arrêter l'environnement de développement** (si actif) :
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

2. **Vérifier que le port 1883 est libre** (si Mosquitto est déjà en cours d'exécution ailleurs)

### Configuration

#### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Base de données
POSTGRES_USER=postgres
POSTGRES_PASSWORD=votre_mot_de_passe
POSTGRES_DB=iot_data
DB_HOST=timescaledb

# MQTT
MQTT_BROKER_URL=mqtt://mosquitto:1883

# API
API_PORT=3001

# Frontend
SOCKET_URL=/
API_URL=http://localhost
```

#### 2. Configuration Mosquitto

La configuration de production (`mosquitto/config/mosquitto.conf`) est déjà configurée :
- ✅ Pas de bridge vers le Raspberry Pi
- ✅ Écoute sur le port 1883
- ✅ Autorise les connexions anonymes

#### 3. Configuration ESP32

Pour la production, compilez et uploadez avec l'environnement `esp32-prod` :

```bash
cd air-quality-esp32
pio run -e esp32-prod -t upload
```

Cela configure l'ESP32 pour :
- Prefix MQTT : `home`
- Serveur MQTT : `growbrain.local` (ou l'IP de votre serveur de production)

### Démarrage

```bash
# Lancer tous les services
docker-compose up -d

# Vérifier que tout est démarré
docker-compose ps

# Voir les logs
docker-compose logs -f
```

### Vérification

1. **Vérifier que Mosquitto est accessible** :
   ```bash
   docker-compose exec mosquitto mosquitto_sub -h localhost -t '#' -v
   ```

2. **Vérifier que le backend se connecte** :
   ```bash
   docker-compose logs backend | grep "Connecté au broker MQTT"
   ```

3. **Vérifier que les messages arrivent** :
   - Connectez-vous à l'interface web
   - Les modules avec le prefix `home/` devraient apparaître
   - Les données devraient s'afficher en temps réel

## 🔄 Basculer entre Dev et Prod

### Arrêter le Dev et lancer la Prod

```bash
# Arrêter le dev
docker-compose -f docker-compose.dev.yml down

# Lancer la prod
docker-compose up -d
```

### Arrêter la Prod et lancer le Dev

```bash
# Arrêter la prod
docker-compose down

# Lancer le dev
docker-compose -f docker-compose.dev.yml up -d
```

## ⚠️ Points d'attention

1. **Ne pas lancer les deux environnements en même temps** :
   - Ils utilisent tous les deux le port 1883 pour Mosquitto
   - Les volumes de base de données sont séparés (`db_data` vs `dev_db_data`)

2. **Configuration ESP32** :
   - En dev : prefix `dev`, serveur `192.168.1.162`
   - En prod : prefix `home`, serveur `growbrain.local`

3. **Topics MQTT** :
   - Dev : `dev/croissance/...`
   - Prod : `home/croissance/...`

4. **Backend** :
   - En dev : se connecte à `localhost:1883` (Mosquitto local)
   - En prod : se connecte à `mosquitto:1883` (via Docker network)

## 🐛 Dépannage

### Le backend ne se connecte pas à Mosquitto

Vérifiez la variable d'environnement :
```bash
docker-compose exec backend env | grep MQTT_BROKER
```

Elle doit être `mqtt://mosquitto:1883` en production.

### Les messages ne sont pas reçus

1. Vérifiez que l'ESP32 est bien en mode production (`esp32-prod`)
2. Vérifiez que l'ESP32 se connecte au bon serveur MQTT
3. Vérifiez les logs Mosquitto : `docker-compose logs mosquitto`

### Conflit de port 1883

Si le port 1883 est déjà utilisé :
1. Arrêtez l'autre service qui utilise le port
2. Ou modifiez le port dans `docker-compose.yml` et `mosquitto.conf`

