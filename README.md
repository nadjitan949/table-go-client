# 🍽️ Table Go — Client

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**Table Go** est un menu de restaurant digital accessible par QR code. Chaque table du restaurant possède un QR code unique qui, une fois scanné par le client, l'amène sur une page de confirmation de sa table puis sur le menu en ligne du restaurant.

Ce dépôt contient le **frontend (client)** de la solution. Il est pensé **mobile-first** pour une expérience optimale sur smartphone.

---

## ✨ Fonctionnalités

- 📱 **Interface 100 % mobile-first** — design optimisé pour les smartphones des clients.
- 🔗 **Accès par QR code** — chaque table est identifiée par un jeton (`token`) dans l'URL.
- 🍴 **Menu du restaurant en ligne** — entrées, plats, desserts et boissons récupérés depuis l'API.
- 🔍 **Recherche** — recherche instantanée par nom ou description du plat.
- 💰 **Filtre par prix** — curseur de prix maximum pour affiner les résultats.
- ⏱️ **Temps de préparation** — affiché pour chaque plat.
- 🎬 **Animations fluides** — transitions et micro-interactions avec Framer Motion.
- 📄 **Affichage dynamique** — l'en-tête se masque au scroll pour laisser place au contenu.

## 🧰 Stack technique

| Technologie | Rôle |
|---|---|
| [React 19](https://react.dev/) | Bibliothèque UI |
| [TypeScript](https://www.typescriptlang.org/) | Typage statique |
| [Vite](https://vite.dev/) | Bundler & serveur de dev |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styles utilitaires |
| [React Router v7](https://reactrouter.com/) | Routage (URL par token) |
| [Axios](https://axios-http.com/) | Client HTTP pour l'API |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [React Icons](https://react-icons.github.io/react-icons/) | Icônes |

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** ≥ 20
- Un terminal (PowerShell, Git Bash, etc.)
- *(Optionnel)* Le backend **Table Go** démarré et joignable (voir l'IP dans `.env`).

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/nadjitan949/table-go-client.git
cd table-go-client

# 2. Installer les dépendances
npm install

# 3. Configurer l'URL de l'API
#    Créer un fichier .env à la racine (voir section Configuration)
```

### Configuration — variable d'environnement

```env
# .env
VITE_API_URL=http://localhost:3000
```

> ⚠️ Le fichier `.env` est ignoré par Git. L'URL de l'API **doit** pointer vers le serveur backend **Table Go**.

### Lancer en développement

```bash
npm run dev
```

Puis ouvrir l'URL affichée dans le terminal. La configuration `host: true` du serveur Vite permet d'accéder à l'appli depuis un téléphone sur le même réseau local (parfait pour les tests en conditions réelles).

## 📦 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement Vite (avec HMR) |
| `npm run build` | Compile le TypeScript puis génère le build de production (`dist/`) |
| `npm run lint` | Analyse le code avec ESLint |
| `npm run preview` | Prévisualise localement le build de production |

## 🗺️ Routage

| Route | Description |
|---|---|
| `/:token` | **Landing page** — confirme la table du client via son jeton QR |
| `/menu/:token` | **Menu** — affiche les plats du restaurant, filtrables et recherche en direct |

Le `token` correspond au `qrCodeToken` de la table, généré côté backend et encodé dans le QR code.

## 🗂️ Structure du projet

```
table-go-client/
├── public/                  # Ressources statiques (favicon, icônes SVG)
├── src/
│   ├── api/
│   │   └── axios.ts         # Instance Axios + interceptor d'erreurs
│   ├── interfaces/
│   │   ├── api.types.ts     # Type générique ApiResponse<T>
│   │   ├── menu.types.ts    # Type MenuItem (plat, catégorie, prix...)
│   │   └── table.types.ts   # Type Table (n°, jeton QR, statut...)
│   ├── pages/
│   │   ├── LandingPage.tsx  # Confirmation de table + CTA vers le menu
│   │   └── MenuPage.tsx     # Liste des plats, recherche, filtres
│   ├── App.tsx              # Routage (BrowserRouter)
│   ├── main.tsx             # Point d'entrée React
│   └── index.css            # Tailwind + animations personnalisées
├── ui/
│   └── Button.tsx           # Bouton réutilisable
├── index.html               # Entrée HTML
├── vite.config.ts           # Configuration Vite (React + Tailwind)
└── package.json
```

## 🔌 API consommée

Les appels sont centralisés dans `src/api/axios.ts`. L'enveloppe de réponse attendue est :

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

| Méthode | Endpoint | Description | Retour |
|---|---|---|---|
| `GET` | `/table/get-table/:token` | Récupère la table associée au jeton QR | `Table` |
| `GET` | `/menu/all` | Récupère tous les plats du menu | `MenuItem[]` |

Les erreurs sont normalisées par un interceptor (message lisible + statut HTTP), avec des messages en français prêts à afficher à l'utilisateur.

## 🖼️ Aperçu des écrans

- **Landing (`/:token`)** : logo du restaurant, numéro de table confirmé, illustration "QR code" animée et bouton **« Accéder à nos menus »**.
- **Menu (`/menu/:token`)** : bannière du resto, recherche, filtre par prix, sections par catégorie (Entrées / Plats / Desserts / Boissons) et carte de plat avec temps de préparation + bouton d'ajout.

## 🤝 Contribution

1. Fork le projet (`git fork`)
2. Crée ta branche de fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Commite tes changements (`git commit -m "feat: ma fonctionnalité"`)
4. Pousse la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvre une **Pull Request**

Assure-toi que le code passe `npm run lint` et `npm run build` avant de soumettre ta PR.

---

## 📝 Licence

Projet privé — tous droits réservés. © Table Go
