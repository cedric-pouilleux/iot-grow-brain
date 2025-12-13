# Zones

Les zones représentent des **lieux physiques** qui regroupent des devices.

## Concept

```
Zone "Chambre 1"
├── Device esp32-air-01 (air-quality)
└── Device esp32-light-01 (lighting)

Zone "Serre A"
└── Device esp32-grow-01 (irrigation)
```

## API

### Lister les zones
```http
GET /api/zones
```
```json
[
  { "id": "uuid", "name": "Chambre 1", "createdAt": "..." }
]
```

### Détail avec devices
```http
GET /api/zones/:id
```
```json
{
  "id": "uuid",
  "name": "Chambre 1",
  "devices": [
    { "moduleId": "esp32-01", "name": "Air Principal", "moduleType": "air-quality" }
  ]
}
```

### Créer une zone
```http
POST /api/zones
Content-Type: application/json

{ "name": "Nouvelle Zone" }
```

### Assigner un device
```http
POST /api/zones/:zoneId/devices/:deviceId
```

## Frontend

Page accessible via `/zones` :
- Liste des zones avec leurs devices
- Création/édition/suppression de zones
- Assignment de devices aux zones
- Devices non assignés affichés séparément

## Base de données

```sql
-- Table zones
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonne zone_id dans devices
ALTER TABLE device_system_status 
  ADD COLUMN zone_id UUID REFERENCES zones(id);
```
