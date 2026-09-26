# Gridburg

Un petit jeu de construction de ville en 3D, dans un onglet de navigateur. La seule chose qui compte vraiment : la circulation.

Une autoroute longe le bord de chaque carte, une chaussée par sens, avec deux échangeurs déjà construits. Tirez des routes depuis un échangeur, zonez le long, et la ville grandit toute seule. Les voitures font leurs trajets domicile-travail sur vos routes et font vraiment la queue : les carrefours chargés coincent jusqu'à ce que vous les soigniez. Gardez la lumière allumée, l'eau propre, et les usines loin des maisons.

**Jouer :** https://coyotte-hue.github.io/gridburg/

> Version originale (anglais) : https://gorgekara.github.io/gridburg/ — ce fork ajoute le **français** (ce fichier : [README en anglais](README.md)).

## Langue

Le jeu est disponible en **français** et en **anglais** :

- La langue est détectée automatiquement (navigateur en français → jeu en français).
- Pour la changer : **Menu → Réglages → Langue** (appliquée aussitôt).
- Traduits : menu principal, tutoriel de bienvenue, aide, catégories et outils de construction, budget, politiques municipales, paliers de ville, services et besoins.
- Les messages de simulation détaillés (inspecteur, alertes) restent en anglais pour l'instant.

## Rues et parcs personnalisés

- Les carrefours ordinaires ont des passages piétons. Les îlots de ronds-points ont massifs, arbres et fontaines ; la rivière a des hauts-fonds translucides sur lit de gravier.
- **Routes → Pistes cyclables** améliore une rue ou une avenue pour 12 $ par case. Recliquez pour retirer. Indisponible sur autoroutes, ruelles, ponts et ronds-points. Les cyclistes décorent les pistes dans les deux sens.
- **Parcs** : composez vos parcs (allées, pelouses, esplanades, étangs, kiosques). Glissez pour peindre ; les allées se connectent seules. **Décorations** : arbres, fleurs, bancs, fontaines. Le tout pivote, se remplace, se rase, et suit votre sauvegarde. Reliez les pièces à une route pour activer la couverture loisirs des équipements voisins.
- **Transports → Arrêt de trolleybus** : transport routier électrique entre arrêts en service sur rues et avenues connectées. Caténaires le long des lignes, trolleybus dans la circulation, fréquentation dans la vue d'ensemble.
- Les aéroports réservent un périmètre d'une case et des corridors de trois cases sur douze au-delà de chaque bout de piste. Pivotez pour orienter l'approche.

## Économie, quartiers et monde extérieur

- **Valeur du sol.** Chaque case vaut de 0 à 100 : parcs, vue rivière, arrêts, monuments et bons services montent ; pollution, bruit, délinquance et déchets baissent. Les belles adresses paient plus d'impôts, grandissent plus vite ; les tours exigent 30 de valeur.
- **Marchandises.** Usines et fermes produisent, boutiques et bureaux consomment. Le surplus s'exporte (entrées, rail, docks, aéroport) et rapporte ; le manque s'importe et creuse la demande industrielle.
- **Tourisme.** Loisirs, parcs, monuments et rives attirent des visiteurs. Visible au budget, pousse la demande commerciale. La **tour d'observation** attire soixante visiteurs par minute.
- **Taxe par zone.** Un taux pour logements, commerces, industrie et bureaux (fermes = taux industriel, loisirs = taux commercial), plus un curseur général.
- **Déchets, funéraire et courrier.** Centres de recyclage avec camions ; cimetières, crématoriums et bureaux de poste (dès Ville prospère pour les tours).
- **L'électricité et l'eau suivent les routes.** Chaque réseau routier connecté ne partage que ses propres centrales, pompes et émissaires : un quartier coupé du réseau reste dans le noir.
- **Quartiers.** Peignez jusqu'à huit quartiers nommés, chacun avec ses politiques locales (interdiction des tours, rues calmes, quartier vert, quartier touristique, exonération, voisins vigilants).
- **Terrain et eau vive.** Abaissez, rehaussez, aplanissez au pinceau ; creusez des lacs, détournez la rivière, barrez-la (elle s'accumule et déborde) ; digues anti-crue, inondations et tornades dès Petite ville (désactivables).

## Progression et services

Grandissez de **Campement** à **Ville mondiale** (0, 120, 400, 900, 1 800, 3 500, 6 500, 10 000 et 15 000 habitants). Chaque palier rapporte une subvention unique et débloque des services : dispensaires, écoles, pompiers, police, recyclage, universités, fermes solaires, hôpitaux, bus, trains, métro, aéroport régional… La pastille en haut à gauche affiche niveau et bonheur ; cliquez-la pour la feuille de route et la couverture.

## Gérer une ville qui grandit

Cliquez **Inspecter (I)** puis un bâtiment : habitants ou emplois, couverture locale, coûts et blocages exacts. Politiques permanentes (recyclage, détecteurs, voisins vigilants, bourses, transports gratuits, péage urbain), budget détaillé avec financement par service (50 %–150 %), prêt de relance de 6 000 $. Les logements exigent une couverture continue : un repère orange prévient 180 secondes avant un déclassement.

## Contrôles

| Entrée | Action |
|---|---|
| Clic gauche | Poser routes, feux, ronds-points, bâtiments ; peindre les zones (Maj + glisser dézone) |
| Clic droit / Échap | Arrêter le tracé ; Échap referme panneaux et inspection |
| Molette / ZQSD / glisser milieu | Zoom / déplacer / pivoter vue |
| I | Inspecter un bâtiment |
| L, R, V, X | Ruelle, Rue, Avenue, Voie rapide |
| + / − | Niveau du prochain point : tunnel, sol, 1–3 étages |
| U / N / Z | Élargir / Modifier routes / Couper |
| O, T, Y / K, J | Rond-point, Feux, Sens unique / Stops, Rue apaisée |
| G ou clic droit | Pivoter le bâtiment en main |
| F / M | Marcher dans les rues / Conduire (V : place conducteur) |
| B / P / C | Démolir / vue pollution / changer le mode de tracé |
| Ctrl+Z / Espace / H | Annuler / Pause / Aide |

La ville se sauvegarde dans le navigateur, et **Partager** copie un lien qui contient toute la ville.

## Fonctionnement

- Vite + TypeScript + [three.js](https://threejs.org/), sans framework UI.
- Trafic réel par voies, simulation en Web Worker, rivière simulée, sauvegardes locales et par lien.

## Développer

```bash
npm install
npm run dev     # serveur de développement
npm test        # suite de tests (node tests/all.mjs)
npm run build   # tsc + tests + vite build → dist/
```

## Déployer (GitHub Pages)

Ce fork inclut `.github/workflows/deploy.yml` : chaque push sur `main` construit et publie `dist/` sur GitHub Pages.

1. Poussez ce code sur `main` de votre fork.
2. Sur GitHub : **Settings → Pages → Source → GitHub Actions**.
3. Le jeu est en ligne à `https://<votre-pseudo>.github.io/gridburg/`.

## Licence

Voir [LICENSE](LICENSE).
