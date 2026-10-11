# Journal de prompts PPI / PPC — application mobile (PWA)

Une appli installable sur l'écran d'accueil du téléphone, qui envoie chaque prompt daté vers le **même scénario Make** et le **même Google Sheet** que le favori navigateur et les raccourcis iPhone / Android. Rien à changer côté Make : elle envoie les mêmes champs (`epreuve`, `outil`, `partie`, `etape`, `objectif`, `prompt`).

## Ce qu'elle apporte par rapport au raccourci téléphone

| | Raccourci iPhone / HTTP Shortcuts | Appli PWA |
| --- | --- | --- |
| Installation | Une configuration par étudiant, action par action | Un lien à ouvrir, « Ajouter à l'écran d'accueil » |
| Listes PPI / PPC | Saisies à la main dans le raccourci | Intégrées, basculées d'un toucher |
| Sans réseau | Échec de l'envoi | Prompt mis en attente, renvoyé au retour du réseau |
| Historique | Aucun | 100 derniers prompts, copier ou réutiliser une version |
| Partager depuis une appli d'IA | Oui | Oui sur Android, Coller sur iPhone |

## 1. Mettre l'appli en ligne (formateur, une seule fois pour toute la classe)

Une PWA doit être servie en **https**. Deux solutions gratuites :

**Option A — Netlify Drop (5 minutes)**
1. Créez un compte gratuit sur netlify.com.
2. Ouvrez app.netlify.com/drop et glissez-y le **dossier** `journal-prompts-pwa`.
3. Netlify donne une adresse du type `https://xxxx.netlify.app`. Renommez le site dans *Site configuration* (ex. `prompts-msdi-ifc`).

**Option B — GitHub Pages (recommandé en cours : c'est aussi une notion à faire découvrir)**
1. Créez un dépôt public `journal-prompts`, déposez-y les fichiers du dossier.
2. *Settings › Pages › Branch : main / root › Save*.
3. L'appli est en ligne à `https://VOTRE-COMPTE.github.io/journal-prompts/`.

Une seule adresse sert toute la classe : chaque étudiant y colle **sa propre** adresse d'envoi Make, qui reste sur son téléphone.

## 2. Configurer et installer (étudiant)

1. Ouvrez l'adresse de l'appli sur le téléphone.
2. **Réglages** › collez votre adresse d'envoi (webhook Make) › choisissez PPI ou PPC › *Enregistrer*.
   Astuce : le lien `https://adresse-de-l-appli/?hook=VOTRE_WEBHOOK&epreuve=PPC` pré-remplit tout.
3. Installez :
   - **Android (Chrome)** : menu ⋮ › *Installer l'application*.
   - **iPhone (Safari)** : bouton Partager › *Sur l'écran d'accueil*.
4. Faites un essai, vérifiez la ligne dans l'onglet Journal du Sheet, puis supprimez-la.

## 3. Utiliser au quotidien

- **Android** : dans ChatGPT, Claude ou Gemini, sélectionnez votre prompt › *Partager* › **Prompts**. Le texte arrive dans le formulaire ; choisissez l'outil, la partie, l'étape, l'objectif, puis *Enregistrer*.
- **iPhone** : copiez le prompt, ouvrez l'appli, touchez **Coller**.
- **Sans réseau** : enregistrez quand même. Le prompt passe « En attente » et part tout seul au retour du réseau, avec la mention `[saisi le …]` ajoutée à l'objectif pour conserver la vraie date de saisie.
- **Nouvelle version d'un prompt** : *Historique* › *Réutiliser*, modifiez, enregistrez. Le jury voit l'itération dans l'annexe.

## 4. Si un message inhabituel apparaît

| Message | Cause | Solution |
| --- | --- | --- |
| « Reçu par Make. Scénario en pause… » | Le scénario Make est désactivé | Réactivez-le : Make écrit alors les prompts reçus entre-temps |
| « Envoi impossible, prompt mis en attente » | Adresse d'envoi erronée ou Make indisponible | Vérifiez l'adresse dans Réglages, puis *Renvoyer* |
| « Ajoutez d'abord votre adresse d'envoi » | Réglages vides | Collez votre webhook Make |

## 5. Les fichiers, et ce qu'on y apprend

| Fichier | Rôle | Notion de programmation |
| --- | --- | --- |
| `index.html` | Structure et apparence des 3 écrans | HTML sémantique, formulaires, CSS (variables, thème sombre, mise en page mobile) |
| `app.js` | Le comportement | DOM, événements, `localStorage`, requête `fetch` en POST, gestion d'erreurs `try/catch`, file d'attente |
| `manifest.webmanifest` | Carte d'identité de l'appli installable | JSON, icônes, `share_target` (recevoir un texte partagé) |
| `sw.js` | Fonctionnement hors ligne | Service worker, cache, interception des requêtes |
| `icons/` | Icônes d'écran d'accueil | Formats et tailles d'icônes, icône « maskable » |

Pour adapter les listes (outils, parties, étapes), modifiez l'objet `LISTES` en haut de `app.js`, puis changez le numéro de `CACHE` dans `sw.js` (`v1.0.0` → `v1.0.1`) pour que les téléphones récupèrent la nouvelle version.

## 6. Prompts de vibe coding pour la refaire ou la faire évoluer

À consigner dans votre propre journal : ce sont des prompts de votre PPI / PPC si vous les utilisez.

1. « Crée une application web mobile en HTML, CSS et JavaScript sans framework, avec un formulaire : épreuve (PPI ou PPC), outil IA, partie du dossier, étape, objectif, prompt. À l'envoi, fais une requête POST au format formulaire vers une adresse de webhook stockée dans les réglages. Explique chaque bloc de code. »
2. « Transforme cette page en PWA installable : ajoute un manifest et un service worker qui met l'appli en cache. Explique la différence entre un site et une PWA. »
3. « Ajoute une file d'attente hors ligne : si l'envoi échoue, garde le prompt dans localStorage et renvoie-le à l'événement online. Montre-moi comment tester avec le mode hors ligne du navigateur. »
4. « Ajoute un share_target au manifest pour recevoir un texte partagé depuis une autre appli Android. Explique pourquoi cela ne fonctionne pas sur iPhone. »
