 Résumé IA — Chrome Extension
📌 Présentation

Résumé IA est une extension Chrome permettant de résumer automatiquement un texte ou le contenu d’une page web grâce à l’intelligence artificielle.

L’objectif est de faciliter la lecture de contenus longs en générant rapidement un résumé clair et synthétique directement depuis le navigateur.

L’utilisateur peut :

coller un texte

récupérer le texte de la page active

choisir la longueur du résumé

générer un résumé avec l’IA Gemini

Fonctionnalités
Résumé de texte

L’utilisateur peut coller un texte dans l’extension pour obtenir un résumé automatique.

 Résumé d’une page web

L’extension peut récupérer automatiquement le texte de la page web ouverte.

Choix de la longueur

Trois types de résumés sont disponibles :

très court

court

plus détaillé

🌙 Mode sombre

L’interface propose un mode sombre pour améliorer le confort d’utilisation.

Intelligence artificielle

Les résumés sont générés grâce à l’API Gemini de Google.

Architecture du projet

Le projet est organisé en deux parties :

Extension Chrome
manifest.json
popup.html
background.js
content.js
assets/
Application React
app/
 ├── src/
 │   ├── App.jsx
 │   ├── main.jsx
 │   └── styles.css
 │
 ├── index.html
 └── package.json

Technologies utilisées

Le projet repose sur plusieurs technologies modernes :

JavaScript

React

Vite

Chrome Extension Manifest V3

Gemini API (Google AI)

IA Chrome Canary (tentative initiale)

Au départ, le projet devait utiliser l’IA locale intégrée dans Chrome Canary, appelée Gemini Nano.
Cependant, lors des tests l’API n’était pas disponible dans l’environnement utilisé.
Cela signifie que l’API n’était pas accessible.

💡Solution utilisée

Pour garantir le fonctionnement de l’extension, la solution choisie a été d’utiliser l’API Gemini de Google.

Le fonctionnement est simple :

l’utilisateur fournit un texte

l’extension envoie une requête à l’API Gemini

l’intelligence artificielle génère un résumé

le résumé est affiché dans l’extension

Installation
1️⃣ Installer les dépendances

Dans le dossier app :

npm install
2️⃣ Build du projet
npm run build
3️⃣ Copier les fichiers

app/dist/index.html → popup.html
app/dist/assets → assets/
4️⃣ Charger l’extension

Ouvrir Chrome :

chrome://extensions

Activer Mode développeur

Puis cliquer sur :

Charger l’extension non empaquetée

et sélectionner le dossier du projet.

 Utilisation

1️⃣ ouvrir l’extension
2️⃣ coller un texte ou récupérer celui de la page
3️⃣ choisir la longueur du résumé
4️⃣ cliquer sur Résumer

Le résumé généré par l’IA apparaît dans l’extension.


👨‍💻 Auteurs
Safaa Zemmar
Nissa karadag