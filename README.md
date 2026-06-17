# Calculateur GAYA — Louer ou acheter ?

Landing page interactive (parcours en 4 écrans) qui compare le coût d'une **location longue durée**
à l'**achat d'un vélo cargo électrique GAYA**, et met en évidence le **point de bascule** à partir
duquel l'achat devient plus rentable.

## Fonctionnalités
- Parcours type quiz : Durée → Votre location → Le GAYA → Résultat
- Calcul en temps réel, graphique de coût cumulé, tableau de détail, équivalents « plaisir »
- Aides au financement (désactivables) et valeur de revente estimée (option)
- Capture d'email (résultat flouté débloqué par l'email) + intégration **Klaviyo**
- Vérification antispam **Cloudflare Turnstile**

---

## Intégration iframe (hauteur dynamique)

Collez ce snippet sur n'importe quelle page de votre site :

```html
<!-- Calculateur GAYA — intégration iframe -->
<iframe
  id="gaya-calc"
  src="https://calculateur-gaya.vercel.app/"
  width="100%"
  frameborder="0"
  scrolling="no"
  style="border:none;width:100%;display:block;min-height:600px;">
</iframe>
<script>
(function () {
  var ORIGIN = 'https://calculateur-gaya.vercel.app';
  var iframe = document.getElementById('gaya-calc');

  // Messages depuis l'iframe
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return;
    if (e.data && e.data.type === 'gaya-calc-height') {
      iframe.style.height = e.data.height + 'px';
    }
    if (e.data && e.data.type === 'gaya-scroll-top') {
      window.scrollTo({ top: iframe.offsetTop - 20, behavior: 'smooth' });
    }
  });

  // Scroll du parent → position de la popup email dans l'iframe
  function sendScroll() {
    if (!iframe.contentWindow) return;
    var rect = iframe.getBoundingClientRect();
    iframe.contentWindow.postMessage({
      type: 'gaya-parent-scroll',
      scrollY: window.scrollY,
      iframeTop: rect.top + window.scrollY,
      viewportHeight: window.innerHeight
    }, ORIGIN);
  }
  window.addEventListener('scroll', sendScroll, { passive: true });
  window.addEventListener('resize', sendScroll, { passive: true });
  iframe.addEventListener('load', sendScroll);
})();
</script>
```

Le calculateur envoie sa hauteur via `postMessage` à chaque changement de taille (`ResizeObserver`).
Le parent envoie sa position de scroll à l'iframe pour que la popup email reste à 100 px du haut du viewport parent, même quand la page défile.

---

## Variables Klaviyo — template email

L'événement Klaviyo déclenché s'appelle **`Calcul Location vs Achat GAYA`**.

Dans votre template de flow, utilisez la syntaxe `{{ event.NOM_VARIABLE }}` :

| Variable | Description | Exemple |
|---|---|---|
| `{{ event.duree_mois }}` | Durée choisie | `36` |
| `{{ event.cout_location_mensuel }}` | Coût location/mois | `89` |
| `{{ event.frais_gaya_mensuel }}` | Frais GAYA/mois (hors achat) | `18` |
| `{{ event.prix_achat }}` | Prix d'achat brut | `2300` |
| `{{ event.aides }}` | Aides déduites | `600` |
| `{{ event.prix_net }}` | Prix net après aides | `1700` |
| `{{ event.mois_bascule }}` | Mois où l'achat devient rentable | `21` |
| `{{ event.economie_totale }}` | Économie totale sur la durée (€) | `524` |
| `{{ event.economie_mensuelle }}` | Économie moyenne par mois (€) | `14` |
| `{{ event.verdict }}` | `gagnant` / `avant_bascule` / `invalide` | `gagnant` |
| `{{ event.equiv_cafes }}` | Équivalent en cafés | `209` |
| `{{ event.equiv_diners }}` | Équivalent en dîners resto | `20` |
| `{{ event.equiv_cines }}` | Équivalent en sorties ciné | `13` |
| `{{ event.equiv_courses }}` | Équivalent en pleins de courses | `7` |
| `{{ event.page_url }}` | URL de la page source | `https://…` |
| `{{ person.email }}` | Email du contact | `prenom@…` |

**Exemple de ligne dans le template :**
```
En {{ event.duree_mois }} mois, vous économisez {{ event.economie_totale }} € — soit {{ event.economie_mensuelle }} €/mois.
Le point de bascule est atteint au mois {{ event.mois_bascule }}.
```

---

## Configuration serveur (`.env`)

```
PORT=3000
KLAVIYO_API_KEY=pk_...          # Clé privée Klaviyo (Settings → API Keys)
TURNSTILE_SITEKEY=...           # Clé publique Cloudflare Turnstile
TURNSTILE_SECRET_KEY=...        # Clé secrète Cloudflare Turnstile
```

## Publier
- **Vercel** : `vercel deploy` ou connexion GitHub → déploiement automatique
- **Netlify Drop** : glisser le dossier sur https://app.netlify.com/drop

---
*Estimation indicative à titre informatif, sans valeur contractuelle.*
