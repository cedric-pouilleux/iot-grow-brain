# Notes - ESP32 Air Quality Sensor

## Capteurs I2C

### Initialisation avec réessais
Les capteurs SGP40 et BMP280 utilisent une logique de réessai à l'initialisation :
- **3 tentatives** maximum
- **100ms** d'attente entre chaque tentative
- Si le capteur répond dès la première tentative, aucun délai n'est perdu

---

## Reset des capteurs à distance

### Fonctionnement
Le frontend peut déclencher un reset de capteur via un bouton. Cela envoie une commande MQTT que l'ESP32 exécute.

### Topic MQTT
`{moduleId}/sensors/reset`

### Payload
```json
{ "sensor": "bmp" }
```

### Valeurs acceptées pour `sensor`
| Valeur | Capteur concerné |
|--------|------------------|
| `bmp` ou `pressure` | BMP280 |
| `sgp` ou `voc` | SGP40 |
| `dht`, `temp` ou `humidity` | DHT22 |
| `co2` | MH-Z14A |
| `all` | Tous les capteurs |

### Ce que fait le reset
- **BMP280 / SGP40** : Réinitialisation I2C (`begin()`)
- **DHT22** : Réinitialisation du protocole 1-Wire (`begin()`)
- **CO2** : Vidage du buffer série (pas de reset matériel possible)

---

## Détection des valeurs incohérentes

La validation des valeurs se fait **côté frontend** (pas sur l'ESP32) pour alléger la charge du microcontrôleur.

### Seuils de cohérence
| Capteur | Valeur min | Valeur max |
|---------|-----------|-----------|
| Pression | 800 hPa | 1200 hPa |
| Température | -20°C | 80°C |
| Humidité | 0% | 100% |
| CO2 | 300 ppm | 5000 ppm |

### Comportement en cas de valeur incohérente
- L'icône de statut devient un **point d'interrogation jaune** (pulsant)
- Le tooltip affiche "Valeur incohérente"
- Le graphique passe en jaune
- L'utilisateur peut cliquer sur le bouton reset pour tenter de corriger le problème
